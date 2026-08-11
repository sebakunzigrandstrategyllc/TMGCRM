import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "summs.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Lightweight migration for columns added after initial table creation — CREATE TABLE IF NOT
// EXISTS won't add them to a DB file that already exists from an earlier schema version.
function ensureColumn(table, column, definition) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!existing.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("milestones", "source", `TEXT NOT NULL DEFAULT 'human'`);
ensureColumn("milestones", "source_key", `TEXT`);
ensureColumn("projects", "email", `TEXT`);
ensureColumn("projects", "phone", `TEXT`);
ensureColumn("projects", "company", `TEXT`);

export function logActivity(projectId, action, columnKey = null, details = null) {
  db.prepare(
    `INSERT INTO activity_log (project_id, action, column_key, details, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(projectId, action, columnKey, details ? JSON.stringify(details) : null, new Date().toISOString());
}

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

export function logActivity(projectId, action, columnKey = null, details = null) {
  db.prepare(
    `INSERT INTO activity_log (project_id, action, column_key, details, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(projectId, action, columnKey, details ? JSON.stringify(details) : null, new Date().toISOString());
}

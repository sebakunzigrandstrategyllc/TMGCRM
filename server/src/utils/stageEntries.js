import { db } from "../db/db.js";
import { COLUMN_KEYS, COLUMNS } from "../constants.js";

const COLUMN_BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

// Ensures every column has a stage_entries row and an approvals row so the dashboard
// can always render all 8 columns, even before any content exists.
export function ensureProjectScaffold(projectId) {
  const now = new Date().toISOString();
  const insertStage = db.prepare(
    `INSERT OR IGNORE INTO stage_entries (project_id, column_key, ai_draft, human_edit, updated_at)
     VALUES (?, ?, '', '', ?)`
  );
  const insertApproval = db.prepare(
    `INSERT OR IGNORE INTO approvals (project_id, column_key, approved, updated_at)
     VALUES (?, ?, 0, ?)`
  );
  const tx = db.transaction(() => {
    for (const key of COLUMN_KEYS) {
      insertStage.run(projectId, key, now);
      insertApproval.run(projectId, key, now);
    }
  });
  tx();
}

export function isColumnUnlocked(projectId, columnKey) {
  const idx = COLUMN_KEYS.indexOf(columnKey);
  if (idx <= 0) return true; // contact_details is always open
  const prevKey = COLUMN_KEYS[idx - 1];
  if (!COLUMN_BY_KEY[prevKey]?.requiresApproval) return true; // no gate to clear
  const prevApproval = db
    .prepare(`SELECT approved FROM approvals WHERE project_id = ? AND column_key = ?`)
    .get(projectId, prevKey);
  return !!prevApproval?.approved;
}

export function isProposalApproved(projectId) {
  const row = db
    .prepare(`SELECT approved FROM approvals WHERE project_id = ? AND column_key = 'proposal'`)
    .get(projectId);
  return !!row?.approved;
}

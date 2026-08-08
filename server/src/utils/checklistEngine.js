import { db, logActivity } from "../db/db.js";
import { generateChecklist } from "./checklists.js";

export function getChecklist(projectId, columnKey) {
  return db
    .prepare(
      `SELECT * FROM checklist_items WHERE project_id = ? AND column_key = ? ORDER BY sort_order ASC, id ASC`
    )
    .all(projectId, columnKey);
}

export function getChecklistProgress(projectId, columnKey) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(checked), 0) AS checked
       FROM checklist_items WHERE project_id = ? AND column_key = ?`
    )
    .get(projectId, columnKey);
  return { total: row.total, checked: row.checked };
}

// A column with no checklist yet (generation hasn't caught up) doesn't block approval —
// only an actually-incomplete checklist does.
export function isChecklistComplete(projectId, columnKey) {
  const { total, checked } = getChecklistProgress(projectId, columnKey);
  return total === 0 || checked === total;
}

function insertItems(projectId, columnKey, items) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO checklist_items (project_id, column_key, title, detail, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  items.forEach((item, i) => {
    insert.run(projectId, columnKey, item.title, item.detail || null, i, now);
  });
}

// Lazily generates a column's checklist if it doesn't have one yet. Deliberately does NOT
// regenerate on every plan cascade — that would wipe a human's checked-off progress every
// time an upstream edit ripples through. Use regenerateChecklist for an explicit reset.
export function ensureChecklist(project, columnKey) {
  const { total } = getChecklistProgress(project.id, columnKey);
  if (total > 0) return;
  const items = generateChecklist(columnKey, { clientName: project.client_name });
  if (items.length === 0) return;
  insertItems(project.id, columnKey, items);
  logActivity(project.id, "checklist_generated", columnKey, { count: items.length });
}

export function regenerateChecklist(project, columnKey) {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM checklist_items WHERE project_id = ? AND column_key = ?`).run(project.id, columnKey);
    const items = generateChecklist(columnKey, { clientName: project.client_name });
    insertItems(project.id, columnKey, items);
  });
  tx();
  logActivity(project.id, "checklist_regenerated", columnKey, {});
  return getChecklist(project.id, columnKey);
}

export function setItemChecked(projectId, itemId, checked) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE checklist_items SET checked = ?, checked_at = ? WHERE id = ? AND project_id = ?`
  ).run(checked ? 1 : 0, checked ? now : null, itemId, projectId);
  logActivity(projectId, checked ? "checklist_item_checked" : "checklist_item_unchecked", null, { itemId });
  return db.prepare(`SELECT * FROM checklist_items WHERE id = ?`).get(itemId);
}

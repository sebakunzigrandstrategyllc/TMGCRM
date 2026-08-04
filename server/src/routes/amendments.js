import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";
import { generateChangeReport } from "../utils/ai.js";

const router = Router({ mergeParams: true });

function requireProject(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

function serializeAmendment(a) {
  return { ...a, approved: !!a.approved };
}

// Amendments are append-only: every scope change is its own row, nothing is ever overwritten.
router.get("/", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  const amendments = db
    .prepare(`SELECT * FROM amendments WHERE project_id = ? ORDER BY created_at DESC`)
    .all(project.id);
  res.json(amendments.map(serializeAmendment));
});

router.post("/", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;

  const { columnKey, title, description, oldValue, newValue } = req.body;
  if (!columnKey || !COLUMN_KEYS.includes(columnKey)) {
    return res.status(400).json({ error: "A valid columnKey is required" });
  }
  if (!title) return res.status(400).json({ error: "title is required" });

  const aiChangeReport = generateChangeReport({ title, description, oldValue, newValue });
  const now = new Date().toISOString();

  const info = db
    .prepare(
      `INSERT INTO amendments (project_id, column_key, title, description, old_value, new_value, ai_change_report, approved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(project.id, columnKey, title, description || null, oldValue || null, newValue || null, aiChangeReport, now);

  logActivity(project.id, "amendment_created", columnKey, { title });

  res.status(201).json(serializeAmendment(db.prepare(`SELECT * FROM amendments WHERE id = ?`).get(info.lastInsertRowid)));
});

// Sign-off: its own checkbox/notes, independent of the column's own approval gate.
router.put("/:amendmentId/approve", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;

  const existing = db
    .prepare(`SELECT * FROM amendments WHERE id = ? AND project_id = ?`)
    .get(req.params.amendmentId, project.id);
  if (!existing) return res.status(404).json({ error: "Amendment not found" });

  const { approved, approvalNotes } = req.body;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE amendments SET approved = ?, approved_at = ?, approval_notes = ? WHERE id = ?`
  ).run(approved ? 1 : 0, approved ? now : null, approvalNotes ?? existing.approval_notes, existing.id);

  logActivity(project.id, approved ? "amendment_approved" : "amendment_approval_revoked", existing.column_key, {
    amendmentId: existing.id,
  });

  res.json(serializeAmendment(db.prepare(`SELECT * FROM amendments WHERE id = ?`).get(existing.id)));
});

export default router;

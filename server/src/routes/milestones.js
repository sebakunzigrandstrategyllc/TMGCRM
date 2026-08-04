import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { isProposalApproved } from "../utils/stageEntries.js";

const router = Router({ mergeParams: true });

function requireProposalApproved(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  if (!isProposalApproved(project.id)) {
    res.status(423).json({ error: "Milestones unlock once the Proposal column is approved." });
    return null;
  }
  return project;
}

router.get("/", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const unlocked = isProposalApproved(project.id);
  if (!unlocked) return res.json({ unlocked: false, milestones: [] });
  const milestones = db
    .prepare(`SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC, id ASC`)
    .all(project.id);
  res.json({ unlocked: true, milestones });
});

router.post("/", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  const { title, dueDate, notes } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO milestones (project_id, title, due_date, status, notes, created_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`
    )
    .run(project.id, title, dueDate || null, notes || null, now);
  logActivity(project.id, "milestone_created", "make", { title });
  res.status(201).json(db.prepare(`SELECT * FROM milestones WHERE id = ?`).get(info.lastInsertRowid));
});

router.put("/:milestoneId", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  const { title, dueDate, status, notes } = req.body;
  const existing = db
    .prepare(`SELECT * FROM milestones WHERE id = ? AND project_id = ?`)
    .get(req.params.milestoneId, project.id);
  if (!existing) return res.status(404).json({ error: "Milestone not found" });

  db.prepare(
    `UPDATE milestones SET title = ?, due_date = ?, status = ?, notes = ? WHERE id = ?`
  ).run(
    title ?? existing.title,
    dueDate ?? existing.due_date,
    status ?? existing.status,
    notes ?? existing.notes,
    existing.id
  );
  logActivity(project.id, "milestone_updated", "make", { id: existing.id });
  res.json(db.prepare(`SELECT * FROM milestones WHERE id = ?`).get(existing.id));
});

router.delete("/:milestoneId", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  db.prepare(`DELETE FROM milestones WHERE id = ? AND project_id = ?`).run(req.params.milestoneId, project.id);
  res.status(204).end();
});

export default router;

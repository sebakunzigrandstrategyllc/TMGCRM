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
    res.status(423).json({ error: "Payment schedule unlocks once the Proposal column is approved." });
    return null;
  }
  return project;
}

router.get("/", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const unlocked = isProposalApproved(project.id);
  if (!unlocked) return res.json({ unlocked: false, payments: [] });
  const payments = db
    .prepare(`SELECT * FROM payment_schedule WHERE project_id = ? ORDER BY due_date ASC, id ASC`)
    .all(project.id);
  res.json({ unlocked: true, payments });
});

router.post("/", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  const { description, amount, dueDate } = req.body;
  if (!description || amount == null) {
    return res.status(400).json({ error: "description and amount are required" });
  }
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO payment_schedule (project_id, description, amount, due_date, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    )
    .run(project.id, description, amount, dueDate || null, now);
  logActivity(project.id, "payment_scheduled", "proposal", { description, amount });
  res.status(201).json(db.prepare(`SELECT * FROM payment_schedule WHERE id = ?`).get(info.lastInsertRowid));
});

router.put("/:paymentId", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  const existing = db
    .prepare(`SELECT * FROM payment_schedule WHERE id = ? AND project_id = ?`)
    .get(req.params.paymentId, project.id);
  if (!existing) return res.status(404).json({ error: "Payment not found" });

  const { description, amount, dueDate, status } = req.body;
  db.prepare(
    `UPDATE payment_schedule SET description = ?, amount = ?, due_date = ?, status = ? WHERE id = ?`
  ).run(
    description ?? existing.description,
    amount ?? existing.amount,
    dueDate ?? existing.due_date,
    status ?? existing.status,
    existing.id
  );
  logActivity(project.id, "payment_updated", "proposal", { id: existing.id, status });
  res.json(db.prepare(`SELECT * FROM payment_schedule WHERE id = ?`).get(existing.id));
});

router.delete("/:paymentId", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  db.prepare(`DELETE FROM payment_schedule WHERE id = ? AND project_id = ?`).run(req.params.paymentId, project.id);
  res.status(204).end();
});

export default router;

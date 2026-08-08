import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";
import { ensureProjectScaffold, isColumnUnlocked } from "../utils/stageEntries.js";
import { regenerateProjectPlan } from "../utils/planEngine.js";
import { isChecklistComplete, getChecklistProgress } from "../utils/checklistEngine.js";

const router = Router({ mergeParams: true });

router.put("/:columnKey", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { columnKey } = req.params;
  if (!COLUMN_KEYS.includes(columnKey)) {
    return res.status(400).json({ error: "Unknown column" });
  }

  ensureProjectScaffold(project.id);

  if (!isColumnUnlocked(project.id, columnKey)) {
    return res.status(423).json({ error: "This column is locked until the prior column is approved." });
  }

  const { approved, notes } = req.body;

  if (approved && !isChecklistComplete(project.id, columnKey)) {
    const { total, checked } = getChecklistProgress(project.id, columnKey);
    return res.status(400).json({
      error: `Complete the checklist before approving (${checked}/${total} done).`,
    });
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE approvals SET approved = ?, approved_at = ?, notes = ?, updated_at = ?
     WHERE project_id = ? AND column_key = ?`
  ).run(approved ? 1 : 0, approved ? now : null, notes ?? null, now, project.id, columnKey);

  logActivity(project.id, approved ? "approval_granted" : "approval_revoked", columnKey, { notes });

  // Re-run the cascade: unlocking the next column, and (for See/Proposal specifically) the
  // approval state feeds into wording — e.g. the Make timeline switches from "tentative" to
  // "finalized" once Proposal is actually approved.
  regenerateProjectPlan(project);

  const updated = db
    .prepare(`SELECT * FROM approvals WHERE project_id = ? AND column_key = ?`)
    .get(project.id, columnKey);
  res.json(updated);
});

export default router;

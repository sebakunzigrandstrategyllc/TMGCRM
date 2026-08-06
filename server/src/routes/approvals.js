import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";
import { ensureProjectScaffold, isColumnUnlocked } from "../utils/stageEntries.js";
import { generateAndStoreSeeTimeline, generateAndStoreMakeTimeline } from "../utils/timelineEngine.js";
import { generateUnderstandBreakdown } from "../utils/ai.js";

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
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE approvals SET approved = ?, approved_at = ?, notes = ?, updated_at = ?
     WHERE project_id = ? AND column_key = ?`
  ).run(approved ? 1 : 0, approved ? now : null, notes ?? null, now, project.id, columnKey);

  logActivity(project.id, approved ? "approval_granted" : "approval_revoked", columnKey, { notes });

  // Approving See maps out this project's individual journey timeline and refreshes the
  // Understand breakdown from the now-finalized See content; approving Proposal generates a
  // fresh, grounded execution timeline for Make onward.
  if (approved && columnKey === "see") {
    generateAndStoreSeeTimeline(project);

    const see = db
      .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = 'see'`)
      .get(project.id);
    const understandDraft = generateUnderstandBreakdown({
      clientName: project.client_name,
      seeContent: see?.human_edit || see?.ai_draft || "",
      notes: project.notes,
    });
    const refreshedAt = new Date().toISOString();
    db.prepare(
      `UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = 'understand'`
    ).run(understandDraft, refreshedAt, project.id);
    db.prepare(
      `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
       VALUES (?, 'understand', 'ai_draft', ?, ?)`
    ).run(project.id, understandDraft, refreshedAt);
    logActivity(project.id, "ai_draft_generated", "understand", { source: "see_approval" });
  }
  if (approved && columnKey === "proposal") {
    generateAndStoreMakeTimeline(project);
  }

  const updated = db
    .prepare(`SELECT * FROM approvals WHERE project_id = ? AND column_key = ?`)
    .get(project.id, columnKey);
  res.json(updated);
});

export default router;

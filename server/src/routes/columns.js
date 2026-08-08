import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";
import { isColumnUnlocked, ensureProjectScaffold } from "../utils/stageEntries.js";
import { generateIntakeSummary } from "../utils/ai.js";
import { regenerateProjectPlan } from "../utils/planEngine.js";
import { wordDiff } from "../utils/diff.js";

const router = Router({ mergeParams: true });

function requireProject(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

function requireColumn(req, res) {
  if (!COLUMN_KEYS.includes(req.params.columnKey)) {
    res.status(400).json({ error: "Unknown column" });
    return false;
  }
  return true;
}

// Save a human edit to a column. Blocked until the previous column is approved. Saving
// re-runs the plan cascade, so every stage from here through Sustain re-derives its tentative
// AI draft from this edit — "what changed here updates the plan following."
router.put("/:columnKey", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireColumn(req, res)) return;

  const { columnKey } = req.params;
  const { humanEdit } = req.body;

  if (columnKey === "understand") {
    return res.status(400).json({
      error: "Understand is AI-generated from the reviewed See content — regenerate it instead of editing directly.",
    });
  }

  ensureProjectScaffold(project.id);

  if (!isColumnUnlocked(project.id, columnKey)) {
    return res.status(423).json({ error: "This column is locked until the prior column is approved." });
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE stage_entries SET human_edit = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`
  ).run(humanEdit ?? "", now, project.id, columnKey);

  db.prepare(
    `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
     VALUES (?, ?, 'human_edit', ?, ?)`
  ).run(project.id, columnKey, humanEdit ?? "", now);

  logActivity(project.id, "human_edit_saved", columnKey, { length: (humanEdit || "").length });

  regenerateProjectPlan(project);

  const updated = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = ?`)
    .get(project.id, columnKey);
  res.json(updated);
});

// Manually regenerate a column's AI draft. See is the only column with no upstream AI
// dependency (it's rebuilt from the original intake fields); every other column's tentative
// draft is derived from what's upstream of it, so regenerating is just re-running the cascade.
router.post("/:columnKey/generate", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireColumn(req, res)) return;

  const { columnKey } = req.params;
  ensureProjectScaffold(project.id);

  if (!isColumnUnlocked(project.id, columnKey)) {
    return res.status(423).json({ error: "This column is locked until the prior column is approved." });
  }

  if (columnKey === "see") {
    const draft = generateIntakeSummary({
      clientName: project.client_name,
      contactInfo: project.contact_info,
      notes: project.notes,
    }).seeDraft;

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = 'see'`
    ).run(draft, now, project.id);
    db.prepare(
      `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
       VALUES (?, 'see', 'ai_draft', ?, ?)`
    ).run(project.id, draft, now);
    logActivity(project.id, "ai_draft_generated", "see", { manual: true });
  }

  regenerateProjectPlan(project);

  const updated = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = ?`)
    .get(project.id, columnKey);
  res.json(updated);
});

// Version history + diff between latest ai_draft and latest human_edit.
router.get("/:columnKey/history", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireColumn(req, res)) return;

  const { columnKey } = req.params;
  const versions = db
    .prepare(
      `SELECT * FROM stage_entry_versions WHERE project_id = ? AND column_key = ? ORDER BY created_at ASC`
    )
    .all(project.id, columnKey);

  const current = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = ?`)
    .get(project.id, columnKey);

  const diff = current ? wordDiff(current.ai_draft || "", current.human_edit || "") : [];

  res.json({ versions, diff });
});

export default router;

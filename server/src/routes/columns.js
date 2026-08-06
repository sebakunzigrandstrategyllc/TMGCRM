import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";
import { isColumnUnlocked, ensureProjectScaffold } from "../utils/stageEntries.js";
import { generateIntakeSummary, generateUnderstandBreakdown } from "../utils/ai.js";
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

// Save a human edit to a column. Blocked until the previous column is approved.
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

  const updated = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = ?`)
    .get(project.id, columnKey);
  res.json(updated);
});

// Regenerate the stub AI draft for a column (used for later-stage columns beyond intake).
router.post("/:columnKey/generate", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireColumn(req, res)) return;

  const { columnKey } = req.params;
  ensureProjectScaffold(project.id);

  if (!isColumnUnlocked(project.id, columnKey)) {
    return res.status(423).json({ error: "This column is locked until the prior column is approved." });
  }

  let draft;
  if (columnKey === "see") {
    draft = generateIntakeSummary({
      clientName: project.client_name,
      contactInfo: project.contact_info,
      notes: project.notes,
    }).seeDraft;
  } else if (columnKey === "understand") {
    // Understand is generated from See's reviewed content (human edit if present, else the
    // AI draft) — never from a human-edit field of its own.
    const see = db
      .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = 'see'`)
      .get(project.id);
    draft = generateUnderstandBreakdown({
      clientName: project.client_name,
      seeContent: see?.human_edit || see?.ai_draft || "",
      notes: project.notes,
    });
  } else {
    draft = `[AI DRAFT — ${columnKey}]\nAuto-generated first-pass content for "${columnKey}". Replace with reviewed content.`;
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`
  ).run(draft, now, project.id, columnKey);

  db.prepare(
    `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
     VALUES (?, ?, 'ai_draft', ?, ?)`
  ).run(project.id, columnKey, draft, now);

  logActivity(project.id, "ai_draft_generated", columnKey, { manual: true });

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

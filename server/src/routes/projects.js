import { Router } from "express";
import { db } from "../db/db.js";
import { COLUMNS } from "../constants.js";
import { ensureProjectScaffold, isColumnUnlocked, isProposalApproved } from "../utils/stageEntries.js";
import { getLatestTimeline } from "../utils/timelineEngine.js";

const router = Router();

router.get("/", (req, res) => {
  const projects = db
    .prepare(`SELECT * FROM projects ORDER BY seq_number ASC`)
    .all();
  res.json(projects);
});

router.get("/:id", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.get("/:id/dashboard", (req, res) => {
  const { id } = req.params;
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  ensureProjectScaffold(id);

  const stageRows = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ?`)
    .all(id);
  const approvalRows = db
    .prepare(`SELECT * FROM approvals WHERE project_id = ?`)
    .all(id);
  const fileRows = db
    .prepare(`SELECT * FROM files WHERE project_id = ? ORDER BY uploaded_at DESC`)
    .all(id);

  const stageByKey = Object.fromEntries(stageRows.map((r) => [r.column_key, r]));
  const approvalByKey = Object.fromEntries(approvalRows.map((r) => [r.column_key, r]));

  const columns = COLUMNS.map((col) => {
    const stage = stageByKey[col.key] || { ai_draft: "", human_edit: "" };
    const approval = approvalByKey[col.key] || { approved: 0, approved_at: null, notes: null };
    return {
      key: col.key,
      label: col.label,
      tagline: col.tagline || null,
      requiresApproval: col.requiresApproval,
      aiGenerated: !!col.aiGenerated,
      unlocked: isColumnUnlocked(id, col.key),
      aiDraft: stage.ai_draft || "",
      humanEdit: stage.human_edit || "",
      updatedAt: stage.updated_at || null,
      approval: {
        approved: !!approval.approved,
        approvedAt: approval.approved_at,
        notes: approval.notes,
      },
      files: fileRows
        .filter((f) => f.column_key === col.key)
        .map(serializeFile),
    };
  });

  res.json({
    project,
    columns,
    proposalApproved: isProposalApproved(id),
    unattachedFiles: fileRows.filter((f) => !f.column_key).map(serializeFile),
    timelines: {
      see: getLatestTimeline(id, "see"),
      make: getLatestTimeline(id, "make"),
    },
  });
});

function serializeFile(f) {
  return {
    id: f.id,
    originalName: f.original_name,
    fileType: f.file_type,
    columnKey: f.column_key,
    mimeType: f.mime_type,
    size: f.size,
    uploadedAt: f.uploaded_at,
    downloadUrl: `/api/files/${f.id}/download`,
  };
}

export default router;

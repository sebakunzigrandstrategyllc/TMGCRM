import { Router } from "express";
import { db } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";

const router = Router();

// Approval turnaround: time from the first draft/edit activity on a column to its approval.
router.get("/turnaround", (req, res) => {
  const approvals = db
    .prepare(`SELECT * FROM approvals WHERE approved = 1 AND approved_at IS NOT NULL`)
    .all();

  const perColumn = Object.fromEntries(COLUMN_KEYS.map((k) => [k, { count: 0, totalHours: 0 }]));
  const details = [];

  for (const approval of approvals) {
    const firstActivity = db
      .prepare(
        `SELECT MIN(created_at) AS ts FROM activity_log
         WHERE project_id = ? AND column_key = ? AND action IN ('ai_draft_generated','human_edit_saved')`
      )
      .get(approval.project_id, approval.column_key);

    if (!firstActivity?.ts) continue;

    const startMs = new Date(firstActivity.ts).getTime();
    const endMs = new Date(approval.approved_at).getTime();
    const hours = (endMs - startMs) / (1000 * 60 * 60);
    if (hours < 0) continue;

    perColumn[approval.column_key].count += 1;
    perColumn[approval.column_key].totalHours += hours;
    details.push({
      projectId: approval.project_id,
      columnKey: approval.column_key,
      startedAt: firstActivity.ts,
      approvedAt: approval.approved_at,
      hours: Math.round(hours * 100) / 100,
    });
  }

  const summary = COLUMN_KEYS.map((key) => ({
    columnKey: key,
    approvedCount: perColumn[key].count,
    avgTurnaroundHours:
      perColumn[key].count > 0 ? Math.round((perColumn[key].totalHours / perColumn[key].count) * 100) / 100 : null,
  }));

  res.json({ summary, details });
});

// Content patterns: draft vs. edit length deltas, approval rates, activity volume, file mix.
router.get("/content-patterns", (req, res) => {
  const stageRows = db.prepare(`SELECT * FROM stage_entries`).all();

  const perColumn = Object.fromEntries(
    COLUMN_KEYS.map((k) => [k, { entries: 0, avgAiLength: 0, avgHumanLength: 0, editedCount: 0 }])
  );

  for (const row of stageRows) {
    const bucket = perColumn[row.column_key];
    if (!bucket) continue;
    bucket.entries += 1;
    bucket.avgAiLength += (row.ai_draft || "").length;
    bucket.avgHumanLength += (row.human_edit || "").length;
    if ((row.human_edit || "").trim().length > 0) bucket.editedCount += 1;
  }

  const summary = COLUMN_KEYS.map((key) => {
    const b = perColumn[key];
    return {
      columnKey: key,
      entries: b.entries,
      avgAiDraftLength: b.entries ? Math.round(b.avgAiLength / b.entries) : 0,
      avgHumanEditLength: b.entries ? Math.round(b.avgHumanLength / b.entries) : 0,
      editedRate: b.entries ? Math.round((b.editedCount / b.entries) * 100) : 0,
    };
  });

  const fileTypeCounts = db
    .prepare(`SELECT file_type AS fileType, COUNT(*) AS count FROM files GROUP BY file_type`)
    .all();

  const activityCounts = db
    .prepare(`SELECT action, COUNT(*) AS count FROM activity_log GROUP BY action ORDER BY count DESC`)
    .all();

  const amendmentStats = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(approved) AS approved FROM amendments`
    )
    .get();

  res.json({ summary, fileTypeCounts, activityCounts, amendmentStats });
});

router.get("/overview", (req, res) => {
  const projectCount = db.prepare(`SELECT COUNT(*) AS c FROM projects`).get().c;
  const proposalApprovedCount = db
    .prepare(`SELECT COUNT(*) AS c FROM approvals WHERE column_key = 'proposal' AND approved = 1`)
    .get().c;
  const totalFiles = db.prepare(`SELECT COUNT(*) AS c FROM files`).get().c;
  const totalAmendments = db.prepare(`SELECT COUNT(*) AS c FROM amendments`).get().c;

  res.json({ projectCount, proposalApprovedCount, totalFiles, totalAmendments });
});

export default router;

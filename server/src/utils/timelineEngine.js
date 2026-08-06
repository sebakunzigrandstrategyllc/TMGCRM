import { db, logActivity } from "../db/db.js";
import { generateJourneyTimeline, generateMakeExecutionTimeline } from "./ai.js";

function storeTimeline(projectId, stage, summary, segments) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO timelines (project_id, stage, summary, segments, generated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(projectId, stage, summary, JSON.stringify(segments), now);
  logActivity(projectId, "timeline_generated", stage, { segmentCount: segments.length });
  return getLatestTimeline(projectId, stage);
}

function deserialize(row) {
  if (!row) return null;
  return { ...row, segments: JSON.parse(row.segments) };
}

export function getLatestTimeline(projectId, stage) {
  const row = db
    .prepare(`SELECT * FROM timelines WHERE project_id = ? AND stage = ? ORDER BY generated_at DESC LIMIT 1`)
    .get(projectId, stage);
  return deserialize(row);
}

export function getTimelineHistory(projectId, stage) {
  return db
    .prepare(`SELECT * FROM timelines WHERE project_id = ? AND stage = ? ORDER BY generated_at DESC`)
    .all(projectId, stage)
    .map(deserialize);
}

// Diffs the See column's AI draft vs. human edit and maps out this project's individual
// journey timeline through all five stages.
export function generateAndStoreSeeTimeline(project) {
  const see = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = 'see'`)
    .get(project.id);
  const { summary, segments } = generateJourneyTimeline({
    clientName: project.client_name,
    seeAiDraft: see?.ai_draft || "",
    seeHumanEdit: see?.human_edit || "",
    startDate: project.created_at,
  });
  return storeTimeline(project.id, "see", summary, segments);
}

// Generated once the Proposal is approved, grounded in the approved proposal scope and the
// Understand PRD rather than the earlier intake-stage estimate.
export function generateAndStoreMakeTimeline(project) {
  const proposal = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = 'proposal'`)
    .get(project.id);
  const understand = db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = 'understand'`)
    .get(project.id);

  const { summary, segments } = generateMakeExecutionTimeline({
    clientName: project.client_name,
    proposalContent: proposal?.human_edit || proposal?.ai_draft || "",
    understandContent: understand?.human_edit || understand?.ai_draft || "",
    startDate: new Date().toISOString(),
  });
  return storeTimeline(project.id, "make", summary, segments);
}

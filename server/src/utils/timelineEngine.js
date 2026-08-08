import { db, logActivity } from "../db/db.js";
import { generateJourneyTimeline, generateMakeExecutionTimeline } from "./ai.js";

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

// Skips the write (and the version-history/activity-log noise that would come with it) when
// the newly computed timeline is identical to the last one — the cascade re-runs this on
// every save, so most calls should be no-ops.
function storeTimelineIfChanged(projectId, stage, summary, segments) {
  const current = getLatestTimeline(projectId, stage);
  const segmentsJson = JSON.stringify(segments);
  if (current && current.summary === summary && JSON.stringify(current.segments) === segmentsJson) {
    return current;
  }
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO timelines (project_id, stage, summary, segments, generated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(projectId, stage, summary, segmentsJson, now);
  logActivity(projectId, "timeline_generated", stage, { segmentCount: segments.length });
  return getLatestTimeline(projectId, stage);
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
  return storeTimelineIfChanged(project.id, "see", summary, segments);
}

// Regenerated continuously from whatever Proposal/Understand content currently exists, so a
// tentative execution timeline exists from early on; wording marks it "finalized" once
// Proposal is actually approved.
export function generateAndStoreMakeTimeline(project, { finalized = false } = {}) {
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
    // Anchored to project creation (like the See timeline) rather than "now" so the same
    // inputs always produce the same output — the cascade calls this on every save, and an
    // ever-shifting start date would defeat the diff-guard and spam the timeline history.
    startDate: project.created_at,
    finalized,
  });
  return storeTimelineIfChanged(project.id, "make", summary, segments);
}

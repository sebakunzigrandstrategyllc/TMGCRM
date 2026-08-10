import { db, logActivity } from "../db/db.js";
import { generateUnderstandBreakdown, generateStageDraft, generateIntakeSummary } from "./ai.js";
import { ensureProjectScaffold, isProposalApproved } from "./stageEntries.js";
import { generateAndStoreSeeTimeline, generateAndStoreMakeTimeline, getLatestTimeline } from "./timelineEngine.js";
import { ensureChecklist } from "./checklistEngine.js";
import { getIntakeDocumentsContent } from "./intakeDocuments.js";
import { COLUMN_KEYS } from "../constants.js";

function getStage(projectId, columnKey) {
  return db
    .prepare(`SELECT * FROM stage_entries WHERE project_id = ? AND column_key = ?`)
    .get(projectId, columnKey);
}

function reviewedContent(stage) {
  return (stage?.human_edit || stage?.ai_draft || "").trim();
}

// Writes a column's ai_draft only if it actually changed, versioning and logging it the same
// way a manual regenerate would. Never touches human_edit — this is the one thing the cascade
// is not allowed to overwrite.
function setAiDraftIfChanged(projectId, columnKey, newDraft) {
  const current = getStage(projectId, columnKey);
  if ((current?.ai_draft || "") === newDraft) return false;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`
  ).run(newDraft, now, projectId, columnKey);
  db.prepare(
    `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
     VALUES (?, ?, 'ai_draft', ?, ?)`
  ).run(projectId, columnKey, newDraft, now);
  logActivity(projectId, "ai_draft_generated", columnKey, { cascaded: true });
  return true;
}

// Keeps one AI-suggested milestone per execution-timeline phase, tracked by a stable
// source_key (not by title, which can change). A phase with no milestone yet gets one
// inserted; a phase whose milestone is still AI-suggested gets refreshed in place; a phase
// whose milestone a human has edited (source flips to 'human' on any PUT) is left alone
// entirely — editing an AI suggestion claims it instead of leaving a duplicate behind.
function regenerateTentativeMilestones(project, makeTimeline) {
  const segments = makeTimeline?.segments || [];
  const now = new Date().toISOString();
  let changed = false;

  const tx = db.transaction(() => {
    const bySourceKey = new Map(
      db
        .prepare(`SELECT * FROM milestones WHERE project_id = ? AND source_key IS NOT NULL`)
        .all(project.id)
        .map((m) => [m.source_key, m])
    );

    for (const seg of segments) {
      const title = `${seg.label} target`;
      const dueDate = seg.estimatedEnd.slice(0, 10);
      const existing = bySourceKey.get(seg.key);

      if (!existing) {
        db.prepare(
          `INSERT INTO milestones (project_id, title, due_date, status, notes, source, source_key, created_at)
           VALUES (?, ?, ?, 'pending', ?, 'ai_suggested', ?, ?)`
        ).run(
          project.id,
          title,
          dueDate,
          "AI-suggested from the execution timeline — edit or remove once Proposal is approved and this unlocks.",
          seg.key,
          now
        );
        changed = true;
      } else if (existing.source === "ai_suggested" && (existing.title !== title || existing.due_date !== dueDate)) {
        db.prepare(`UPDATE milestones SET title = ?, due_date = ? WHERE id = ?`).run(title, dueDate, existing.id);
        changed = true;
      }
      // else: existing.source === 'human' — a human has claimed this phase; leave it alone.
    }

    // Defensive cleanup: drop any still-tentative milestone whose phase no longer exists in
    // the current timeline (the phase set is fixed today, but this keeps it correct if that
    // ever changes). Human-claimed milestones are never deleted here.
    const currentKeys = new Set(segments.map((s) => s.key));
    for (const [key, m] of bySourceKey) {
      if (m.source === "ai_suggested" && !currentKeys.has(key)) {
        db.prepare(`DELETE FROM milestones WHERE id = ?`).run(m.id);
        changed = true;
      }
    }
  });
  tx();

  if (changed) logActivity(project.id, "milestones_suggested", "make", { count: segments.length });
}

// See's own ai_draft is regenerated from its actual canonical source — the intake fields plus
// every intake document's extracted content — not derived from an upstream column like every
// other stage. Re-running this whenever a document is added/removed keeps it current; it's a
// no-op (diff-guarded) whenever nothing about the source material has changed.
function regenerateSeeDraft(project) {
  const intakeForm = db
    .prepare(`SELECT * FROM intake_forms WHERE project_id = ? ORDER BY id DESC LIMIT 1`)
    .get(project.id);
  const { seeDraft } = generateIntakeSummary({
    clientName: project.client_name,
    contactInfo: project.contact_info,
    readAiTranscriptLink: intakeForm?.read_ai_transcript_link || null,
    notes: project.notes,
    documents: getIntakeDocumentsContent(project.id),
  });
  setAiDraftIfChanged(project.id, "see", seeDraft);
}

// The core cascade: re-derives the tentative outline for every stage from See through Sustain,
// left to right, each one framed from whatever the stage before it currently holds (human edit
// if the human has made one, otherwise the AI draft). Call this after any human edit, approval
// change, or at intake — it's idempotent and cheap, and only ever writes what actually changed.
export function regenerateProjectPlan(project) {
  ensureProjectScaffold(project.id);

  regenerateSeeDraft(project);

  const see = getStage(project.id, "see");
  const understandDraft = generateUnderstandBreakdown({
    clientName: project.client_name,
    seeContent: reviewedContent(see),
    notes: project.notes,
  });
  setAiDraftIfChanged(project.id, "understand", understandDraft);
  generateAndStoreSeeTimeline(project);

  const chain = ["proposal", "make", "manage", "sustain", "final_notes"];
  let upstreamContent = understandDraft; // Understand has no human edit, so its ai_draft *is* its reviewed content
  for (const columnKey of chain) {
    const draft = generateStageDraft(columnKey, { clientName: project.client_name, upstreamContent });
    setAiDraftIfChanged(project.id, columnKey, draft);
    upstreamContent = reviewedContent(getStage(project.id, columnKey));
  }

  const makeTimeline = generateAndStoreMakeTimeline(project, { finalized: isProposalApproved(project.id) });
  regenerateTentativeMilestones(project, makeTimeline || getLatestTimeline(project.id, "make"));

  // Lazily seed each approval-gated column's checklist — never regenerated automatically, so
  // editing upstream content never wipes a human's checked-off progress.
  for (const columnKey of COLUMN_KEYS) {
    if (columnKey === "contact_details") continue;
    ensureChecklist(project, columnKey);
  }
}

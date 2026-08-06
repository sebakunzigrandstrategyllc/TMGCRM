// Stubbed AI calls. Swap these implementations for real model calls later —
// callers only depend on the returned shapes, not how they're produced.
import { wordDiff } from "./diff.js";

export function generateIntakeSummary({ clientName, contactInfo, readAiTranscriptLink, notes }) {
  const seeDraft = [
    `[AI DRAFT — See]`,
    `Client: ${clientName || "Unknown"}`,
    `Contact: ${contactInfo || "Not provided"}`,
    readAiTranscriptLink ? `Read AI transcript reference: ${readAiTranscriptLink}` : null,
    ``,
    `Initial observations captured from intake materials. This is an auto-generated first draft`,
    `summarizing what was seen during intake (calls, transcripts, email threads, and notes).`,
    notes ? `\nIntake notes:\n${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { seeDraft };
}

// Understand is fully AI-generated — a PRD-style breakdown of the project derived from the
// reviewed See content (the human edit if one exists, otherwise the AI draft). There is no
// human-edit field on this column; humans approve or request a regenerate instead of typing.
export function generateUnderstandBreakdown({ clientName, seeContent, notes }) {
  const basis = (seeContent || "").trim();
  return [
    `[AI DRAFT — Understand: Project Breakdown]`,
    `A PRD-style breakdown of ${clientName || "this project"}, generated from the reviewed See summary.`,
    ``,
    `PROBLEM STATEMENT`,
    basis
      ? basis
      : `No reviewed See content yet — approve/edit See, then regenerate this breakdown for a sharper read.`,
    ``,
    `WHAT WE UNDERSTAND`,
    `- The client context, goals, and priorities captured during intake and See review.`,
    `- Constraints and considerations surfaced so far.`,
    ``,
    `WHAT'S NEEDED`,
    `- Scope and deliverables to formalize in the Proposal.`,
    `- Access, materials, or decisions required before Make can begin.`,
    ``,
    `SUCCESS CRITERIA`,
    `- The outcomes that will define this engagement as successful.`,
    ``,
    `OPEN QUESTIONS`,
    `- Anything unresolved that should be clarified before proposing scope.`,
    notes ? `\nIntake notes:\n${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateChangeReport({ title, description, oldValue, newValue }) {
  return [
    `[AI DRAFT — Scope Change Report]`,
    `Amendment: ${title}`,
    description ? `Reason: ${description}` : null,
    ``,
    `Previous scope:`,
    oldValue || "(none recorded)",
    ``,
    `New scope:`,
    newValue || "(none recorded)",
    ``,
    `Summary: This amendment updates the scope as described above. Auto-generated summary —`,
    `review and edit before sending to the client.`,
  ]
    .filter(Boolean)
    .join("\n");
}

const JOURNEY_STAGES = [
  { key: "see", label: "See", baseDays: 2 },
  { key: "understand", label: "Understand", baseDays: 3 },
  { key: "make", label: "Make", baseDays: 10 },
  { key: "manage", label: "Manage", baseDays: 14 },
  { key: "sustain", label: "Sustain", baseDays: 7 },
];

function diffComplexity(aiDraft, humanEdit) {
  const parts = wordDiff(aiDraft || "", humanEdit || "");
  const added = parts.filter((p) => p.type === "added" && p.value.trim()).length;
  const removed = parts.filter((p) => p.type === "removed" && p.value.trim()).length;
  const same = parts.filter((p) => p.type === "same" && p.value.trim()).length;
  const changed = added + removed;
  const changeRatio = changed / Math.max(changed + same, 1);
  return { added, removed, changeRatio };
}

function layoutSegments(stages, startDate, multiplier) {
  let cursor = new Date(startDate || Date.now());
  const segments = stages.map((stage) => {
    const days = Math.max(1, Math.round(stage.baseDays * multiplier));
    const estimatedStart = new Date(cursor);
    const estimatedEnd = new Date(cursor);
    estimatedEnd.setDate(estimatedEnd.getDate() + days);
    cursor = new Date(estimatedEnd);
    return {
      key: stage.key,
      label: stage.label,
      estimatedDays: days,
      estimatedStart: estimatedStart.toISOString(),
      estimatedEnd: estimatedEnd.toISOString(),
    };
  });
  const totalDays = segments.reduce((sum, s) => sum + s.estimatedDays, 0);
  return { segments, totalDays };
}

// Analyzes the See column's AI draft vs. the human edit and maps out this specific project's
// journey through See -> Understand -> Make -> Manage -> Sustain. The amount of hand-editing
// is used as a rough complexity signal so each project's estimate is its own, not a template.
export function generateJourneyTimeline({ clientName, seeAiDraft, seeHumanEdit, startDate }) {
  const { added, removed, changeRatio } = diffComplexity(seeAiDraft, seeHumanEdit);
  const complexityMultiplier = 0.85 + Math.min(changeRatio, 1) * 0.65; // ~0.85x-1.5x

  const { segments, totalDays } = layoutSegments(JOURNEY_STAGES, startDate, complexityMultiplier);

  const summary = [
    `Journey analysis for ${clientName || "this project"}, based on comparing the AI-drafted See`,
    `summary against the human-reviewed edit (${added} word(s) added, ${removed} removed, ~${Math.round(
      changeRatio * 100
    )}% of the draft revised by hand).`,
    changeRatio > 0.4
      ? `Substantial hands-on revision suggests a more involved engagement — timeline weighted accordingly.`
      : `Light revision suggests the AI draft closely matched reality — timeline follows standard pacing.`,
    `Estimated total duration across See → Understand → Make → Manage → Sustain: ~${totalDays} days.`,
  ].join(" ");

  return { summary, segments };
}

const MAKE_PHASES = [
  { key: "kickoff", label: "Kickoff & Setup", baseDays: 2 },
  { key: "build", label: "Core Build", baseDays: 7 },
  { key: "review", label: "Review & Revisions", baseDays: 3 },
  { key: "manage_transition", label: "Manage Transition", baseDays: 5 },
  { key: "sustain_handoff", label: "Sustain Handoff", baseDays: 3 },
];

// Generated once the Proposal is approved. Supersedes the rough See-stage journey estimate
// for Make onward, grounded in the actual approved scope and the Understand breakdown.
export function generateMakeExecutionTimeline({ clientName, proposalContent, understandContent, startDate }) {
  const scopeSignal = (proposalContent || "").trim().length + (understandContent || "").trim().length;
  const scopeMultiplier = scopeSignal === 0 ? 1 : Math.min(2, 0.8 + scopeSignal / 2000);

  const { segments, totalDays } = layoutSegments(MAKE_PHASES, startDate, scopeMultiplier);

  const summary = [
    `Execution timeline for ${clientName || "this project"}, generated now that the Proposal is approved.`,
    `Grounded in the approved proposal scope and the Understand breakdown rather than the earlier`,
    `intake-stage estimate — this supersedes the See-stage journey timeline for Make onward.`,
    `Estimated total: ~${totalDays} days across kickoff, build, review, and the transition into Manage and Sustain.`,
  ].join(" ");

  return { summary, segments };
}

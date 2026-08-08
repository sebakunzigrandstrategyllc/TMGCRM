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

// Tentative stage drafts for Proposal -> Make -> Manage -> Sustain -> Final Notes, each
// framed from the stage immediately before it. Called on a chain (each stage's output feeds
// the next) so the whole See -> Sustain outline updates left to right whenever an upstream
// human edit changes what feeds into it. These only ever write to ai_draft — a stage's own
// human edit (once made) is never touched by this.
const STAGE_DRAFT_META = {
  proposal: {
    heading: "Proposal",
    upstreamLabel: "Understand breakdown",
    body: (upstreamContent) => [
      `Tentative scope and terms, drafted from the Understand breakdown below. Refine before sending to the client.`,
      ``,
      `SCOPE (from Understand)`,
      upstreamContent || "Pending — approve/edit See so Understand can generate.",
      ``,
      `DELIVERABLES`,
      `- To be itemized from Understand's "What's needed" section.`,
      ``,
      `TERMS`,
      `- Fee structure and timeline to be finalized with the client.`,
    ],
  },
  make: {
    heading: "Make",
    upstreamLabel: "Proposal",
    body: (upstreamContent) => [
      `Tentative execution plan — "this is the plan" — drafted from the current Proposal below.`,
      ``,
      `PLAN (from Proposal)`,
      upstreamContent || "Pending — draft or approve Proposal first.",
      ``,
      `KEY ACTIVITIES`,
      `- Kickoff, core build, and review passes scoped from the Proposal.`,
    ],
  },
  manage: {
    heading: "Manage",
    upstreamLabel: "Make plan",
    body: (upstreamContent) => [
      `Tentative plan for ongoing management and oversight once delivered — "this is the plan" — drafted from the current Make plan below.`,
      ``,
      `PLAN (from Make)`,
      upstreamContent || "Pending — draft or approve Make first.",
      ``,
      `OVERSIGHT`,
      `- Check-in cadence and reporting to define as Make progresses.`,
    ],
  },
  sustain: {
    heading: "Sustain",
    upstreamLabel: "Manage plan",
    body: (upstreamContent) => [
      `Tentative plan for long-term sustainability and handoff — "this is the plan" — drafted from the current Manage plan below.`,
      ``,
      `PLAN (from Manage)`,
      upstreamContent || "Pending — draft or approve Manage first.",
      ``,
      `HANDOFF`,
      `- Knowledge transfer and long-term ownership to define as Manage progresses.`,
    ],
  },
  final_notes: {
    heading: "Final Notes & Follow-Up Recommendations",
    upstreamLabel: "Sustain plan",
    body: (upstreamContent) => [
      `Tentative closing notes and follow-up recommendations, drafted from the current Sustain plan below.`,
      ``,
      `SUMMARY (from Sustain)`,
      upstreamContent || "Pending — draft or approve Sustain first.",
      ``,
      `FOLLOW-UP RECOMMENDATIONS`,
      `- To be finalized as the engagement nears completion.`,
    ],
  },
};

export function generateStageDraft(stageKey, { clientName, upstreamContent }) {
  const meta = STAGE_DRAFT_META[stageKey];
  if (!meta) throw new Error(`No stage draft generator for "${stageKey}"`);
  return [`[AI DRAFT — ${meta.heading}] (tentative, for ${clientName || "this project"})`, ...meta.body(upstreamContent)]
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

// Regenerated continuously as the Proposal/Understand content changes, so there's always a
// current best-guess execution plan. Once Proposal is actually approved, the wording marks it
// final rather than tentative — same generator, sharper framing.
export function generateMakeExecutionTimeline({ clientName, proposalContent, understandContent, startDate, finalized }) {
  const scopeSignal = (proposalContent || "").trim().length + (understandContent || "").trim().length;
  const scopeMultiplier = scopeSignal === 0 ? 1 : Math.min(2, 0.8 + scopeSignal / 2000);

  const { segments, totalDays } = layoutSegments(MAKE_PHASES, startDate, scopeMultiplier);

  const summary = [
    finalized
      ? `Execution timeline for ${clientName || "this project"}, finalized now that the Proposal is approved.`
      : `Tentative execution timeline for ${clientName || "this project"}, drafted from the current Proposal and`,
    finalized
      ? `Grounded in the approved proposal scope and the Understand breakdown — this supersedes the See-stage`
      : `Understand content so far. Grounded in whatever scope exists right now — this will keep updating as`,
    finalized ? `journey timeline for Make onward.` : `Proposal is edited, and firms up once Proposal is approved.`,
    `Estimated total: ~${totalDays} days across kickoff, build, review, and the transition into Manage and Sustain.`,
  ].join(" ");

  return { summary, segments };
}

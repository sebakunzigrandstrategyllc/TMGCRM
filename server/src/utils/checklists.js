// Stubbed AI-generated checklists: one set of objectives per approval-gated column, each with
// a meticulous step-by-step explanation of how to actually accomplish it. Swap the detail
// generation for a real model call later — callers only depend on the {title, detail}[] shape.

function detail(steps, note) {
  return [...steps.map((s, i) => `${i + 1}. ${s}`), note ? `` : null, note].filter(Boolean).join("\n");
}

const TEMPLATES = {
  see: (ctx) => [
    {
      title: "Confirm contact details are accurate",
      detail: detail([
        `Open Contact Details and re-read the client name and contact info against the intake form you were given.`,
        `Call or email to confirm the primary contact if anything looks auto-generated or uncertain.`,
        `Fix any typos directly in Contact Details' edit field and save before moving on.`,
      ], `A wrong email here quietly breaks every follow-up later — worth the 2 minutes now.`),
    },
    {
      title: "Review the Read AI transcript for key decisions",
      detail: detail([
        `Open the transcript (link or uploaded file) attached during intake.`,
        `Listen for or search for moments where the client stated a firm requirement, a deadline, or a budget figure.`,
        `Copy anything decision-grade into the See human edit field in your own words, not just "see transcript".`,
      ], `The AI draft only summarizes what it detected — a human pass catches nuance and tone the transcript alone won't.`),
    },
    {
      title: "Review the email thread for prior commitments",
      detail: detail([
        `Skim the uploaded email thread top to bottom, oldest message first.`,
        `Note anything that reads like a promise ("we'll have X by Friday", "no charge for Y") — these become constraints later.`,
        `Add a short bullet for each into the See human edit field.`,
      ]),
    },
    {
      title: "State the client's goal in your own words",
      detail: detail([
        `Write one or two sentences in the See human edit field that state, plainly, what the client is actually trying to achieve.`,
        `Avoid restating their exact phrasing — paraphrasing forces you to actually understand it.`,
        `If you can't paraphrase it confidently, that's a sign you need another round with the client before Understand.`,
      ]),
    },
    {
      title: "Flag open questions before moving to Understand",
      detail: detail([
        `List anything ambiguous or unconfirmed at the end of the See human edit field under a short "Open questions" note.`,
        `These carry forward into Understand's "Open Questions" section automatically — leaving this blank means Understand will too.`,
      ]),
    },
  ],
  understand: (ctx) => [
    {
      title: "Validate the problem statement matches reality",
      detail: detail([
        `Re-read the Understand breakdown's PROBLEM STATEMENT against your own read of See.`,
        `If the AI missed the actual pain point, go back and sharpen the See human edit, then regenerate Understand.`,
      ], `Understand is AI-only — you steer it by editing See, not by editing Understand directly.`),
    },
    {
      title: "Confirm success criteria are specific and measurable",
      detail: detail([
        `Look at the SUCCESS CRITERIA section — vague criteria ("client is happy") aren't useful later when judging Final Notes.`,
        `If it's vague, add something concrete to the See human edit (a metric, a deadline, a deliverable) and regenerate.`,
      ]),
    },
    {
      title: "Resolve or explicitly accept open questions",
      detail: detail([
        `Go through OPEN QUESTIONS one by one.`,
        `For each, either resolve it (update See with the answer) or consciously decide it's fine to proceed without an answer yet.`,
        `Don't approve this column with unresolved questions you've forgotten about — they won't block you automatically.`,
      ]),
    },
    {
      title: "Sanity-check WHAT'S NEEDED against your own capacity",
      detail: detail([
        `Read the WHAT'S NEEDED section and honestly assess whether you (or your team) can deliver it in the timeframe implied by the Journey Timeline on See.`,
        `If not, that's a conversation to have with the client before Proposal, not after.`,
      ]),
    },
    {
      title: "Approve only once this reads like a PRD you'd hand to someone else",
      detail: detail([
        `Imagine handing this Understand breakdown to a collaborator with zero context.`,
        `If they'd have follow-up questions you already know the answer to, that answer belongs in See so Understand can pick it up.`,
      ]),
    },
  ],
  proposal: (ctx) => [
    {
      title: "Itemize deliverables explicitly",
      detail: detail([
        `In the Proposal human edit field, list each deliverable as its own line, not a paragraph.`,
        `Pull the raw material from the Understand breakdown's WHAT'S NEEDED section, but make each item concrete and countable.`,
      ]),
    },
    {
      title: "Confirm fee structure and payment terms",
      detail: detail([
        `Decide fixed-fee vs. milestone-based vs. hourly, and write it explicitly under TERMS.`,
        `Note deposit requirements now — the Payment Schedule sub-section unlocks once this column is approved, and it'll be easier to fill in if the terms are already written here.`,
      ]),
    },
    {
      title: "Set a realistic delivery timeline",
      detail: detail([
        `Cross-check your stated timeline against the tentative Execution Timeline already showing in the Make column.`,
        `If your promised date is tighter than the AI's estimate, either adjust the promise or plan to compress scope — don't just ignore the mismatch.`,
      ]),
    },
    {
      title: "Define what's explicitly out of scope",
      detail: detail([
        `Add an "out of scope" line even if it feels obvious — this is what you'll point to during a scope-change conversation later.`,
        `Anything not listed as a deliverable should be assumed out of scope by both sides.`,
      ]),
    },
    {
      title: "Get a second read before sending",
      detail: detail([
        `Re-read the full Proposal human edit field once, cold, as if you were the client receiving it.`,
        `Check that dollar amounts, dates, and deliverable counts are internally consistent.`,
      ], `Approving this column unlocks Milestones, Payment Schedule, the Calendar, and finalizes the Make execution timeline — worth a careful last pass.`),
    },
  ],
  make: (ctx) => [
    {
      title: "Confirm required access and materials are in hand",
      detail: detail([
        `List anything you need from the client (logins, brand assets, prior documentation) that isn't already attached as a file on this column.`,
        `Chase down anything missing before starting the Core Build phase shown in the execution timeline.`,
      ]),
    },
    {
      title: "Break the build into concrete milestones",
      detail: detail([
        `Compare the tentative milestones already listed under this column against the actual work.`,
        `Once Proposal is approved, edit or add real milestones in the Milestones section below — the AI-suggested ones are a starting point, not the final word.`,
      ]),
    },
    {
      title: "Identify dependencies or blockers up front",
      detail: detail([
        `Note anything that could stall the build — a third-party API, a pending client decision, a slow approval chain.`,
        `Put these in the Make human edit field so they're visible, not just in your head.`,
      ]),
    },
    {
      title: "Set a review/feedback checkpoint with the client",
      detail: detail([
        `Schedule at least one mid-build check-in using the internal calendar (unlocked once Proposal is approved).`,
        `Waiting until the very end to show the client anything is the single most common cause of scope-change amendments.`,
      ]),
    },
    {
      title: "Confirm the QA/testing approach before calling it done",
      detail: detail([
        `Write down, explicitly, how you'll verify the work meets the deliverables listed in Proposal before you approve this column.`,
        `"It looks right" is not a QA approach.`,
      ]),
    },
  ],
  manage: (ctx) => [
    {
      title: "Define check-in cadence with the client",
      detail: detail([
        `Decide weekly, biweekly, or monthly — and put it in writing in the Manage human edit field.`,
        `Add the recurring check-ins to the internal calendar so they're not left to memory.`,
      ]),
    },
    {
      title: "Set up a reporting/status update format",
      detail: detail([
        `Decide what a status update actually contains (progress, blockers, next steps) and keep it consistent every time.`,
        `A consistent format is what makes Final Notes easy to write later — you're building your own paper trail now.`,
      ]),
    },
    {
      title: "Identify the escalation path for issues",
      detail: detail([
        `Write down who gets contacted, and how, if something goes wrong during Manage.`,
        `This should live in the Manage human edit field, not just in your head.`,
      ]),
    },
    {
      title: "Confirm who owns what post-handoff",
      detail: detail([
        `List which responsibilities are yours to carry during Manage and which already belong to the client.`,
        `Ambiguity here is exactly what Sustain's HANDOFF section is meant to resolve — get ahead of it now.`,
      ]),
    },
    {
      title: "Document known risks going into this phase",
      detail: detail([
        `Note anything that could realistically go sideways during Manage — a fragile integration, a key person leaving, an unclear requirement.`,
        `A short list here is more useful than none at all.`,
      ]),
    },
  ],
  sustain: (ctx) => [
    {
      title: "Document long-term maintenance requirements",
      detail: detail([
        `Write out what needs to keep happening after the engagement ends — updates, monitoring, renewals — in the Sustain human edit field.`,
        `Be specific about frequency, not just "ongoing maintenance."`,
      ]),
    },
    {
      title: "Identify who owns the system/deliverable after handoff",
      detail: detail([
        `Name a specific person or role on the client side, not just "the client."`,
        `If nobody's been named yet, that's a conversation to have before this column gets approved.`,
      ]),
    },
    {
      title: "Prepare training or knowledge-transfer materials",
      detail: detail([
        `List what documentation, walkthroughs, or recorded sessions the client will need to operate independently.`,
        `Attach the actual files to this column once they exist, so they're organized under this project's Documents folder.`,
      ]),
    },
    {
      title: "Confirm the support/escalation contact after engagement ends",
      detail: detail([
        `Write down who the client contacts, and how, if something breaks after you're no longer actively engaged.`,
        `This becomes part of Final Notes' follow-up recommendations automatically — get it right here.`,
      ]),
    },
    {
      title: "Set a follow-up check-in date",
      detail: detail([
        `Pick a concrete date (30/60/90 days out is typical) to check back in with the client after handoff.`,
        `Add it to the internal calendar now, while you're thinking about it.`,
      ]),
    },
  ],
  final_notes: (ctx) => [
    {
      title: "Summarize what was delivered vs. originally scoped",
      detail: detail([
        `Compare the final state of Make/Manage/Sustain against the original Proposal deliverables list.`,
        `Call out anything that changed, even minor things — this is the record you'll want if questions come up later.`,
      ]),
    },
    {
      title: "Note any deviations and why",
      detail: detail([
        `If scope, timeline, or fees changed during the engagement, check the Scope Changes / Amendments section and summarize the net effect here.`,
        `Don't just say "scope changed" — say what changed and why, briefly.`,
      ]),
    },
    {
      title: "Capture lessons learned for future engagements",
      detail: detail([
        `Write down one or two things that would make the next engagement with a similar client go more smoothly.`,
        `Future-you will not remember this unless it's written down now.`,
      ]),
    },
    {
      title: "List concrete follow-up recommendations",
      detail: detail([
        `Turn Sustain's handoff notes into specific, actionable recommendations for the client — not general advice.`,
        `"Consider a redesign in 12-18 months" is useful; "keep things updated" is not.`,
      ]),
    },
    {
      title: "Confirm all files and deliverables are archived and accessible",
      detail: detail([
        `Check every column's file attachments and this project's Pictures/Video/Audio/Documents folders for completeness.`,
        `Make sure the client actually has access to what they're paying for before you call this engagement closed.`,
      ]),
    },
  ],
};

export function generateChecklist(columnKey, context = {}) {
  const builder = TEMPLATES[columnKey];
  if (!builder) return [];
  return builder(context);
}

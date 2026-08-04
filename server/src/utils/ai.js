// Stubbed AI calls. Swap these implementations for real model calls later —
// callers only depend on the returned string shape, not how it's produced.

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

  const understandDraft = [
    `[AI DRAFT — Understand]`,
    `Auto-generated first-pass interpretation of the client's underlying goals, constraints,`,
    `and success criteria based on the intake materials above. Refine after human review.`,
  ].join("\n");

  return { seeDraft, understandDraft };
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

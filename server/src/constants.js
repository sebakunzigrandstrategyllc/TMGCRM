// Ordered dashboard columns. Order matters: approval gate on column N blocks editing of column N+1.
export const COLUMNS = [
  { key: "contact_details", label: "Contact Details", requiresApproval: false },
  { key: "see", label: "Intake / See", requiresApproval: true },
  {
    key: "understand",
    label: "Understand",
    requiresApproval: true,
    aiGenerated: true, // PRD-style breakdown generated from See's reviewed content — no human-edit field
  },
  { key: "proposal", label: "Proposal", requiresApproval: true, unlocksProposalGates: true },
  { key: "make", label: "Make", tagline: "This is the plan", requiresApproval: true },
  { key: "manage", label: "Manage", tagline: "This is the plan", requiresApproval: true },
  { key: "sustain", label: "Sustain", tagline: "This is the plan", requiresApproval: true },
  { key: "final_notes", label: "Final Notes & Follow-Up Recommendations", requiresApproval: true },
];

export const COLUMN_KEYS = COLUMNS.map((c) => c.key);

export const FILE_TYPES = ["Pictures", "Video", "Audio", "Documents"];

export const MIME_TO_FILE_TYPE = (mime, originalName = "") => {
  if (mime?.startsWith("image/")) return "Pictures";
  if (mime?.startsWith("video/")) return "Video";
  if (mime?.startsWith("audio/")) return "Audio";
  const ext = originalName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "svg"].includes(ext)) return "Pictures";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "Video";
  if (["mp3", "wav", "m4a", "aac", "ogg"].includes(ext)) return "Audio";
  return "Documents";
};

export const CALENDAR_HOURS = {
  1: { start: "07:00", end: "15:00" }, // Monday
  2: { start: "07:00", end: "15:00" }, // Tuesday
  3: { start: "07:00", end: "15:00" }, // Wednesday
  4: { start: "07:00", end: "15:00" }, // Thursday
  5: { start: "10:00", end: "14:00" }, // Friday
};

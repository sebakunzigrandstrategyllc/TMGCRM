import { db, logActivity } from "../db/db.js";
import { generateProjectId } from "./projectId.js";
import { ensureProjectScaffold } from "./stageEntries.js";
import { regenerateProjectPlan } from "./planEngine.js";
import { ensureProjectFolders } from "./storage.js";
import { composeContactInfo } from "./contactInfo.js";
import { getChecklist, setItemChecked } from "./checklistEngine.js";

export class IntakeValidationError extends Error {}

const PRE_APPROVED_NOTE = "Pre-approved at intake — proposal already agreed and payment accepted.";

function autoApproveColumn(project, columnKey) {
  const now = new Date().toISOString();
  for (const item of getChecklist(project.id, columnKey)) {
    setItemChecked(project.id, item.id, true);
  }
  db.prepare(
    `UPDATE approvals SET approved = 1, approved_at = ?, notes = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`
  ).run(now, PRE_APPROVED_NOTE, now, project.id, columnKey);
  logActivity(project.id, "approval_granted", columnKey, { autoApproved: true, reason: "proposal_agreed_at_intake" });
}

// Core project creation, shared by the single-client intake form and the CSV bulk importer.
// Creates the project row + folders + intake_forms row + Contact Details, then runs the plan
// cascade so See's draft (and everything downstream) reflects whatever's already on file for
// this project (fields now; any intake documents get added afterward and re-trigger the same
// cascade). If proposalAgreed is set, See/Understand/Proposal are immediately auto-approved
// (their checklists auto-checked, with a note explaining why) and the cascade re-runs so
// Make/Milestones/Payments/Calendar unlock right away — for a client who arrives with an
// already-signed proposal and accepted payment, rather than walking through gates that are
// already, in reality, cleared.
export function createProjectFromIntake({ clientName, email, phone, company, notes, readAiTranscriptLink, proposalAgreed }) {
  if (!clientName || !clientName.trim()) {
    throw new IntakeValidationError("clientName is required");
  }

  const projectMeta = generateProjectId();
  const contactInfo = composeContactInfo({ email, phone, company });
  const now = new Date().toISOString();
  const projectId = projectMeta.id;

  db.prepare(
    `INSERT INTO projects (id, seq_number, random_id, client_name, contact_info, email, phone, company, notes, current_stage, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'see', ?, ?)`
  ).run(
    projectId,
    projectMeta.seqNumber,
    projectMeta.randomId,
    clientName.trim(),
    contactInfo,
    email?.trim() || null,
    phone?.trim() || null,
    company?.trim() || null,
    notes || "",
    now,
    now
  );

  ensureProjectFolders(projectId);
  ensureProjectScaffold(projectId);

  db.prepare(
    `INSERT INTO intake_forms (project_id, read_ai_transcript_link, notes, created_at) VALUES (?, ?, ?, ?)`
  ).run(projectId, readAiTranscriptLink || null, notes || "", now);

  const contactDetails = [
    `Client: ${clientName.trim()}`,
    company ? `Company: ${company}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  db.prepare(
    `UPDATE stage_entries SET ai_draft = ?, human_edit = ?, updated_at = ? WHERE project_id = ? AND column_key = 'contact_details'`
  ).run(contactDetails, contactDetails, now, projectId);
  db.prepare(
    `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at) VALUES (?, 'contact_details', 'ai_draft', ?, ?)`
  ).run(projectId, contactDetails, now);

  logActivity(projectId, "project_created", null, { clientName, proposalAgreed: !!proposalAgreed });

  // See's ai_draft (and everything downstream) is derived entirely from what's now in the
  // projects/intake_forms/intake_documents tables — no need to compute it separately here.
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId);
  regenerateProjectPlan(project);

  if (proposalAgreed) {
    autoApproveColumn(project, "see");
    autoApproveColumn(project, "understand");
    autoApproveColumn(project, "proposal");
    regenerateProjectPlan(project);
  }

  return project;
}

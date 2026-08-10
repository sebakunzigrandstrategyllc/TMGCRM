import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db, logActivity } from "../db/db.js";
import { generateProjectId } from "../utils/projectId.js";
import { generateIntakeSummary } from "../utils/ai.js";
import { ensureProjectScaffold } from "../utils/stageEntries.js";
import { regenerateProjectPlan } from "../utils/planEngine.js";
import { ensureProjectFolders, duplicateIntoTypeFolder, projectDir } from "../utils/storage.js";
import { addFileDocument, addPastedTextDocument, getIntakeDocumentsContent } from "../utils/intakeDocuments.js";
import { isSupportedIntakeFile, SUPPORTED_INTAKE_LABEL } from "../utils/textExtraction.js";
import { MIME_TO_FILE_TYPE } from "../constants.js";

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

router.post("/", upload.array("documents", 20), async (req, res) => {
  try {
    const { clientName, contactInfo, readAiTranscriptLink, notes } = req.body;
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({ error: "clientName is required" });
    }

    // Pasted-text intake items travel as a JSON string field (labels + content), alongside
    // any number of uploaded files in `documents`. Intake is text-only: PDFs, plain text, and
    // images (OCR'd) are accepted; audio/video are rejected here rather than accepted and
    // silently ignored — everything that gets in must actually be readable by
    // generateIntakeSummary.
    let textBlocks = [];
    if (req.body.textBlocks) {
      try {
        textBlocks = JSON.parse(req.body.textBlocks);
      } catch {
        return res.status(400).json({ error: "textBlocks must be valid JSON" });
      }
    }

    const rejectedFiles = (req.files || []).filter((f) => !isSupportedIntakeFile(f.mimetype, f.originalname));
    if (rejectedFiles.length > 0) {
      for (const f of req.files) fs.unlinkSync(f.path);
      return res.status(400).json({
        error: `Intake only accepts text-based documents (${SUPPORTED_INTAKE_LABEL}) — audio and video aren't analyzed here. Rejected: ${rejectedFiles.map((f) => f.originalname).join(", ")}`,
      });
    }

    let projectMeta;
    try {
      projectMeta = generateProjectId();
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const now = new Date().toISOString();
    const projectId = projectMeta.id;

    db.prepare(
      `INSERT INTO projects (id, seq_number, random_id, client_name, contact_info, notes, current_stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'see', ?, ?)`
    ).run(projectId, projectMeta.seqNumber, projectMeta.randomId, clientName.trim(), contactInfo || "", notes || "", now, now);

    ensureProjectFolders(projectId);
    ensureProjectScaffold(projectId);

    db.prepare(
      `INSERT INTO intake_forms (project_id, read_ai_transcript_link, notes, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(projectId, readAiTranscriptLink || null, notes || "", now);

    // Save each uploaded file (organized into its type folder as usual) and, where the format
    // is supported (PDF, plain text), extract its actual text content as an intake document.
    const uploadedFiles = [];
    for (const file of req.files || []) {
      const fileType = MIME_TO_FILE_TYPE(file.mimetype, file.originalname);
      const primaryDir = path.join(projectDir(projectId), "_uploads");
      fs.mkdirSync(primaryDir, { recursive: true });
      fs.copyFileSync(file.path, path.join(primaryDir, file.originalname));
      const dupPath = duplicateIntoTypeFolder(projectId, file.path, fileType, file.originalname);

      const fileInfo = db
        .prepare(
          `INSERT INTO files (project_id, column_key, file_type, original_name, stored_path, mime_type, size, uploaded_at)
           VALUES (?, 'see', ?, ?, ?, ?, ?, ?)`
        )
        .run(projectId, fileType, file.originalname, dupPath, file.mimetype, file.size, now);
      uploadedFiles.push(fileInfo.lastInsertRowid);

      await addFileDocument(projectId, {
        kind: "file",
        label: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        originalName: file.originalname,
        fileId: fileInfo.lastInsertRowid,
      });
      fs.unlinkSync(file.path);
    }

    for (const block of textBlocks) {
      if (!block?.content?.trim()) continue;
      addPastedTextDocument(projectId, {
        kind: "text",
        label: block.label?.trim() || "Pasted note",
        content: block.content.trim(),
      });
    }

    // Seed See's first draft from the intake fields and every intake document's actual
    // extracted content, then cascade: this fills in a tentative AI draft for every column
    // from Understand through Final Notes, plus the See journey timeline, a tentative Make
    // execution timeline, and tentative (AI-suggested) milestones — the full See -> Sustain
    // outline exists, informed by real source material, from the moment the project is created.
    const { seeDraft } = generateIntakeSummary({
      clientName,
      contactInfo,
      readAiTranscriptLink,
      notes,
      documents: getIntakeDocumentsContent(projectId),
    });

    const contactDetails = [`Client: ${clientName.trim()}`, contactInfo ? `Contact: ${contactInfo}` : null]
      .filter(Boolean)
      .join("\n");

    db.prepare(
      `UPDATE stage_entries SET ai_draft = ?, human_edit = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`
    ).run(contactDetails, contactDetails, now, projectId, "contact_details");
    db.prepare(`UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`).run(
      seeDraft,
      now,
      projectId,
      "see"
    );

    const insertVersion = db.prepare(
      `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
       VALUES (?, ?, 'ai_draft', ?, ?)`
    );
    insertVersion.run(projectId, "contact_details", contactDetails, now);
    insertVersion.run(projectId, "see", seeDraft, now);

    logActivity(projectId, "project_created", null, { clientName });
    logActivity(projectId, "ai_draft_generated", "see", { source: "intake" });

    const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId);
    regenerateProjectPlan(project);

    res.status(201).json({ project, uploadedFileIds: uploadedFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to process intake" });
  }
});

export default router;

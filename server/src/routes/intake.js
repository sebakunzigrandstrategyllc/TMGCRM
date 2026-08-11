import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../db/db.js";
import { createProjectFromIntake, IntakeValidationError } from "../utils/projectCreation.js";
import { ensureProjectFolders, duplicateIntoTypeFolder, projectDir } from "../utils/storage.js";
import { addFileDocument, addPastedTextDocument } from "../utils/intakeDocuments.js";
import { isSupportedIntakeFile, SUPPORTED_INTAKE_LABEL } from "../utils/textExtraction.js";
import { regenerateProjectPlan } from "../utils/planEngine.js";
import { MIME_TO_FILE_TYPE } from "../constants.js";

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

router.post("/", upload.array("documents", 20), async (req, res) => {
  try {
    const { clientName, email, phone, company, readAiTranscriptLink, notes, proposalAgreed } = req.body;

    // Pasted-text intake items travel as a JSON string field (labels + content), alongside
    // any number of uploaded files in `documents`. Intake is text-only: PDFs, plain text, and
    // images (OCR'd) are accepted; audio/video are rejected here rather than accepted and
    // silently ignored — everything that gets in must actually be readable by the AI draft
    // generator.
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

    let project;
    try {
      project = createProjectFromIntake({
        clientName,
        email,
        phone,
        company,
        notes,
        readAiTranscriptLink,
        proposalAgreed: proposalAgreed === "true" || proposalAgreed === true,
      });
    } catch (err) {
      if (err instanceof IntakeValidationError) return res.status(400).json({ error: err.message });
      throw err;
    }

    // Save each uploaded file (organized into its type folder as usual) and, where the format
    // is supported, extract its actual text content as an intake document — then cascade so
    // See's draft (and everything downstream) picks up what was just added.
    const uploadedFiles = [];
    for (const file of req.files || []) {
      const fileType = MIME_TO_FILE_TYPE(file.mimetype, file.originalname);
      const primaryDir = path.join(projectDir(project.id), "_uploads");
      fs.mkdirSync(primaryDir, { recursive: true });
      fs.copyFileSync(file.path, path.join(primaryDir, file.originalname));
      const dupPath = duplicateIntoTypeFolder(project.id, file.path, fileType, file.originalname);

      const fileInfo = db
        .prepare(
          `INSERT INTO files (project_id, column_key, file_type, original_name, stored_path, mime_type, size, uploaded_at)
           VALUES (?, 'see', ?, ?, ?, ?, ?, ?)`
        )
        .run(project.id, fileType, file.originalname, dupPath, file.mimetype, file.size, new Date().toISOString());
      uploadedFiles.push(fileInfo.lastInsertRowid);

      await addFileDocument(project.id, {
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
      addPastedTextDocument(project.id, {
        kind: "text",
        label: block.label?.trim() || "Pasted note",
        content: block.content.trim(),
      });
    }

    if (req.files?.length || textBlocks.length) {
      regenerateProjectPlan(project);
    }

    res.status(201).json({ project, uploadedFileIds: uploadedFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to process intake" });
  }
});

export default router;

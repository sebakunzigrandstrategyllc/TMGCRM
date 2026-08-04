import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db, logActivity } from "../db/db.js";
import { generateProjectId } from "../utils/projectId.js";
import { generateIntakeSummary } from "../utils/ai.js";
import { ensureProjectScaffold } from "../utils/stageEntries.js";
import { ensureProjectFolders, duplicateIntoTypeFolder, projectDir } from "../utils/storage.js";
import { MIME_TO_FILE_TYPE } from "../constants.js";

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

router.post(
  "/",
  upload.fields([
    { name: "readAiTranscriptFile", maxCount: 1 },
    { name: "emailThreadFile", maxCount: 1 },
  ]),
  (req, res) => {
    const { clientName, contactInfo, readAiTranscriptLink, notes } = req.body;
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({ error: "clientName is required" });
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

    // Handle uploaded intake files: save into project's _uploads and duplicate into type folder.
    const uploadedFiles = [];
    for (const field of ["readAiTranscriptFile", "emailThreadFile"]) {
      const fileArr = req.files?.[field];
      if (!fileArr?.length) continue;
      const file = fileArr[0];
      const fileType = MIME_TO_FILE_TYPE(file.mimetype, file.originalname);
      const primaryDir = path.join(projectDir(projectId), "_uploads");
      fs.mkdirSync(primaryDir, { recursive: true });
      const primaryPath = path.join(primaryDir, file.originalname);
      fs.copyFileSync(file.path, primaryPath);
      const dupPath = duplicateIntoTypeFolder(projectId, file.path, fileType, file.originalname);
      fs.unlinkSync(file.path);

      const info = db
        .prepare(
          `INSERT INTO files (project_id, column_key, file_type, original_name, stored_path, mime_type, size, uploaded_at)
           VALUES (?, 'see', ?, ?, ?, ?, ?, ?)`
        )
        .run(projectId, fileType, file.originalname, dupPath, file.mimetype, file.size, now);
      uploadedFiles.push(info.lastInsertRowid);
    }

    // Stub AI-generated first-draft See / Understand summary.
    const { seeDraft, understandDraft } = generateIntakeSummary({
      clientName,
      contactInfo,
      readAiTranscriptLink,
      notes,
    });

    const contactDetails = [`Client: ${clientName.trim()}`, contactInfo ? `Contact: ${contactInfo}` : null]
      .filter(Boolean)
      .join("\n");

    const setAiDraft = db.prepare(
      `UPDATE stage_entries SET ai_draft = ?, human_edit = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`
    );
    setAiDraft.run(contactDetails, contactDetails, now, projectId, "contact_details");
    db.prepare(`UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`).run(
      seeDraft,
      now,
      projectId,
      "see"
    );
    db.prepare(`UPDATE stage_entries SET ai_draft = ?, updated_at = ? WHERE project_id = ? AND column_key = ?`).run(
      understandDraft,
      now,
      projectId,
      "understand"
    );

    const insertVersion = db.prepare(
      `INSERT INTO stage_entry_versions (project_id, column_key, version_type, content, created_at)
       VALUES (?, ?, 'ai_draft', ?, ?)`
    );
    insertVersion.run(projectId, "contact_details", contactDetails, now);
    insertVersion.run(projectId, "see", seeDraft, now);
    insertVersion.run(projectId, "understand", understandDraft, now);

    logActivity(projectId, "project_created", null, { clientName });
    logActivity(projectId, "ai_draft_generated", "see", { source: "intake" });
    logActivity(projectId, "ai_draft_generated", "understand", { source: "intake" });

    const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId);
    res.status(201).json({ project, uploadedFileIds: uploadedFiles });
  }
);

export default router;

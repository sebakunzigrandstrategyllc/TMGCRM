import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db, logActivity } from "../db/db.js";
import { isColumnUnlocked } from "../utils/stageEntries.js";
import { regenerateProjectPlan } from "../utils/planEngine.js";
import { ensureProjectFolders, duplicateIntoTypeFolder, projectDir } from "../utils/storage.js";
import { addFileDocument, addPastedTextDocument, deleteIntakeDocument, listIntakeDocuments } from "../utils/intakeDocuments.js";
import { isSupportedIntakeFile, SUPPORTED_INTAKE_LABEL } from "../utils/textExtraction.js";
import { MIME_TO_FILE_TYPE } from "../constants.js";

const router = Router({ mergeParams: true });
const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

function requireProject(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

// See is always unlocked (it's the second column, gated only behind Contact Details which
// never requires approval), so this guard mainly protects against a hypothetical future
// reordering rather than anything reachable today.
function requireSeeUnlocked(req, res, project) {
  if (!isColumnUnlocked(project.id, "see")) {
    res.status(423).json({ error: "See is locked." });
    return false;
  }
  return true;
}

router.get("/", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  res.json(listIntakeDocuments(project.id));
});

// Add more source material after intake — text pasted directly, or an uploaded text-based file
// (PDF or plain text; audio/video/images are rejected, this is a text-only intake channel).
// Either way, this re-runs the plan cascade so See's draft (and everything downstream) picks
// up the new material immediately.
router.post("/", upload.single("file"), async (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireSeeUnlocked(req, res, project)) return;

  try {
    if (req.file) {
      if (!isSupportedIntakeFile(req.file.mimetype, req.file.originalname)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: `Intake only accepts text-based documents (${SUPPORTED_INTAKE_LABEL}) — audio, video, and images aren't analyzed here.`,
        });
      }

      const fileType = MIME_TO_FILE_TYPE(req.file.mimetype, req.file.originalname);
      const primaryDir = path.join(projectDir(project.id), "_uploads", "see");
      fs.mkdirSync(primaryDir, { recursive: true });
      fs.copyFileSync(req.file.path, path.join(primaryDir, req.file.originalname));
      const dupPath = duplicateIntoTypeFolder(project.id, req.file.path, fileType, req.file.originalname);

      const now = new Date().toISOString();
      const fileInfo = db
        .prepare(
          `INSERT INTO files (project_id, column_key, file_type, original_name, stored_path, mime_type, size, uploaded_at)
           VALUES (?, 'see', ?, ?, ?, ?, ?, ?)`
        )
        .run(project.id, fileType, req.file.originalname, dupPath, req.file.mimetype, req.file.size, now);

      const doc = await addFileDocument(project.id, {
        kind: "file",
        label: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        fileId: fileInfo.lastInsertRowid,
      });
      fs.unlinkSync(req.file.path);

      regenerateProjectPlan(project);
      return res.status(201).json(doc);
    }

    const { label, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "content is required for a pasted document" });

    const doc = addPastedTextDocument(project.id, {
      kind: "text",
      label: label?.trim() || "Pasted note",
      content: content.trim(),
    });
    regenerateProjectPlan(project);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to add intake document" });
  }
});

router.delete("/:docId", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireSeeUnlocked(req, res, project)) return;

  deleteIntakeDocument(project.id, req.params.docId);
  regenerateProjectPlan(project);
  res.status(204).end();
});

export default router;

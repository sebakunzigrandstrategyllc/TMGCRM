import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db, logActivity } from "../db/db.js";
import { MIME_TO_FILE_TYPE, COLUMN_KEYS } from "../constants.js";
import { duplicateIntoTypeFolder, projectDir } from "../utils/storage.js";

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

// Upload a file anywhere in the app (attached to a project, optionally to a column).
// It is duplicated into the project's matching type folder (Pictures/Video/Audio/Documents).
router.post("/projects/:id/files", upload.single("file"), (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const { columnKey } = req.body;
  if (columnKey && !COLUMN_KEYS.includes(columnKey)) {
    return res.status(400).json({ error: "Unknown column" });
  }

  const fileType = MIME_TO_FILE_TYPE(req.file.mimetype, req.file.originalname);

  const primaryDir = path.join(projectDir(project.id), "_uploads", columnKey || "general");
  fs.mkdirSync(primaryDir, { recursive: true });
  fs.copyFileSync(req.file.path, path.join(primaryDir, req.file.originalname));

  const dupPath = duplicateIntoTypeFolder(project.id, req.file.path, fileType, req.file.originalname);
  fs.unlinkSync(req.file.path);

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO files (project_id, column_key, file_type, original_name, stored_path, mime_type, size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(project.id, columnKey || null, fileType, req.file.originalname, dupPath, req.file.mimetype, req.file.size, now);

  logActivity(project.id, "file_uploaded", columnKey || null, {
    fileType,
    originalName: req.file.originalname,
  });

  const file = db.prepare(`SELECT * FROM files WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json(serializeFile(file));
});

router.get("/projects/:id/files", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { fileType, columnKey } = req.query;
  let sql = `SELECT * FROM files WHERE project_id = ?`;
  const params = [project.id];
  if (fileType) {
    sql += ` AND file_type = ?`;
    params.push(fileType);
  }
  if (columnKey) {
    sql += ` AND column_key = ?`;
    params.push(columnKey);
  }
  sql += ` ORDER BY uploaded_at DESC`;

  const files = db.prepare(sql).all(...params);
  res.json(files.map(serializeFile));
});

router.get("/files/:fileId/download", (req, res) => {
  const file = db.prepare(`SELECT * FROM files WHERE id = ?`).get(req.params.fileId);
  if (!file) return res.status(404).json({ error: "File not found" });
  if (!fs.existsSync(file.stored_path)) return res.status(404).json({ error: "File missing on disk" });
  res.download(file.stored_path, file.original_name);
});

router.delete("/files/:fileId", (req, res) => {
  const file = db.prepare(`SELECT * FROM files WHERE id = ?`).get(req.params.fileId);
  if (!file) return res.status(404).json({ error: "File not found" });
  db.prepare(`DELETE FROM files WHERE id = ?`).run(file.id);
  if (fs.existsSync(file.stored_path)) fs.unlinkSync(file.stored_path);
  logActivity(file.project_id, "file_deleted", file.column_key, { originalName: file.original_name });
  res.status(204).end();
});

function serializeFile(f) {
  return {
    id: f.id,
    projectId: f.project_id,
    originalName: f.original_name,
    fileType: f.file_type,
    columnKey: f.column_key,
    mimeType: f.mime_type,
    size: f.size,
    uploadedAt: f.uploaded_at,
    downloadUrl: `/api/files/${f.id}/download`,
  };
}

export default router;

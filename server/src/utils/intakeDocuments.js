import { db, logActivity } from "../db/db.js";
import { extractText } from "./textExtraction.js";

export function listIntakeDocuments(projectId) {
  return db
    .prepare(`SELECT * FROM intake_documents WHERE project_id = ? ORDER BY created_at ASC`)
    .all(projectId);
}

// What the See draft generator actually reads: label + content for every document that
// yielded usable text, in the order they were added.
export function getIntakeDocumentsContent(projectId) {
  return db
    .prepare(
      `SELECT label, kind, content FROM intake_documents
       WHERE project_id = ? AND extraction_status = 'ok' AND content IS NOT NULL
       ORDER BY created_at ASC`
    )
    .all(projectId);
}

export function addPastedTextDocument(projectId, { kind = "text", label, content }) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO intake_documents (project_id, kind, label, content, extraction_status, created_at)
       VALUES (?, ?, ?, ?, 'ok', ?)`
    )
    .run(projectId, kind, label, content, now);
  logActivity(projectId, "intake_document_added", "see", { kind, label });
  return db.prepare(`SELECT * FROM intake_documents WHERE id = ?`).get(info.lastInsertRowid);
}

// Extracts text from an already-saved file (its physical copy in the project's type folder)
// and records it as an intake document. `fileId` links back to the files table row so the
// two stay associated, but each is independently queryable/deletable.
export async function addFileDocument(projectId, { kind = "file", label, filePath, mimeType, originalName, fileId }) {
  const { content, status } = await extractText(filePath, mimeType, originalName);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO intake_documents (project_id, kind, label, content, extraction_status, file_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(projectId, kind, label, content, status, fileId || null, now);
  logActivity(projectId, "intake_document_added", "see", { kind, label, extractionStatus: status });
  return db.prepare(`SELECT * FROM intake_documents WHERE id = ?`).get(info.lastInsertRowid);
}

export function deleteIntakeDocument(projectId, docId) {
  db.prepare(`DELETE FROM intake_documents WHERE id = ? AND project_id = ?`).run(docId, projectId);
  logActivity(projectId, "intake_document_removed", "see", { docId });
}

import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { api } from "../api.js";

// Lets the consultant add more intake source material after the project's been created —
// pasted text or an uploaded file — and see what's already there. Everything added here
// feeds directly into See's AI draft (and cascades downstream) the moment it's saved.
export default function IntakeDocumentsModal({ open, onClose, projectId, onChange }) {
  const [documents, setDocuments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("text");
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    api.getIntakeDocuments(projectId).then((docs) => {
      setDocuments(docs);
      setLoaded(true);
    });

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const addDocument = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "file" && !file) {
      setError("Choose a file first.");
      return;
    }
    if (mode === "text" && !content.trim()) {
      setError("Enter some text first.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "file") {
        await api.addIntakeFileDocument(projectId, file);
        setFile(null);
      } else {
        await api.addIntakeTextDocument(projectId, { label: label.trim() || "Pasted note", content: content.trim() });
        setLabel("");
        setContent("");
      }
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (docId) => {
    await api.deleteIntakeDocument(projectId, docId);
    await load();
    onChange?.();
  };

  return (
    <Modal open={open} onClose={onClose} title="Intake Documents" wide>
      <p className="mb-3 text-xs text-gray-500">
        Everything here feeds See's AI draft, and cascades downstream from there. Text only — pasted notes,
        transcripts, PDFs, plain-text files, or screenshots/photos of documents (PNG, JPEG — read via OCR). Audio
        and video files aren't accepted (no transcription) — attach those to a column directly instead if you just
        need them stored.
      </p>

      <div className="mb-4 border border-black/20 p-2">
        <div className="mb-2 flex gap-3 text-xs">
          <button
            type="button"
            className={mode === "text" ? "font-semibold underline" : "text-gray-500 underline"}
            onClick={() => setMode("text")}
          >
            Paste text
          </button>
          <button
            type="button"
            className={mode === "file" ? "font-semibold underline" : "text-gray-500 underline"}
            onClick={() => setMode("file")}
          >
            Upload file
          </button>
        </div>
        <form onSubmit={addDocument} className="space-y-2">
          {mode === "text" ? (
            <>
              <input
                className="input text-sm"
                placeholder="Label (e.g. Follow-up call)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <textarea
                className="input h-20 resize-none text-sm"
                placeholder="Paste transcript, email thread, or notes here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </>
          ) : (
            <input
              className="input text-sm"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.eml,.csv,.vtt,.srt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          )}
          {error && <p className="text-xs font-semibold text-black">⚠ {error}</p>}
          <button className="btn-primary text-xs" type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add document"}
          </button>
        </form>
      </div>

      {!loaded ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-400">No intake documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="border-b border-black/10 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{doc.label}</span>
                <div className="flex shrink-0 items-center gap-2 text-[10px] text-gray-500">
                  <span className="uppercase">{doc.kind}</span>
                  {doc.extraction_status !== "ok" && (
                    <span className="border border-black/20 px-1 uppercase">{doc.extraction_status}</span>
                  )}
                  <button type="button" className="underline hover:text-black" onClick={() => remove(doc.id)}>
                    Remove
                  </button>
                </div>
              </div>
              {doc.content && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                  {doc.content.slice(0, 300)}
                  {doc.content.length > 300 ? "…" : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

let nextRowId = 0;

export default function IntakeForm() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [readAiTranscriptLink, setReadAiTranscriptLink] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addTextRow = () => setDocuments((docs) => [...docs, { id: ++nextRowId, type: "text", label: "", content: "" }]);
  const addFileRow = () => setDocuments((docs) => [...docs, { id: ++nextRowId, type: "file", label: "", file: null }]);
  const removeRow = (id) => setDocuments((docs) => docs.filter((d) => d.id !== id));
  const updateRow = (id, patch) => setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    const emptyFileRow = documents.find((d) => d.type === "file" && !d.file);
    if (emptyFileRow) {
      setError("Remove any file rows you haven't chosen a file for, or pick one.");
      return;
    }
    const emptyTextRow = documents.find((d) => d.type === "text" && !d.content.trim());
    if (emptyTextRow) {
      setError("Remove any pasted-text rows you haven't filled in, or add content.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("clientName", clientName);
      formData.append("contactInfo", contactInfo);
      formData.append("readAiTranscriptLink", readAiTranscriptLink);
      formData.append("notes", notes);

      documents.filter((d) => d.type === "file").forEach((d) => formData.append("documents", d.file));

      const textBlocks = documents
        .filter((d) => d.type === "text")
        .map((d) => ({ label: d.label, content: d.content }));
      if (textBlocks.length > 0) formData.append("textBlocks", JSON.stringify(textBlocks));

      const { project } = await api.submitIntake(formData);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold uppercase tracking-wider">New Client Intake</h1>
      <form onSubmit={submit} className="card space-y-4 p-4">
        <div>
          <label className="label">Client name *</label>
          <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Contact info</label>
          <input
            className="input"
            placeholder="Email, phone, etc."
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Read AI transcript link</label>
          <input
            className="input"
            placeholder="https://read.ai/..."
            value={readAiTranscriptLink}
            onChange={(e) => setReadAiTranscriptLink(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input h-24 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="border-t border-black/10 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <label className="label">Intake documents</label>
            <div className="flex gap-2">
              <button type="button" className="text-xs underline" onClick={addTextRow}>
                + Paste text
              </button>
              <button type="button" className="text-xs underline" onClick={addFileRow}>
                + Upload file
              </button>
            </div>
          </div>
          <p className="mb-2 text-[11px] text-gray-500">
            Add as many as you like — transcripts, call notes, PDFs, plain text. PDF and plain-text content is
            actually read and analyzed; other file types (audio/video, images) are stored as attachments only.
          </p>

          {documents.length === 0 && (
            <p className="border border-dashed border-black/20 p-3 text-center text-xs text-gray-400">
              No documents added yet.
            </p>
          )}

          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-black/20 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">
                    {doc.type === "text" ? "Pasted text" : "File upload"}
                  </span>
                  <button type="button" className="text-[11px] text-gray-400 underline hover:text-black" onClick={() => removeRow(doc.id)}>
                    Remove
                  </button>
                </div>
                <input
                  className="input mb-1 text-sm"
                  placeholder={doc.type === "text" ? "Label (e.g. Kickoff call summary)" : "Label (optional, defaults to filename)"}
                  value={doc.label}
                  onChange={(e) => updateRow(doc.id, { label: e.target.value })}
                />
                {doc.type === "text" ? (
                  <textarea
                    className="input h-20 resize-none text-sm"
                    placeholder="Paste transcript, email thread, or notes here..."
                    value={doc.content}
                    onChange={(e) => updateRow(doc.id, { content: e.target.value })}
                  />
                ) : (
                  <input
                    className="input text-sm"
                    type="file"
                    accept=".pdf,.txt,.md,.eml,.csv,.vtt,.srt,.doc,.docx,audio/*,video/*,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      updateRow(doc.id, { file, label: doc.label || file?.name || "" });
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-black">⚠ {error}</p>}

        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting ? "Creating project..." : "Submit intake & create project"}
        </button>
        <p className="text-xs text-gray-500">
          Submitting creates a numbered project and analyzes everything above into a first-draft See summary — the
          full See-to-Sustain outline gets tentatively filled in from there.
        </p>
      </form>
    </div>
  );
}

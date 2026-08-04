import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function IntakeForm() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [readAiTranscriptLink, setReadAiTranscriptLink] = useState("");
  const [readAiTranscriptFile, setReadAiTranscriptFile] = useState(null);
  const [emailThreadFile, setEmailThreadFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("clientName", clientName);
      formData.append("contactInfo", contactInfo);
      formData.append("readAiTranscriptLink", readAiTranscriptLink);
      formData.append("notes", notes);
      if (readAiTranscriptFile) formData.append("readAiTranscriptFile", readAiTranscriptFile);
      if (emailThreadFile) formData.append("emailThreadFile", emailThreadFile);

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
          <label className="label">Read AI transcript file (optional)</label>
          <input className="input" type="file" onChange={(e) => setReadAiTranscriptFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="label">Email thread upload</label>
          <input className="input" type="file" onChange={(e) => setEmailThreadFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input h-28 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm font-semibold text-black">⚠ {error}</p>}

        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting ? "Creating project..." : "Submit intake & create project"}
        </button>
        <p className="text-xs text-gray-500">
          Submitting creates a numbered project and auto-generates a first-draft See/Understand summary.
        </p>
      </form>
    </div>
  );
}

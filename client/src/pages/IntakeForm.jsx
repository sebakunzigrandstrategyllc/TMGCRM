import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";

let nextRowId = 0;

const CSV_TEMPLATE = `clientName,email,phone,company,notes,readAiTranscriptLink,proposalAgreed
Acme Co,jane@acme.com,555-0100,Acme Inc,Referred by an existing client,,false
Beta LLC,bob@beta.com,555-0101,Beta LLC,Proposal already signed and deposit received,https://read.ai/x/123,true
`;

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "summs-intake-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function IntakeForm() {
  const [mode, setMode] = useState("single");

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-wider">New Client Intake</h1>
        <div className="flex border border-black text-xs font-semibold uppercase">
          <button
            type="button"
            className={`px-3 py-1.5 ${mode === "single" ? "bg-black text-white" : "hover:bg-gray-100"}`}
            onClick={() => setMode("single")}
          >
            Single client
          </button>
          <button
            type="button"
            className={`border-l border-black px-3 py-1.5 ${mode === "bulk" ? "bg-black text-white" : "hover:bg-gray-100"}`}
            onClick={() => setMode("bulk")}
          >
            Bulk (CSV)
          </button>
        </div>
      </div>

      {mode === "single" ? <SingleIntakeForm /> : <BulkIntakeForm />}
    </div>
  );
}

function SingleIntakeForm() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [readAiTranscriptLink, setReadAiTranscriptLink] = useState("");
  const [notes, setNotes] = useState("");
  const [proposalAgreed, setProposalAgreed] = useState(false);
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
      formData.append("company", company);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("readAiTranscriptLink", readAiTranscriptLink);
      formData.append("notes", notes);
      formData.append("proposalAgreed", proposalAgreed ? "true" : "false");

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
    <form onSubmit={submit} className="card space-y-5 p-4">
      <div>
        <div className="label mb-2">Client details</div>
        <div className="space-y-2">
          <input
            className="input"
            placeholder="Client name *"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="label mb-2">Context</div>
        <div className="space-y-2">
          <input
            className="input"
            placeholder="Read AI transcript link (optional)"
            value={readAiTranscriptLink}
            onChange={(e) => setReadAiTranscriptLink(e.target.value)}
          />
          <textarea
            className="input h-20 resize-none"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-start gap-2 border border-black/20 bg-gray-50 p-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5 accent-black"
          checked={proposalAgreed}
          onChange={(e) => setProposalAgreed(e.target.checked)}
        />
        <span>
          <strong>This client already has an agreed proposal and accepted payment.</strong> See, Understand, and
          Proposal will be auto-approved immediately, unlocking Make, Milestones, Payment Schedule, and the
          Calendar right away.
        </span>
      </label>

      <div className="border-t border-black/10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Intake documents</span>
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
          Text only — pasted notes, transcripts, PDFs, plain-text files, or screenshots/photos of documents (PNG,
          JPEG — read via OCR). Everything here is actually read and analyzed. Audio and video aren't accepted (no
          transcription).
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
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.eml,.csv,.vtt,.srt"
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
  );
}

function BulkIntakeForm() {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.submitBulkIntake(file);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card space-y-4 p-4">
      <p className="text-sm text-gray-600">
        Create several projects at once from a spreadsheet export. Each row becomes its own project — same fields
        as the single-client form, minus intake documents (add those per-project afterward from the See column).
      </p>

      <div className="border border-black/20 bg-gray-50 p-3 text-xs">
        <div className="mb-1 font-semibold uppercase text-gray-500">Expected columns</div>
        <code className="block break-all text-[11px] text-gray-700">
          clientName, email, phone, company, notes, readAiTranscriptLink, proposalAgreed
        </code>
        <p className="mt-1 text-gray-500">
          Only <code>clientName</code> is required. <code>proposalAgreed</code> accepts true/yes/1 to auto-approve
          that row's See/Understand/Proposal, same as the single-client checkbox.
        </p>
        <button type="button" className="mt-2 text-[11px] underline" onClick={downloadCsvTemplate}>
          Download CSV template
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input className="input" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {error && <p className="text-sm font-semibold text-black">⚠ {error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting ? "Importing..." : "Import CSV"}
        </button>
      </form>

      {result && (
        <div className="border-t border-black/10 pt-3 text-sm">
          <p className="mb-2 font-semibold">
            {result.created.length} project{result.created.length === 1 ? "" : "s"} created
            {result.errors.length > 0 ? `, ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} failed` : ""}.
          </p>
          {result.created.length > 0 && (
            <ul className="mb-2 space-y-0.5 text-xs">
              {result.created.map((c) => (
                <li key={c.id} className="flex justify-between border-b border-black/10 py-0.5">
                  <span>
                    Row {c.row}: {c.clientName}
                  </span>
                  <Link className="underline" to={`/projects/${c.id}`}>
                    {c.id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <ul className="space-y-0.5 text-xs text-gray-600">
              {result.errors.map((e, i) => (
                <li key={i}>
                  ⚠ Row {e.row}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

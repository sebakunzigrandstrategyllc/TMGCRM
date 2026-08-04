import { useEffect, useState } from "react";
import InfoIcon from "./InfoIcon.jsx";
import ApprovalGate from "./ApprovalGate.jsx";
import FileUpload from "./FileUpload.jsx";
import DiffView from "./DiffView.jsx";
import Modal from "./Modal.jsx";
import { api } from "../api.js";

const COLUMN_INFO = {
  contact_details: "Client name, contact information, and how they were sourced. Always editable.",
  see: "First-draft summary generated from intake materials (transcript, email thread, notes). Edit and approve to unlock Understand.",
  understand: "Interpretation of the client's underlying goals, constraints, and success criteria.",
  proposal: "The scope, deliverables, and terms proposed to the client. Approving this unlocks Milestones, Payment Schedule, and the internal Calendar.",
  make: "The execution plan — 'This is the plan' for building/implementing the work.",
  manage: "The plan for ongoing management and oversight once delivered.",
  sustain: "The plan for long-term sustainability and handoff.",
  final_notes: "Final notes and follow-up recommendations for the engagement.",
};

export default function StageColumn({ projectId, column, onChange }) {
  const [draft, setDraft] = useState(column.humanEdit || column.aiDraft || "");
  const [dirty, setDirty] = useState(false);

  // Re-sync from the server whenever this column's content changes underneath us
  // (e.g. after "Regenerate AI draft") as long as the user hasn't made local unsaved edits.
  useEffect(() => {
    if (!dirty) setDraft(column.humanEdit || column.aiDraft || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column.humanEdit, column.aiDraft]);
  const [saving, setSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [history, setHistory] = useState(null);

  const locked = !column.unlocked;

  const save = async () => {
    setSaving(true);
    try {
      await api.saveColumnEdit(projectId, column.key, draft);
      setDirty(false);
      onChange?.();
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    await api.regenerateDraft(projectId, column.key);
    onChange?.();
  };

  const openDiff = async () => {
    const h = await api.getColumnHistory(projectId, column.key);
    setHistory(h);
    setShowDiff(true);
  };

  const setApproval = async (approved, notes) => {
    await api.setApproval(projectId, column.key, approved, notes);
    onChange?.();
  };

  return (
    <div className="flex w-72 shrink-0 flex-col border border-black bg-white">
      <div className="flex items-start justify-between gap-1 border-b border-black bg-black px-2 py-2 text-white">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">{column.label}</div>
          {column.tagline && <div className="text-[10px] italic text-gray-300">{column.tagline}</div>}
        </div>
        <InfoIcon title={column.label}>
          <p>{COLUMN_INFO[column.key]}</p>
        </InfoIcon>
      </div>

      {locked ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center text-xs text-gray-400">
          <span>Locked</span>
          <span>Approve the previous column to unlock.</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-gray-500">Human edit</span>
            <div className="flex gap-1">
              <button type="button" className="text-[10px] underline" onClick={openDiff}>
                Draft vs. edit
              </button>
              <button type="button" className="text-[10px] underline" onClick={regenerate}>
                Regenerate AI draft
              </button>
            </div>
          </div>
          <textarea
            className="input h-32 resize-none text-xs"
            value={draft}
            placeholder={column.aiDraft ? "" : "No AI draft yet — write directly or regenerate."}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
          />
          <button
            type="button"
            className={dirty ? "btn-primary text-[11px]" : "btn-disabled text-[11px]"}
            disabled={!dirty || saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save edit"}
          </button>

          <FileUpload
            projectId={projectId}
            columnKey={column.key}
            files={column.files}
            onUploaded={() => onChange?.()}
            onDeleted={() => onChange?.()}
          />
        </div>
      )}

      {column.requiresApproval && !locked && (
        <ApprovalGate approval={column.approval} onSubmit={setApproval} />
      )}

      <Modal open={showDiff} onClose={() => setShowDiff(false)} title={`${column.label} — AI draft vs. edit`} wide>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="mb-1 font-semibold uppercase text-gray-500">AI draft</div>
            <div className="whitespace-pre-wrap border border-black/10 p-2">{column.aiDraft || "(none)"}</div>
          </div>
          <div>
            <div className="mb-1 font-semibold uppercase text-gray-500">Human edit</div>
            <div className="whitespace-pre-wrap border border-black/10 p-2">{column.humanEdit || "(none)"}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Inline diff</div>
          <DiffView aiDraft={column.aiDraft} humanEdit={column.humanEdit} />
        </div>
        {history?.versions?.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Version history</div>
            <ul className="space-y-1 text-[11px]">
              {history.versions.map((v) => (
                <li key={v.id} className="border-b border-black/10 pb-1">
                  <span className="font-semibold">{v.version_type}</span> —{" "}
                  {new Date(v.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}

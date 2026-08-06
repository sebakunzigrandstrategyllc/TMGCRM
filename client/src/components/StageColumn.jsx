import { useEffect, useState } from "react";
import InfoIcon from "./InfoIcon.jsx";
import ApprovalGate from "./ApprovalGate.jsx";
import FileUpload from "./FileUpload.jsx";
import DiffView from "./DiffView.jsx";
import Modal from "./Modal.jsx";
import TimelinePanel from "./TimelinePanel.jsx";
import { api } from "../api.js";

const COLUMN_INFO = {
  contact_details: "Client name, contact information, and how they were sourced. Always editable.",
  see: "First-draft summary generated from intake materials (transcript, email thread, notes). Edit and approve to unlock Understand — approving also maps out this project's individual journey timeline below.",
  understand: "AI-generated PRD-style breakdown of the project — what we understand and what's needed — built from the reviewed See content. There's no manual edit field here; regenerate it or approve as-is.",
  proposal: "The scope, deliverables, and terms proposed to the client. Approving this unlocks Milestones, Payment Schedule, the internal Calendar, and a fresh execution timeline for Make.",
  make: "The execution plan — 'This is the plan' for building/implementing the work. Once Proposal is approved, a new execution timeline is generated here, grounded in the approved scope.",
  manage: "The plan for ongoing management and oversight once delivered.",
  sustain: "The plan for long-term sustainability and handoff.",
  final_notes: "Final notes and follow-up recommendations for the engagement.",
};

export default function StageColumn({ projectId, column, timeline, onChange }) {
  const isAiOnly = !!column.aiGenerated;

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
  const [generatingTimeline, setGeneratingTimeline] = useState(false);

  const locked = !column.unlocked;
  const showTimeline = column.key === "see" || column.key === "make";

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

  const generateTimeline = async () => {
    setGeneratingTimeline(true);
    try {
      await api.generateTimeline(projectId, column.key);
      onChange?.();
    } finally {
      setGeneratingTimeline(false);
    }
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
          {isAiOnly ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-gray-500">AI-generated breakdown</span>
                <button type="button" className="text-[10px] underline" onClick={regenerate}>
                  Regenerate
                </button>
              </div>
              <div className="h-32 overflow-y-auto whitespace-pre-wrap border border-black bg-gray-50 p-2 text-xs">
                {column.aiDraft || "Not generated yet — approve See to generate this breakdown."}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <FileUpload
            projectId={projectId}
            columnKey={column.key}
            files={column.files}
            onUploaded={() => onChange?.()}
            onDeleted={() => onChange?.()}
          />

          {showTimeline && (
            <TimelinePanel
              title={column.key === "see" ? "Journey timeline" : "Execution timeline"}
              timeline={timeline}
              onGenerate={generateTimeline}
              generateLabel={timeline ? "Regenerate" : "Analyze & generate"}
              loading={generatingTimeline}
              emptyHint={
                column.key === "see"
                  ? "Generated automatically once See is approved, or generate a preview now."
                  : "Generated automatically once Proposal is approved."
              }
            />
          )}
        </div>
      )}

      {column.requiresApproval && !locked && (
        <ApprovalGate approval={column.approval} onSubmit={setApproval} />
      )}

      {!isAiOnly && (
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
      )}
    </div>
  );
}

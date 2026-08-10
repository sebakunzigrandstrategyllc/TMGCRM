import { useEffect, useState } from "react";
import InfoIcon from "./InfoIcon.jsx";
import ApprovalGate from "./ApprovalGate.jsx";
import FileUpload from "./FileUpload.jsx";
import DiffView from "./DiffView.jsx";
import Modal from "./Modal.jsx";
import TimelinePanel from "./TimelinePanel.jsx";
import HumanEditField from "./HumanEditField.jsx";
import TentativeMilestonesPreview from "./TentativeMilestonesPreview.jsx";
import ChecklistModal from "./ChecklistModal.jsx";
import IntakeDocumentsModal from "./IntakeDocumentsModal.jsx";
import { api } from "../api.js";

const COLUMN_INFO = {
  contact_details: "Client name, contact information, and how they were sourced. Always editable.",
  see: "First-draft summary generated from intake materials (transcript, email thread, notes). Any edit here cascades forward — Understand, Proposal, Make, Manage, Sustain, and Final Notes all re-derive their tentative drafts from what you save. Approving See also maps out this project's individual journey timeline below.",
  understand: "AI-generated PRD-style breakdown of the project — what we understand and what's needed — built from the reviewed See content, and kept up to date automatically as See changes. There's no manual edit field here; regenerate it or approve as-is.",
  proposal: "The scope, deliverables, and terms proposed to the client. Editing this cascades forward into Make, Manage, Sustain, and Final Notes. Approving it unlocks Milestones, Payment Schedule, the internal Calendar, and finalizes the execution timeline for Make.",
  make: "The execution plan — 'This is the plan' for building/implementing the work. A tentative execution timeline and milestones exist here from early on, and firm up once Proposal is approved. Editing this cascades into Manage, Sustain, and Final Notes.",
  manage: "The plan for ongoing management and oversight once delivered — drafted from Make, and updated automatically when Make changes.",
  sustain: "The plan for long-term sustainability and handoff — drafted from Manage, and updated automatically when Manage changes.",
  final_notes: "Final notes and follow-up recommendations for the engagement — drafted from Sustain, and updated automatically when Sustain changes.",
};

export default function StageColumn({ projectId, column, timeline, onChange }) {
  const isAiOnly = !!column.aiGenerated;

  const [draft, setDraft] = useState(column.humanEdit || column.aiDraft || "");
  const [dirty, setDirty] = useState(false);

  // Re-sync from the server whenever this column's content changes underneath us
  // (e.g. after "Regenerate AI draft", or a cascade triggered by editing an earlier column)
  // as long as the user hasn't made local unsaved edits.
  useEffect(() => {
    if (!dirty) setDraft(column.humanEdit || column.aiDraft || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column.humanEdit, column.aiDraft]);
  const [saving, setSaving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [history, setHistory] = useState(null);
  const [generatingTimeline, setGeneratingTimeline] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showIntakeDocuments, setShowIntakeDocuments] = useState(false);

  const locked = !column.unlocked;
  const showTimeline = column.key === "see" || column.key === "make";
  const showMilestonesPreview = column.key === "make";
  const showIntakeDocsButton = column.key === "see";

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
        <div className="flex flex-1 flex-col gap-2 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-gray-400">Tentative preview</span>
            <span className="text-[10px] font-semibold uppercase text-gray-400">Locked</span>
          </div>
          <div className="h-32 overflow-y-auto whitespace-pre-wrap border border-dashed border-black/25 bg-gray-50 p-2 text-xs text-gray-500">
            {column.aiDraft || "Nothing generated yet — this fills in as earlier columns are edited."}
          </div>
          <p className="text-[10px] text-gray-400">Approve the previous column to review and edit this yourself.</p>

          {showTimeline && (
            <TimelinePanel
              title={column.key === "see" ? "Journey timeline" : "Execution timeline"}
              timeline={timeline}
              emptyHint="Not generated yet."
            />
          )}
          {showMilestonesPreview && (
            <TentativeMilestonesPreview projectId={projectId} refreshKey={timeline?.generated_at} />
          )}
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
              <div className="flex items-center justify-end gap-2">
                {showIntakeDocsButton && (
                  <button type="button" className="text-[10px] underline" onClick={() => setShowIntakeDocuments(true)}>
                    Intake documents
                  </button>
                )}
                <button type="button" className="text-[10px] underline" onClick={openDiff}>
                  Draft vs. edit
                </button>
                <button type="button" className="text-[10px] underline" onClick={regenerate}>
                  Regenerate AI draft
                </button>
              </div>
              <HumanEditField
                value={draft}
                onChange={(v) => {
                  setDraft(v);
                  setDirty(true);
                }}
                onSave={save}
                saving={saving}
                dirty={dirty}
                updatedAt={column.updatedAt}
                placeholder={column.aiDraft ? "" : "No AI draft yet — write directly or regenerate."}
              />
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
                  : "Generated automatically as Proposal takes shape."
              }
            />
          )}
          {showMilestonesPreview && (
            <TentativeMilestonesPreview projectId={projectId} refreshKey={timeline?.generated_at} />
          )}
        </div>
      )}

      {column.requiresApproval && !locked && (
        <ApprovalGate
          approval={column.approval}
          onSubmit={setApproval}
          checklist={column.checklist}
          onOpenChecklist={() => setShowChecklist(true)}
        />
      )}

      {showIntakeDocsButton && (
        <IntakeDocumentsModal
          open={showIntakeDocuments}
          onClose={() => setShowIntakeDocuments(false)}
          projectId={projectId}
          onChange={() => onChange?.()}
        />
      )}

      {column.requiresApproval && (
        <ChecklistModal
          open={showChecklist}
          onClose={() => setShowChecklist(false)}
          projectId={projectId}
          columnKey={column.key}
          columnLabel={column.label}
          onProgressChange={() => onChange?.()}
        />
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

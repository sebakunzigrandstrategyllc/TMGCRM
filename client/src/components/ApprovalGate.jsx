import { useState } from "react";

export default function ApprovalGate({ approval, onSubmit, disabled, checklist, onOpenChecklist }) {
  const [notes, setNotes] = useState(approval?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const checklistIncomplete = !!checklist && checklist.total > 0 && checklist.checked < checklist.total;

  const handleToggle = async (checked) => {
    setSaving(true);
    setError("");
    try {
      await onSubmit(checked, notes);
    } catch (err) {
      setError(err.message || "Couldn't update approval.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-black/20 bg-gray-50 p-2 text-xs">
      {checklist && checklist.total > 0 && (
        <button
          type="button"
          onClick={onOpenChecklist}
          className="mb-1.5 flex w-full items-center justify-between border border-black/20 bg-white px-1.5 py-1 text-left hover:border-black"
        >
          <span className={checklistIncomplete ? "text-gray-600" : "font-semibold text-black"}>
            Checklist: {checklist.checked}/{checklist.total}
          </span>
          <span className="underline">{checklistIncomplete ? "Open checklist" : "View"}</span>
        </button>
      )}

      <label className={`flex items-center gap-2 font-semibold ${checklistIncomplete && !approval?.approved ? "text-gray-400" : ""}`}>
        <input
          type="checkbox"
          checked={!!approval?.approved}
          disabled={disabled || saving || (checklistIncomplete && !approval?.approved)}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-3.5 w-3.5 accent-black"
        />
        Approved
      </label>
      {checklistIncomplete && !approval?.approved && (
        <div className="mt-0.5 text-[10px] text-gray-500">Complete the checklist above to unlock approval.</div>
      )}
      {approval?.approved && approval?.approvedAt && (
        <div className="mt-1 text-[10px] text-gray-600">
          {new Date(approval.approvedAt).toLocaleString()}
        </div>
      )}
      {error && <div className="mt-1 text-[10px] font-semibold text-black">⚠ {error}</div>}
      <textarea
        className="input mt-1 h-12 resize-none text-xs"
        placeholder="Approval notes..."
        value={notes}
        disabled={disabled || saving}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => approval?.approved && onSubmit(true, notes)}
      />
    </div>
  );
}

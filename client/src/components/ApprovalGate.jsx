import { useState } from "react";

export default function ApprovalGate({ approval, onSubmit, disabled }) {
  const [notes, setNotes] = useState(approval?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleToggle = async (checked) => {
    setSaving(true);
    try {
      await onSubmit(checked, notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-black/20 bg-gray-50 p-2 text-xs">
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          checked={!!approval?.approved}
          disabled={disabled || saving}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-3.5 w-3.5 accent-black"
        />
        Approved
      </label>
      {approval?.approved && approval?.approvedAt && (
        <div className="mt-1 text-[10px] text-gray-600">
          {new Date(approval.approvedAt).toLocaleString()}
        </div>
      )}
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

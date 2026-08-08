import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import InfoIcon from "./InfoIcon.jsx";
import { api } from "../api.js";

// Lists this column's objectives as a checklist — every item must be checked before the
// column can be approved. Each item's "i" icon opens a nested modal (reusing InfoIcon, which
// already renders its own portal-based Modal) with a meticulous step-by-step explanation of
// how to actually accomplish it.
export default function ChecklistModal({ open, onClose, projectId, columnKey, columnLabel, onProgressChange }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = () =>
    api.getChecklist(projectId, columnKey).then((r) => {
      setItems(r.items);
      setLoaded(true);
    });

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, columnKey]);

  const toggle = async (item) => {
    await api.toggleChecklistItem(projectId, item.id, !item.checked);
    await load();
    onProgressChange?.();
  };

  const regenerate = async () => {
    if (!window.confirm("Regenerate this checklist? This clears all checked progress on it.")) return;
    setRegenerating(true);
    try {
      await api.regenerateChecklist(projectId, columnKey);
      await load();
      onProgressChange?.();
    } finally {
      setRegenerating(false);
    }
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

  return (
    <Modal open={open} onClose={onClose} title={`${columnLabel} — Checklist`} wide>
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-xs font-semibold ${allChecked ? "text-black" : "text-gray-500"}`}>
          {checkedCount}/{items.length} complete{allChecked ? " — ready to approve" : ""}
        </span>
        <button type="button" className="text-[11px] underline disabled:text-gray-400" onClick={regenerate} disabled={regenerating}>
          {regenerating ? "Regenerating..." : "Regenerate checklist"}
        </button>
      </div>

      {!loaded ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No checklist generated yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 border-b border-black/10 pb-2">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-black"
                checked={!!item.checked}
                onChange={() => toggle(item)}
              />
              <span className={`flex-1 text-sm ${item.checked ? "text-gray-400 line-through" : ""}`}>{item.title}</span>
              <InfoIcon title={item.title}>
                <div className="whitespace-pre-wrap">{item.detail || "No detail available."}</div>
              </InfoIcon>
            </li>
          ))}
        </ul>
      )}

      {!allChecked && items.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">Every item above must be checked before this column can be approved.</p>
      )}
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function AmendmentPanel({ projectId, columns }) {
  const [amendments, setAmendments] = useState([]);
  const [form, setForm] = useState({ columnKey: columns[0]?.key || "", title: "", description: "", oldValue: "", newValue: "" });
  const [open, setOpen] = useState(false);

  const load = () => api.getAmendments(projectId).then(setAmendments);

  useEffect(() => {
    load();
  }, [projectId]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.createAmendment(projectId, form);
    setForm({ ...form, title: "", description: "", oldValue: "", newValue: "" });
    load();
  };

  const setSignoff = async (amendment, approved, notes) => {
    await api.approveAmendment(projectId, amendment.id, { approved, approvalNotes: notes });
    load();
  };

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider">Scope Changes / Amendments</h3>
        <button className="text-[11px] underline" onClick={() => setOpen((o) => !o)}>
          {open ? "Close form" : "New amendment"}
        </button>
      </div>

      {open && (
        <form onSubmit={create} className="mb-4 space-y-2 border border-black/10 p-3">
          <div className="flex gap-2">
            <select
              className="input w-40"
              value={form.columnKey}
              onChange={(e) => setForm({ ...form, columnKey: e.target.value })}
            >
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Amendment title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <textarea
            className="input h-16 resize-none"
            placeholder="Reason for change"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <textarea
              className="input h-20 resize-none"
              placeholder="Previous scope"
              value={form.oldValue}
              onChange={(e) => setForm({ ...form, oldValue: e.target.value })}
            />
            <textarea
              className="input h-20 resize-none"
              placeholder="New scope"
              value={form.newValue}
              onChange={(e) => setForm({ ...form, newValue: e.target.value })}
            />
          </div>
          <button className="btn-primary text-xs" type="submit">
            Create amendment (generates AI change report)
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {amendments.map((a) => (
          <li key={a.id} className="border border-black/10 p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {a.title} <span className="text-xs font-normal text-gray-500">({a.column_key})</span>
              </span>
              <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            {a.description && <p className="mt-1 text-xs text-gray-600">{a.description}</p>}
            <details className="mt-1">
              <summary className="cursor-pointer text-xs underline">AI change report</summary>
              <pre className="mt-1 whitespace-pre-wrap border border-black/10 bg-gray-50 p-2 text-xs">{a.ai_change_report}</pre>
            </details>
            <AmendmentSignoff amendment={a} onSubmit={setSignoff} />
          </li>
        ))}
        {amendments.length === 0 && <li className="text-xs text-gray-400">No scope changes recorded yet.</li>}
      </ul>
    </div>
  );
}

function AmendmentSignoff({ amendment, onSubmit }) {
  const [notes, setNotes] = useState(amendment.approval_notes || "");

  return (
    <div className="mt-2 border-t border-black/10 pt-2 text-xs">
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          className="accent-black"
          checked={!!amendment.approved}
          onChange={(e) => onSubmit(amendment, e.target.checked, notes)}
        />
        Signed off
      </label>
      {amendment.approved && amendment.approved_at && (
        <div className="mt-0.5 text-[10px] text-gray-500">{new Date(amendment.approved_at).toLocaleString()}</div>
      )}
      <textarea
        className="input mt-1 h-10 resize-none"
        placeholder="Sign-off notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => amendment.approved && onSubmit(amendment, true, notes)}
      />
    </div>
  );
}

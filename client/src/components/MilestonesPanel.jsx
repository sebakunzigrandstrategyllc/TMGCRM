import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function MilestonesPanel({ projectId, onChange }) {
  const [milestones, setMilestones] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const load = () => api.getMilestones(projectId).then((r) => setMilestones(r.milestones));

  useEffect(() => {
    load();
  }, [projectId]);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createMilestone(projectId, { title, dueDate: dueDate || null });
    setTitle("");
    setDueDate("");
    load();
    onChange?.();
  };

  const toggleStatus = async (m) => {
    await api.updateMilestone(projectId, m.id, { status: m.status === "done" ? "pending" : "done" });
    load();
    onChange?.();
  };

  return (
    <div className="card p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider">Milestones</h3>
      <form onSubmit={create} className="mb-3 flex gap-2">
        <input className="input" placeholder="Milestone title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input w-40" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button className="btn-primary text-xs" type="submit">Add</button>
      </form>
      <ul className="space-y-1 text-sm">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center justify-between border-b border-black/10 py-1">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={m.status === "done"} onChange={() => toggleStatus(m)} className="accent-black" />
              <span className={m.status === "done" ? "line-through text-gray-400" : ""}>{m.title}</span>
            </label>
            <span className="text-xs text-gray-500">{m.due_date || "—"}</span>
          </li>
        ))}
        {milestones.length === 0 && <li className="text-xs text-gray-400">No milestones yet.</li>}
      </ul>
    </div>
  );
}

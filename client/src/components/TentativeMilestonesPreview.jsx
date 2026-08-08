import { useEffect, useState } from "react";
import { api } from "../api.js";

// Read-only milestones list shown inside the Make column — visible even before Proposal is
// approved, so the incremental goal-setting flow is visible left to right. Interactive
// management still happens in the Milestones section, which unlocks post-approval.
export default function TentativeMilestonesPreview({ projectId, refreshKey }) {
  const [milestones, setMilestones] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getMilestones(projectId).then((r) => {
      setMilestones(r.milestones || []);
      setLoaded(true);
    });
  }, [projectId, refreshKey]);

  if (!loaded || milestones.length === 0) return null;

  return (
    <div className="border border-black/10 bg-gray-50 p-2 text-xs">
      <div className="mb-1 font-semibold uppercase tracking-wide text-gray-500">Tentative milestones</div>
      <ul className="space-y-0.5">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 border-b border-black/10 py-0.5">
            <span className={m.status === "done" ? "text-gray-400 line-through" : ""}>{m.title}</span>
            <span className="flex shrink-0 items-center gap-1 text-gray-500">
              {m.due_date ? new Date(m.due_date).toLocaleDateString() : "—"}
              {m.source === "ai_suggested" && (
                <span className="border border-black/20 px-1 text-[9px] uppercase leading-tight text-gray-400">AI</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-gray-400">Manage these once Proposal is approved.</p>
    </div>
  );
}

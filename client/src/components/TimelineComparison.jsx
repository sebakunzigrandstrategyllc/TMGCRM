import { useEffect, useState } from "react";
import { api } from "../api.js";

// Read-only, side-by-side view of the AI-generated Make execution timeline against the
// human-managed Milestones — plotted on a shared date axis so a consultant can eyeball
// alignment. Nothing here writes back to either source: milestones stay entirely
// human-authored, and the AI timeline is regenerated only from the Make column itself.
// This is a comparison aid, not a sync — the human is the one who decides what to do
// with any gap it points out.
export default function TimelineComparison({ projectId, timeline, refreshKey }) {
  const [milestones, setMilestones] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getMilestones(projectId).then((r) => {
      setMilestones(r.milestones || []);
      setLoaded(true);
    });
  }, [projectId, refreshKey]);

  if (!loaded) return null;

  const datedMilestones = milestones.filter((m) => m.due_date);
  const undatedMilestones = milestones.filter((m) => !m.due_date);

  if (!timeline && milestones.length === 0) {
    return (
      <div className="card p-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider">Timeline vs. Milestones</h3>
        <p className="text-xs text-gray-500">
          Nothing to compare yet. The AI execution timeline generates automatically once Proposal is approved;
          milestones are set by you in the section above.
        </p>
      </div>
    );
  }

  if (!timeline || datedMilestones.length === 0) {
    return (
      <div className="card p-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider">Timeline vs. Milestones</h3>
        <p className="text-xs text-gray-500">
          {!timeline
            ? "Add a due date to a milestone, and once the AI execution timeline generates, they'll line up here."
            : "Give a milestone a due date to compare it against the AI execution timeline below."}
        </p>
      </div>
    );
  }

  // Scale the shared axis to the AI timeline's own window (plus a little padding), not to
  // the full spread of milestone dates — a single far-off milestone would otherwise squash
  // the AI timeline into an unreadable sliver. Out-of-range milestones still show, clamped
  // to the edge with their own marker, and are always called out in the text nudges below.
  const timelineStart = new Date(timeline.segments[0].estimatedStart);
  const timelineEnd = new Date(timeline.segments[timeline.segments.length - 1].estimatedEnd);
  const timelineSpan = Math.max(timelineEnd - timelineStart, 1);
  const padding = timelineSpan * 0.08;
  const rangeStart = new Date(timelineStart.getTime() - padding);
  const rangeEnd = new Date(timelineEnd.getTime() + padding);
  const rangeMs = Math.max(rangeEnd - rangeStart, 1);
  const pct = (d) => ((new Date(d) - rangeStart) / rangeMs) * 100;
  const clampedPct = (d) => Math.min(100, Math.max(0, pct(d)));

  // Informational nudges only — a human decides whether to act on them.
  const unmatchedPhases = timeline.segments.filter(
    (s) =>
      !datedMilestones.some(
        (m) => new Date(m.due_date) >= new Date(s.estimatedStart) && new Date(m.due_date) <= new Date(s.estimatedEnd)
      )
  );
  const outOfRangeMilestones = datedMilestones.filter(
    (m) => new Date(m.due_date) < timelineStart || new Date(m.due_date) > timelineEnd
  );

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider">Timeline vs. Milestones</h3>
        <span className="text-[10px] text-gray-400">Reference only — milestones stay yours to set</span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-gray-500">AI execution timeline</div>
          <div className="relative h-5 w-full border border-black bg-white">
            {timeline.segments.map((s, i) => (
              <div
                key={s.key}
                className={`absolute top-0 h-full ${i % 2 === 0 ? "bg-black" : "bg-gray-400"}`}
                style={{ left: `${pct(s.estimatedStart)}%`, width: `${Math.max(pct(s.estimatedEnd) - pct(s.estimatedStart), 0.5)}%` }}
                title={`${s.label}: ${new Date(s.estimatedStart).toLocaleDateString()}–${new Date(s.estimatedEnd).toLocaleDateString()}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-gray-500">Your milestones</div>
          <div className="relative h-5 w-full border border-black/20 bg-gray-50">
            {datedMilestones.map((m) => {
              const rawPct = pct(m.due_date);
              const offChart = rawPct < 0 || rawPct > 100;
              return (
                <div
                  key={m.id}
                  className={
                    offChart
                      ? "absolute top-0 flex h-full w-3 items-center justify-center text-[10px] font-bold text-gray-500"
                      : `absolute top-0 h-full w-0.5 ${m.status === "done" ? "bg-gray-400" : "bg-black"}`
                  }
                  style={{ left: `${clampedPct(m.due_date)}%`, transform: offChart ? "translateX(-50%)" : undefined }}
                  title={`${m.title}: ${new Date(m.due_date).toLocaleDateString()}${offChart ? " (outside the AI's estimated window)" : ""}`}
                >
                  {offChart ? (rawPct < 0 ? "◂" : "▸") : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{rangeStart.toLocaleDateString()}</span>
          <span>{rangeEnd.toLocaleDateString()}</span>
        </div>
      </div>

      {(unmatchedPhases.length > 0 || outOfRangeMilestones.length > 0 || undatedMilestones.length > 0) && (
        <div className="mt-3 space-y-1 border-t border-black/10 pt-2 text-[11px] text-gray-600">
          {unmatchedPhases.map((s) => (
            <p key={s.key}>
              No milestone falls in the AI's "{s.label}" window ({new Date(s.estimatedStart).toLocaleDateString()}–
              {new Date(s.estimatedEnd).toLocaleDateString()}) — consider adding one, or ignore if not needed.
            </p>
          ))}
          {outOfRangeMilestones.map((m) => (
            <p key={m.id}>
              "{m.title}" ({new Date(m.due_date).toLocaleDateString()}) falls outside the AI's estimated execution
              window — worth a second look.
            </p>
          ))}
          {undatedMilestones.length > 0 && (
            <p>
              {undatedMilestones.length} milestone{undatedMilestones.length > 1 ? "s have" : " has"} no due date, so{" "}
              {undatedMilestones.length > 1 ? "they're" : "it's"} not shown above: {undatedMilestones.map((m) => m.title).join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

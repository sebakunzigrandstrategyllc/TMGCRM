// Renders an AI-generated project timeline: a proportional stage bar plus a segment
// breakdown with estimated durations and date ranges. Used for the See-stage journey
// analysis and the post-Proposal Make execution timeline.
export default function TimelinePanel({ title, timeline, onGenerate, generateLabel, loading, emptyHint }) {
  return (
    <div className="border border-black/10 bg-gray-50 p-2 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        {onGenerate && (
          <button type="button" className="underline disabled:text-gray-400" onClick={onGenerate} disabled={loading}>
            {loading ? "Generating..." : generateLabel || (timeline ? "Regenerate" : "Generate")}
          </button>
        )}
      </div>

      {!timeline ? (
        <p className="text-gray-400">{emptyHint || "Not generated yet."}</p>
      ) : (
        <>
          <p className="mb-2 leading-relaxed text-gray-700">{timeline.summary}</p>
          <div className="flex h-3 w-full overflow-hidden border border-black">
            {timeline.segments.map((seg, i) => (
              <div
                key={seg.key}
                className={i % 2 === 0 ? "bg-black" : "bg-gray-400"}
                style={{ width: `${(seg.estimatedDays / totalDays(timeline.segments)) * 100}%` }}
                title={`${seg.label}: ${seg.estimatedDays}d`}
              />
            ))}
          </div>
          <ul className="mt-2 space-y-0.5">
            {timeline.segments.map((seg) => (
              <li key={seg.key} className="flex items-center justify-between gap-2 border-b border-black/10 py-0.5">
                <span>{seg.label}</span>
                <span className="shrink-0 text-gray-500">
                  {seg.estimatedDays}d · {new Date(seg.estimatedStart).toLocaleDateString()}–
                  {new Date(seg.estimatedEnd).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-1 text-[10px] text-gray-400">
            Generated {new Date(timeline.generated_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

function totalDays(segments) {
  return segments.reduce((sum, s) => sum + s.estimatedDays, 0) || 1;
}

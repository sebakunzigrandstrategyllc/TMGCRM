import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [turnaround, setTurnaround] = useState(null);
  const [patterns, setPatterns] = useState(null);

  useEffect(() => {
    api.getOverview().then(setOverview);
    api.getTurnaround().then(setTurnaround);
    api.getContentPatterns().then(setPatterns);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-lg font-bold uppercase tracking-wider">Analytics</h1>

      {overview && (
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Projects" value={overview.projectCount} />
          <Stat label="Proposals approved" value={overview.proposalApprovedCount} />
          <Stat label="Files stored" value={overview.totalFiles} />
          <Stat label="Amendments" value={overview.totalAmendments} />
        </div>
      )}

      {turnaround && (
        <section className="card p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Approval Turnaround</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black text-left text-xs uppercase text-gray-500">
                <th className="py-1">Column</th>
                <th className="py-1">Approved count</th>
                <th className="py-1">Avg. turnaround (hrs)</th>
              </tr>
            </thead>
            <tbody>
              {turnaround.summary.map((row) => (
                <tr key={row.columnKey} className="border-b border-black/10">
                  <td className="py-1 capitalize">{row.columnKey.replace("_", " ")}</td>
                  <td className="py-1">{row.approvedCount}</td>
                  <td className="py-1">{row.avgTurnaroundHours ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {patterns && (
        <section className="card p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Content Patterns</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black text-left text-xs uppercase text-gray-500">
                <th className="py-1">Column</th>
                <th className="py-1">Entries</th>
                <th className="py-1">Avg AI draft length</th>
                <th className="py-1">Avg human edit length</th>
                <th className="py-1">Edited rate</th>
              </tr>
            </thead>
            <tbody>
              {patterns.summary.map((row) => (
                <tr key={row.columnKey} className="border-b border-black/10">
                  <td className="py-1 capitalize">{row.columnKey.replace("_", " ")}</td>
                  <td className="py-1">{row.entries}</td>
                  <td className="py-1">{row.avgAiDraftLength}</td>
                  <td className="py-1">{row.avgHumanEditLength}</td>
                  <td className="py-1">{row.editedRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Files by type</h3>
              <ul className="text-sm">
                {patterns.fileTypeCounts.map((f) => (
                  <li key={f.fileType} className="flex justify-between border-b border-black/10 py-0.5">
                    <span>{f.fileType}</span>
                    <span>{f.count}</span>
                  </li>
                ))}
                {patterns.fileTypeCounts.length === 0 && <li className="text-gray-400">No files yet.</li>}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Activity volume</h3>
              <ul className="text-sm">
                {patterns.activityCounts.map((a) => (
                  <li key={a.action} className="flex justify-between border-b border-black/10 py-0.5">
                    <span>{a.action}</span>
                    <span>{a.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import StageColumn from "../components/StageColumn.jsx";
import MilestonesPanel from "../components/MilestonesPanel.jsx";
import PaymentSchedule from "../components/PaymentSchedule.jsx";
import CalendarPanel from "../components/CalendarPanel.jsx";
import AmendmentPanel from "../components/AmendmentPanel.jsx";

export default function ProjectDashboard() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .getDashboard(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-black">⚠ {error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading...</p>;

  const { project, columns, proposalApproved, timelines } = data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wider">
            {project.client_name} <span className="font-mono text-gray-400">#{project.id}</span>
          </h1>
          <p className="text-xs text-gray-500">Created {new Date(project.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-3 overflow-x-auto pb-3">
        {columns.map((col) => (
          <StageColumn
            key={col.key}
            projectId={id}
            column={col}
            timeline={col.key === "see" ? timelines?.see : col.key === "make" ? timelines?.make : null}
            onChange={load}
          />
        ))}
      </div>

      <div className="space-y-4">
        {proposalApproved ? (
          <>
            <MilestonesPanel projectId={id} />
            <PaymentSchedule projectId={id} />
            <CalendarPanel projectId={id} />
          </>
        ) : (
          <div className="card p-4 text-sm text-gray-500">
            Milestones, payment schedule, and the internal calendar unlock once the Proposal column is approved.
          </div>
        )}
        <AmendmentPanel projectId={id} columns={columns} />
      </div>
    </div>
  );
}

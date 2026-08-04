import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then((p) => {
      setProjects(p);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-wider">Projects ({projects.length}/50)</h1>
        <Link to="/intake" className="btn-primary text-xs">
          + New Intake
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No projects yet. Start with an intake to create the first one.
        </div>
      ) : (
        <table className="w-full border border-black text-sm">
          <thead>
            <tr className="border-b border-black bg-black text-left text-white">
              <th className="px-3 py-2 font-semibold">ID</th>
              <th className="px-3 py-2 font-semibold">Client</th>
              <th className="px-3 py-2 font-semibold">Contact</th>
              <th className="px-3 py-2 font-semibold">Stage</th>
              <th className="px-3 py-2 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-black/10 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono">
                  <Link to={`/projects/${p.id}`} className="underline">
                    {p.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.client_name}</td>
                <td className="px-3 py-2 text-gray-600">{p.contact_info || "—"}</td>
                <td className="px-3 py-2 uppercase text-xs tracking-wide">{p.current_stage}</td>
                <td className="px-3 py-2 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api.js";

const DAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };

export default function CalendarPanel({ projectId }) {
  const [events, setEvents] = useState([]);
  const [businessHours, setBusinessHours] = useState({});
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api.getCalendar(projectId).then((r) => {
      setEvents(r.events);
      setBusinessHours(r.businessHours || {});
    });

  useEffect(() => {
    load();
  }, [projectId]);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !start || !end) return;
    try {
      await api.createCalendarEvent(projectId, { title, startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString() });
      setTitle("");
      setStart("");
      setEnd("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card p-3">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wider">Internal Calendar</h3>
      <p className="mb-2 text-[11px] text-gray-500">
        Available Mon–Thu {businessHours[1]?.start}–{businessHours[1]?.end}, Fri {businessHours[5]?.start}–{businessHours[5]?.end}.
      </p>
      <form onSubmit={create} className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input w-40" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input w-52" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        <input className="input w-52" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        <button className="btn-primary text-xs" type="submit">Add event</button>
      </form>
      {error && <p className="mb-2 text-xs text-black">⚠ {error}</p>}
      <ul className="space-y-1 text-sm">
        {events.map((ev) => {
          const s = new Date(ev.start_time);
          return (
            <li key={ev.id} className="flex items-center justify-between border-b border-black/10 py-1">
              <span>
                {ev.title} <span className="text-xs text-gray-500">({DAY_LABELS[s.getDay()] || s.toDateString()})</span>
              </span>
              <span className="flex items-center gap-3 text-xs text-gray-500">
                {s.toLocaleString()} – {new Date(ev.end_time).toLocaleTimeString()}
                <button className="underline" onClick={async () => { await api.deleteCalendarEvent(projectId, ev.id); load(); }}>
                  Remove
                </button>
              </span>
            </li>
          );
        })}
        {events.length === 0 && <li className="text-xs text-gray-400">No events scheduled yet.</li>}
      </ul>
    </div>
  );
}

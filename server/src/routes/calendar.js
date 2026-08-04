import { Router } from "express";
import { db, logActivity } from "../db/db.js";
import { isProposalApproved } from "../utils/stageEntries.js";
import { CALENDAR_HOURS } from "../constants.js";

const router = Router({ mergeParams: true });

function requireProposalApproved(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  if (!isProposalApproved(project.id)) {
    res.status(423).json({ error: "The internal calendar unlocks once the Proposal column is approved." });
    return null;
  }
  return project;
}

function withinBusinessHours(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return "Invalid start/end time";
  }
  const day = start.getDay(); // 0 = Sunday
  const hours = CALENDAR_HOURS[day];
  if (!hours) return "Calendar is only available Monday–Friday.";

  const toMinutes = (d) => d.getHours() * 60 + d.getMinutes();
  const [startH, startM] = hours.start.split(":").map(Number);
  const [endH, endM] = hours.end.split(":").map(Number);
  const dayStartMin = startH * 60 + startM;
  const dayEndMin = endH * 60 + endM;

  if (start.toDateString() !== end.toDateString()) {
    return "Events must start and end on the same day.";
  }
  if (toMinutes(start) < dayStartMin || toMinutes(end) > dayEndMin) {
    return `Outside business hours for this day (${hours.start}–${hours.end}).`;
  }
  return null;
}

router.get("/", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const unlocked = isProposalApproved(project.id);
  if (!unlocked) return res.json({ unlocked: false, events: [], businessHours: CALENDAR_HOURS });
  const events = db
    .prepare(`SELECT * FROM calendar_events WHERE project_id = ? ORDER BY start_time ASC`)
    .all(project.id);
  res.json({ unlocked: true, events, businessHours: CALENDAR_HOURS });
});

router.post("/", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  const { title, startTime, endTime, notes } = req.body;
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: "title, startTime, and endTime are required" });
  }
  const violation = withinBusinessHours(startTime, endTime);
  if (violation) return res.status(400).json({ error: violation });

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO calendar_events (project_id, title, start_time, end_time, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(project.id, title, startTime, endTime, notes || null, now);
  logActivity(project.id, "calendar_event_created", null, { title, startTime });
  res.status(201).json(db.prepare(`SELECT * FROM calendar_events WHERE id = ?`).get(info.lastInsertRowid));
});

router.delete("/:eventId", (req, res) => {
  const project = requireProposalApproved(req, res);
  if (!project) return;
  db.prepare(`DELETE FROM calendar_events WHERE id = ? AND project_id = ?`).run(req.params.eventId, project.id);
  res.status(204).end();
});

export default router;

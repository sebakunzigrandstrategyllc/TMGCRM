import fs from "fs";
import { db } from "../db/db.js";
import { projectDir } from "./storage.js";

// Permanently removes a project and everything tied to it: every DB row across every table,
// plus its entire storage folder (Pictures/Video/Audio/Documents/_uploads) on disk. There is
// no undo — callers are expected to have already confirmed this with a human.
export function deleteProjectCompletely(projectId) {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM checklist_items WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM timelines WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM activity_log WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM amendments WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM calendar_events WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM payment_schedule WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM milestones WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM files WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM approvals WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM stage_entry_versions WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM stage_entries WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM intake_forms WHERE project_id = ?`).run(projectId);
    db.prepare(`DELETE FROM projects WHERE id = ?`).run(projectId);
  });
  tx();

  fs.rmSync(projectDir(projectId), { recursive: true, force: true });
}

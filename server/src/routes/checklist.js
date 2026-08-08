import { Router } from "express";
import { db } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";
import { isColumnUnlocked } from "../utils/stageEntries.js";
import {
  getChecklist,
  getChecklistProgress,
  regenerateChecklist,
  setItemChecked,
} from "../utils/checklistEngine.js";

const router = Router({ mergeParams: true });

function requireProject(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

function requireColumn(req, res) {
  if (!COLUMN_KEYS.includes(req.params.columnKey)) {
    res.status(400).json({ error: "Unknown column" });
    return false;
  }
  return true;
}

router.get("/:columnKey", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireColumn(req, res)) return;

  const items = getChecklist(project.id, req.params.columnKey);
  const { total, checked } = getChecklistProgress(project.id, req.params.columnKey);
  res.json({ items, total, checked });
});

router.put("/items/:itemId", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;

  const item = db
    .prepare(`SELECT * FROM checklist_items WHERE id = ? AND project_id = ?`)
    .get(req.params.itemId, project.id);
  if (!item) return res.status(404).json({ error: "Checklist item not found" });

  if (!isColumnUnlocked(project.id, item.column_key)) {
    return res.status(423).json({ error: "This column is locked until the prior column is approved." });
  }

  const updated = setItemChecked(project.id, item.id, !!req.body.checked);
  res.json(updated);
});

// Explicit reset — regenerates fresh items and clears all checked progress for the column.
router.post("/:columnKey/regenerate", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  if (!requireColumn(req, res)) return;

  if (!isColumnUnlocked(project.id, req.params.columnKey)) {
    return res.status(423).json({ error: "This column is locked until the prior column is approved." });
  }

  const items = regenerateChecklist(project, req.params.columnKey);
  res.status(201).json({ items, total: items.length, checked: 0 });
});

export default router;

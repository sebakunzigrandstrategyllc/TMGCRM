import { Router } from "express";
import { db } from "../db/db.js";
import { isProposalApproved } from "../utils/stageEntries.js";
import {
  getLatestTimeline,
  getTimelineHistory,
  generateAndStoreSeeTimeline,
  generateAndStoreMakeTimeline,
} from "../utils/timelineEngine.js";

const router = Router({ mergeParams: true });

function requireProject(req, res) {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

router.get("/:stage", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  const { stage } = req.params;
  if (!["see", "make"].includes(stage)) {
    return res.status(400).json({ error: "Unknown timeline stage" });
  }
  res.json({
    current: getLatestTimeline(project.id, stage),
    history: getTimelineHistory(project.id, stage),
  });
});

// Manual (re)generation of the See-stage journey timeline. Also triggered automatically
// when the See column is approved.
router.post("/see", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  res.status(201).json(generateAndStoreSeeTimeline(project));
});

// Manual (re)generation of the Make-stage execution timeline. Available anytime as a
// tentative preview grounded in whatever Proposal/Understand content currently exists; wording
// marks it finalized once Proposal is actually approved. Also triggered automatically by the
// plan cascade on every save.
router.post("/make", (req, res) => {
  const project = requireProject(req, res);
  if (!project) return;
  res.status(201).json(generateAndStoreMakeTimeline(project, { finalized: isProposalApproved(project.id) }));
});

export default router;

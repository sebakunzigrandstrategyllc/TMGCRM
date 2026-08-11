import express from "express";
import cors from "cors";
import "./db/db.js";

import projectsRouter from "./routes/projects.js";
import intakeRouter from "./routes/intake.js";
import columnsRouter from "./routes/columns.js";
import approvalsRouter from "./routes/approvals.js";
import filesRouter from "./routes/files.js";
import milestonesRouter from "./routes/milestones.js";
import paymentsRouter from "./routes/payments.js";
import calendarRouter from "./routes/calendar.js";
import amendmentsRouter from "./routes/amendments.js";
import analyticsRouter from "./routes/analytics.js";
import timelineRouter from "./routes/timeline.js";
import checklistRouter from "./routes/checklist.js";
import intakeDocumentsRouter from "./routes/intakeDocuments.js";
import intakeBulkRouter from "./routes/intakeBulk.js";
import { COLUMNS } from "./constants.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/columns", (req, res) => res.json(COLUMNS));

app.use("/api/projects", projectsRouter);
app.use("/api/intake", intakeRouter);
app.use("/api/intake/bulk", intakeBulkRouter);
app.use("/api/projects/:id/columns", columnsRouter);
app.use("/api/projects/:id/approvals", approvalsRouter);
app.use("/api/projects/:id/milestones", milestonesRouter);
app.use("/api/projects/:id/payments", paymentsRouter);
app.use("/api/projects/:id/calendar", calendarRouter);
app.use("/api/projects/:id/amendments", amendmentsRouter);
app.use("/api/projects/:id/timeline", timelineRouter);
app.use("/api/projects/:id/checklist", checklistRouter);
app.use("/api/projects/:id/intake-documents", intakeDocumentsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api", filesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SUMMS CRM server listening on http://localhost:${PORT}`);
});

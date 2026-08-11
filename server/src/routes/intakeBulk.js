import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createProjectFromIntake, IntakeValidationError } from "../utils/projectCreation.js";

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), "tmp_uploads") });

const TRUTHY = new Set(["true", "yes", "y", "1"]);

// Bulk-creates one project per CSV row. Expected columns (header row required):
// clientName (required), email, phone, company, notes, readAiTranscriptLink, proposalAgreed
// (true/yes/1 to auto-approve See/Understand/Proposal for that row, same as the single-client
// checkbox). Rows don't carry file/text intake documents — those get added per-project
// afterward via the Intake Documents panel on See. Every row is independent: one failing
// (invalid data, or the 50-project cap being hit partway through) doesn't roll back the ones
// that already succeeded — the response reports exactly which rows landed and which didn't.
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A CSV file is required" });

  let rows;
  try {
    const text = fs.readFileSync(req.file.path, "utf-8");
    rows = parse(text, { columns: (header) => header.map((h) => h.trim()), skip_empty_lines: true, trim: true });
  } catch (err) {
    return res.status(400).json({ error: `Could not parse CSV: ${err.message}` });
  } finally {
    fs.unlinkSync(req.file.path);
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: "CSV has no data rows" });
  }
  if (rows.length > 50) {
    return res.status(400).json({ error: `CSV has ${rows.length} rows, but only 50 projects are supported total.` });
  }

  const created = [];
  const errors = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // account for the header row so this matches what a user sees in a spreadsheet
    try {
      const project = createProjectFromIntake({
        clientName: row.clientName || row.client_name || row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        notes: row.notes,
        readAiTranscriptLink: row.readAiTranscriptLink || row.transcriptLink,
        proposalAgreed: TRUTHY.has((row.proposalAgreed || "").toLowerCase()),
      });
      created.push({ row: rowNum, id: project.id, clientName: project.client_name });
    } catch (err) {
      const message = err instanceof IntakeValidationError ? err.message : err.message || "Failed to create project";
      errors.push({ row: rowNum, error: message });
    }
  });

  res.status(created.length > 0 ? 201 : 400).json({ created, errors });
});

export default router;

import { db } from "../db/db.js";

// Generates the next sequential project number (01-50) plus a random trailing 4-digit id, e.g. "01-7342".
export function generateProjectId() {
  const row = db.prepare(`SELECT MAX(seq_number) AS maxSeq FROM projects`).get();
  const nextSeq = (row?.maxSeq || 0) + 1;
  if (nextSeq > 50) {
    throw new Error("Maximum of 50 client projects reached");
  }
  const seqStr = String(nextSeq).padStart(2, "0");
  const randomId = String(Math.floor(1000 + Math.random() * 9000));
  return { id: `${seqStr}-${randomId}`, seqNumber: nextSeq, randomId };
}

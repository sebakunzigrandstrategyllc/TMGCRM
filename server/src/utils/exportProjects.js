import { db } from "../db/db.js";
import { COLUMN_KEYS } from "../constants.js";

const APPROVAL_COLUMNS = COLUMN_KEYS.filter((key) => key !== "contact_details");

export const EXPORT_HEADERS = [
  { key: "id", label: "Project ID" },
  { key: "client_name", label: "Client Name" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "current_stage", label: "Current Stage" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created At" },
  { key: "updated_at", label: "Updated At" },
  ...APPROVAL_COLUMNS.map((key) => ({ key: `${key}_approved`, label: `${labelize(key)} Approved` })),
];

function labelize(key) {
  return key
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Flat, spreadsheet-friendly snapshot of every project: core client fields plus a yes/no
// approval column per stage, so the export reflects where each project actually stands.
export function buildProjectExportRows() {
  const projects = db.prepare(`SELECT * FROM projects ORDER BY seq_number ASC`).all();
  const approvalRows = db.prepare(`SELECT project_id, column_key, approved FROM approvals`).all();

  const approvalsByProject = new Map();
  for (const row of approvalRows) {
    if (!approvalsByProject.has(row.project_id)) approvalsByProject.set(row.project_id, {});
    approvalsByProject.get(row.project_id)[row.column_key] = !!row.approved;
  }

  return projects.map((p) => {
    const approvals = approvalsByProject.get(p.id) || {};
    const row = {
      id: p.id,
      client_name: p.client_name,
      company: p.company || "",
      email: p.email || "",
      phone: p.phone || "",
      current_stage: p.current_stage,
      notes: p.notes || "",
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
    for (const key of APPROVAL_COLUMNS) {
      row[`${key}_approved`] = approvals[key] ? "yes" : "no";
    }
    return row;
  });
}

export function exportRowsToCsv(rows) {
  const toCsvValue = (value) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [EXPORT_HEADERS.map((h) => toCsvValue(h.label)).join(",")];
  for (const row of rows) {
    lines.push(EXPORT_HEADERS.map((h) => toCsvValue(row[h.key])).join(","));
  }
  return lines.join("\n");
}

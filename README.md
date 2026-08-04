# SUMMS CRM

A CRM for a solo consultant managing up to 50 client projects through a five-stage
methodology: **See → Understand → Make → Manage → Sustain**.

## Stack

- **Client:** React + Vite + Tailwind (black-and-white theme)
- **Server:** Node.js / Express
- **Database:** SQLite (via `better-sqlite3`)
- **File storage:** local disk, organized per-project into `Pictures/Video/Audio/Documents`

## Project layout

```
server/   Express API + SQLite database + file storage
client/   React SPA
```

## Running locally

```bash
# terminal 1
cd server
npm install
npm run dev        # http://localhost:4000

# terminal 2
cd client
npm install
npm run dev         # http://localhost:5173 (proxies /api to :4000)
```

## Core concepts

- **Projects** are numbered `01`–`50` with a random trailing 4-digit id (e.g. `01-7342`),
  created via the intake form. Each gets its own file storage tree with auto-managed
  `Pictures`, `Video`, `Audio`, `Documents` subfolders — any file uploaded anywhere in the
  app is duplicated into the matching type folder.
- **Dashboard columns** (left to right): Contact Details, Intake/See, Understand, Proposal,
  Make, Manage, Sustain, Final Notes. Each column tracks an AI draft, a human-edited version
  (with word-level diffing between the two), file attachments, and an approval gate
  (checkbox + timestamp + notes) that blocks the next column until checked.
- **Proposal-triggered unlocks**: approving the Proposal column unlocks Milestones, Payment
  Schedule, and the internal Calendar (Mon–Thu 7am–3pm, Fri 10am–2pm).
- **Scope changes (amendments)** are append-only — every change is its own row with its own
  sign-off, and nothing is ever overwritten. Each amendment gets a stubbed AI change report.
- **Analytics** are derived from an activity log that timestamps every draft, edit, and
  approval, surfacing approval turnaround times and content-pattern stats.

AI calls (intake summary generation, change reports) are stubbed in `server/src/utils/ai.js`
pending real model integration.

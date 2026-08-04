CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  seq_number INTEGER UNIQUE NOT NULL,
  random_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  contact_info TEXT,
  notes TEXT,
  current_stage TEXT NOT NULL DEFAULT 'see',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  read_ai_transcript_link TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

-- Current state of each dashboard column cell (AI draft + human-approved edit)
CREATE TABLE IF NOT EXISTS stage_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  column_key TEXT NOT NULL,
  ai_draft TEXT DEFAULT '',
  human_edit TEXT DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, column_key)
);

-- Append-only version history for diff tracking
CREATE TABLE IF NOT EXISTS stage_entry_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  column_key TEXT NOT NULL,
  version_type TEXT NOT NULL, -- 'ai_draft' | 'human_edit'
  content TEXT,
  created_at TEXT NOT NULL
);

-- Current approval gate state per column
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  column_key TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  approved_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, column_key)
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  column_key TEXT,
  file_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  duplicated_from_id INTEGER,
  uploaded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS amendments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  column_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  ai_change_report TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  approved_at TEXT,
  approval_notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  action TEXT NOT NULL,
  column_key TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_stage_versions_project ON stage_entry_versions(project_id, column_key);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_amendments_project ON amendments(project_id);

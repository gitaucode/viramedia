CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'new',
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT,
  budget TEXT,
  brief TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE shortlists ADD COLUMN client TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN objective TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN budget TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN status TEXT NOT NULL DEFAULT 'planning';
ALTER TABLE shortlists ADD COLUMN start_date TEXT;
ALTER TABLE shortlists ADD COLUMN end_date TEXT;
ALTER TABLE shortlists ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN lead_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_shortlists_status ON shortlists(status);
CREATE INDEX IF NOT EXISTS idx_shortlists_lead_id ON shortlists(lead_id);

CREATE TABLE IF NOT EXISTS deliverables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  creator_id INTEGER,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES shortlists(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_due_date ON deliverables(due_date);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE shortlists ADD COLUMN client_objective TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN report_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN report_insights TEXT NOT NULL DEFAULT '';
ALTER TABLE shortlists ADD COLUMN report_recommendations TEXT NOT NULL DEFAULT '';

ALTER TABLE deliverables ADD COLUMN client_approval_status TEXT NOT NULL DEFAULT 'not_ready';
ALTER TABLE deliverables ADD COLUMN client_feedback TEXT NOT NULL DEFAULT '';
ALTER TABLE deliverables ADD COLUMN client_reviewed_at TEXT;

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active',
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phone TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

CREATE TABLE IF NOT EXISTS campaign_clients (
  campaign_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, client_id),
  FOREIGN KEY (campaign_id) REFERENCES shortlists(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_clients_client ON campaign_clients(client_id);

CREATE TABLE IF NOT EXISTS client_login_codes (
  client_id INTEGER PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS client_sessions (
  token_hash TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_sessions_client ON client_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_expires ON client_sessions(expires_at);

CREATE TABLE IF NOT EXISTS performance_metrics (
  deliverable_id INTEGER PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE
);

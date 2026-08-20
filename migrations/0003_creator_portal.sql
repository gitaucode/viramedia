ALTER TABLE shortlists ADD COLUMN creator_brief TEXT NOT NULL DEFAULT '';

ALTER TABLE deliverables ADD COLUMN instructions TEXT NOT NULL DEFAULT '';
ALTER TABLE deliverables ADD COLUMN submission_url TEXT;
ALTER TABLE deliverables ADD COLUMN submission_note TEXT NOT NULL DEFAULT '';
ALTER TABLE deliverables ADD COLUMN feedback TEXT NOT NULL DEFAULT '';
ALTER TABLE deliverables ADD COLUMN submitted_at TEXT;
ALTER TABLE deliverables ADD COLUMN approved_at TEXT;
ALTER TABLE deliverables ADD COLUMN creator_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deliverables ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_set';
ALTER TABLE deliverables ADD COLUMN payment_date TEXT;
ALTER TABLE deliverables ADD COLUMN payment_reference TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS creator_login_codes (
  creator_id INTEGER PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS creator_sessions (
  token_hash TEXT PRIMARY KEY,
  creator_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_sessions_creator ON creator_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_sessions_expires ON creator_sessions(expires_at);

CREATE TABLE IF NOT EXISTS creator_notification_log (
  notification_key TEXT PRIMARY KEY,
  creator_id INTEGER NOT NULL,
  deliverable_id INTEGER,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE
);

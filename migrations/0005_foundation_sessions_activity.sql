CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS activity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  campaign_id INTEGER,
  creator_id INTEGER,
  client_id INTEGER,
  deliverable_id INTEGER,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (campaign_id) REFERENCES shortlists(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_events_campaign ON activity_events(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_creator ON activity_events(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_client ON activity_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_deliverable ON activity_events(deliverable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type, created_at DESC);

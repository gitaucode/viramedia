CREATE TABLE IF NOT EXISTS submission_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliverable_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'r2' CHECK (source_type IN ('r2','external')),
  r2_key TEXT,
  external_url TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  creator_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE,
  UNIQUE (deliverable_id, version_number),
  CHECK (
    (source_type = 'r2' AND r2_key IS NOT NULL AND external_url IS NULL) OR
    (source_type = 'external' AND external_url IS NOT NULL AND r2_key IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_submission_versions_deliverable
ON submission_versions(deliverable_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_submission_versions_creator
ON submission_versions(creator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliverable_id INTEGER NOT NULL,
  submission_version_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  post_url TEXT NOT NULL,
  creator_account TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  distribution_type TEXT NOT NULL DEFAULT 'organic' CHECK (distribution_type IN ('organic','paid','mixed')),
  boosted_spend REAL NOT NULL DEFAULT 0 CHECK (boosted_spend >= 0),
  platform_post_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_version_id) REFERENCES submission_versions(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_publications_deliverable
ON publications(deliverable_id, published_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_publications_version
ON publications(submission_version_id);

CREATE INDEX IF NOT EXISTS idx_publications_platform
ON publications(platform, published_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_post_url_unique
ON publications(post_url);

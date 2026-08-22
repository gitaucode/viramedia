CREATE TABLE IF NOT EXISTS review_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliverable_id INTEGER NOT NULL,
  submission_version_id INTEGER NOT NULL,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('admin','client')),
  reviewer_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('approved','changes_requested','shared_with_client')),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_version_id) REFERENCES submission_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_events_deliverable
ON review_events(deliverable_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_review_events_version
ON review_events(submission_version_id, created_at DESC, id DESC);

ALTER TABLE deliverables
ADD COLUMN internal_review_version_id INTEGER REFERENCES submission_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliverables_internal_review_version
ON deliverables(internal_review_version_id);

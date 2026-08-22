CREATE TABLE IF NOT EXISTS notification_log (
  notification_key TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('creator','client','admin')),
  recipient_id INTEGER,
  recipient_email TEXT NOT NULL,
  campaign_id INTEGER,
  deliverable_id INTEGER,
  kind TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_log_campaign ON notification_log(campaign_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_deliverable ON notification_log(deliverable_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_kind ON notification_log(kind, sent_at DESC);

INSERT OR IGNORE INTO notification_log (
  notification_key,recipient_type,recipient_id,recipient_email,deliverable_id,kind,channel,sent_at,metadata_json
)
SELECT
  n.notification_key,
  'creator',
  n.creator_id,
  COALESCE(c.email,''),
  n.deliverable_id,
  n.kind,
  'email',
  n.created_at,
  '{}'
FROM creator_notification_log n
LEFT JOIN creators c ON c.id=n.creator_id;

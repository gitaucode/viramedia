-- Controlled creator opportunities. Campaigns remain agency-owned; creators may
-- only apply when Vira explicitly opens a campaign to matched or approved creators.
ALTER TABLE campaigns ADD COLUMN application_mode TEXT NOT NULL DEFAULT 'private';
ALTER TABLE campaigns ADD COLUMN opportunity_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN opportunity_niches TEXT NOT NULL DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN opportunity_cities TEXT NOT NULL DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN opportunity_platform TEXT NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN opportunity_compensation TEXT NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN application_deadline TEXT;

CREATE TABLE campaign_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  pitch TEXT NOT NULL DEFAULT '',
  proposed_rate TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, creator_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_applications_campaign_status
ON campaign_applications(campaign_id, status);

CREATE INDEX idx_campaign_applications_creator
ON campaign_applications(creator_id, created_at DESC);

CREATE INDEX idx_campaigns_application_mode
ON campaigns(application_mode, status);

-- Canonicalize the legacy shortlist tables in place.
-- SQLite updates foreign-key references when a referenced table is renamed,
-- so existing campaign IDs and related deliverables/client links remain intact.
ALTER TABLE shortlists RENAME TO campaigns;
ALTER TABLE shortlist_creators RENAME TO campaign_creators;
ALTER TABLE campaign_creators RENAME COLUMN shortlist_id TO campaign_id;

ALTER TABLE campaign_creators ADD COLUMN status TEXT NOT NULL DEFAULT 'assigned';
ALTER TABLE campaign_creators ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE campaign_creators ADD COLUMN invited_at TEXT;
ALTER TABLE campaign_creators ADD COLUMN accepted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_lead_id ON campaigns(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_creators_creator ON campaign_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_creators_status ON campaign_creators(campaign_id,status);

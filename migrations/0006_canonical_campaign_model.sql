-- Canonicalize the legacy shortlist tables in place while keeping a writable
-- compatibility interface for the currently deployed pre-canonical app.
--
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

-- Release compatibility layer.
-- Keep the old names available as views so the currently deployed application can
-- continue reading the migrated database while the new application is deploying.
CREATE VIEW shortlists AS
SELECT
  id,
  name,
  created_at,
  client,
  objective,
  budget,
  status,
  start_date,
  end_date,
  notes,
  lead_id,
  creator_brief,
  client_objective,
  report_summary,
  report_insights,
  report_recommendations
FROM campaigns;

CREATE TRIGGER shortlists_compat_insert
INSTEAD OF INSERT ON shortlists
BEGIN
  INSERT INTO campaigns (
    id,name,created_at,client,objective,budget,status,start_date,end_date,notes,lead_id,
    creator_brief,client_objective,report_summary,report_insights,report_recommendations
  ) VALUES (
    NEW.id,
    NEW.name,
    COALESCE(NEW.created_at,CURRENT_TIMESTAMP),
    COALESCE(NEW.client,''),
    COALESCE(NEW.objective,''),
    COALESCE(NEW.budget,''),
    COALESCE(NEW.status,'planning'),
    NEW.start_date,
    NEW.end_date,
    COALESCE(NEW.notes,''),
    NEW.lead_id,
    COALESCE(NEW.creator_brief,''),
    COALESCE(NEW.client_objective,''),
    COALESCE(NEW.report_summary,''),
    COALESCE(NEW.report_insights,''),
    COALESCE(NEW.report_recommendations,'')
  );
END;

CREATE TRIGGER shortlists_compat_update
INSTEAD OF UPDATE ON shortlists
BEGIN
  UPDATE campaigns SET
    name=NEW.name,
    created_at=NEW.created_at,
    client=NEW.client,
    objective=NEW.objective,
    budget=NEW.budget,
    status=NEW.status,
    start_date=NEW.start_date,
    end_date=NEW.end_date,
    notes=NEW.notes,
    lead_id=NEW.lead_id,
    creator_brief=NEW.creator_brief,
    client_objective=NEW.client_objective,
    report_summary=NEW.report_summary,
    report_insights=NEW.report_insights,
    report_recommendations=NEW.report_recommendations
  WHERE id=OLD.id;
END;

CREATE TRIGGER shortlists_compat_delete
INSTEAD OF DELETE ON shortlists
BEGIN
  DELETE FROM campaigns WHERE id=OLD.id;
END;

CREATE VIEW shortlist_creators AS
SELECT campaign_id AS shortlist_id,creator_id,created_at
FROM campaign_creators;

CREATE TRIGGER shortlist_creators_compat_insert
INSTEAD OF INSERT ON shortlist_creators
BEGIN
  INSERT OR IGNORE INTO campaign_creators (campaign_id,creator_id,created_at,status)
  VALUES (NEW.shortlist_id,NEW.creator_id,COALESCE(NEW.created_at,CURRENT_TIMESTAMP),'assigned');
END;

CREATE TRIGGER shortlist_creators_compat_update
INSTEAD OF UPDATE ON shortlist_creators
BEGIN
  UPDATE campaign_creators SET
    campaign_id=NEW.shortlist_id,
    creator_id=NEW.creator_id,
    created_at=NEW.created_at,
    updated_at=CURRENT_TIMESTAMP
  WHERE campaign_id=OLD.shortlist_id AND creator_id=OLD.creator_id;
END;

CREATE TRIGGER shortlist_creators_compat_delete
INSTEAD OF DELETE ON shortlist_creators
BEGIN
  DELETE FROM campaign_creators
  WHERE campaign_id=OLD.shortlist_id AND creator_id=OLD.creator_id;
END;

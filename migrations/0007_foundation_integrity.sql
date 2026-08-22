-- Foundation integrity: normalize creator email identity and establish one canonical
-- primary client per campaign while preserving campaign_clients as the access list.
--
-- Safety: the unique index intentionally fails if duplicate creator emails already
-- exist case-insensitively. Production must be preflighted before this migration is
-- applied; no duplicate creator records are deleted or merged automatically.

UPDATE creators
SET email = LOWER(TRIM(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_email_unique
ON creators(email COLLATE NOCASE);

ALTER TABLE campaigns
ADD COLUMN primary_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_primary_client
ON campaigns(primary_client_id);

UPDATE campaigns
SET primary_client_id = (
  SELECT MIN(cc.client_id)
  FROM campaign_clients cc
  WHERE cc.campaign_id = campaigns.id
)
WHERE primary_client_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM campaign_clients cc
    WHERE cc.campaign_id = campaigns.id
  );

UPDATE campaign_clients
SET role = CASE
  WHEN client_id = (SELECT primary_client_id FROM campaigns WHERE id = campaign_clients.campaign_id) THEN 'primary'
  ELSE 'client'
END;

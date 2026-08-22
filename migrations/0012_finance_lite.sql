ALTER TABLE campaigns ADD COLUMN commercial_value REAL NOT NULL DEFAULT 0 CHECK (commercial_value >= 0);
ALTER TABLE campaigns ADD COLUMN invoiced_amount REAL NOT NULL DEFAULT 0 CHECK (invoiced_amount >= 0);

CREATE TABLE IF NOT EXISTS campaign_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('production','media','other')),
  amount REAL NOT NULL CHECK (amount >= 0),
  vendor TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  incurred_at TEXT NOT NULL DEFAULT CURRENT_DATE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_costs_campaign
ON campaign_costs(campaign_id, incurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_costs_category
ON campaign_costs(campaign_id, category);

CREATE TABLE IF NOT EXISTS client_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  client_id INTEGER,
  amount REAL NOT NULL CHECK (amount >= 0),
  paid_at TEXT NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_client_payments_campaign
ON client_payments(campaign_id, paid_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_client_payments_client
ON client_payments(client_id);

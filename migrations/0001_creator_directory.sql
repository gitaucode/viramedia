CREATE TABLE IF NOT EXISTS creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'new',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  age_bracket TEXT,
  gender TEXT,
  tiktok TEXT NOT NULL,
  tiktok_followers TEXT,
  avg_views TEXT,
  instagram TEXT,
  instagram_followers TEXT,
  youtube TEXT,
  best_content TEXT,
  niches TEXT NOT NULL DEFAULT '[]',
  languages TEXT,
  formats TEXT NOT NULL DEFAULT '[]',
  brand_experience TEXT,
  past_brands TEXT,
  ugc TEXT,
  own_account TEXT,
  paid_usage TEXT,
  physical_shoots TEXT,
  travel TEXT,
  rate_range TEXT,
  portfolio TEXT,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_city ON creators(city);
CREATE INDEX IF NOT EXISTS idx_creators_created_at ON creators(created_at DESC);

CREATE TABLE IF NOT EXISTS shortlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shortlist_creators (
  shortlist_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (shortlist_id, creator_id),
  FOREIGN KEY (shortlist_id) REFERENCES shortlists(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

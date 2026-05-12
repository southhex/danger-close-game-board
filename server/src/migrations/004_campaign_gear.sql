CREATE TABLE campaign_gear (
  campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  gear_name   TEXT    NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  custom_name TEXT,
  custom_req  INTEGER,
  PRIMARY KEY (campaign_id, gear_name)
);

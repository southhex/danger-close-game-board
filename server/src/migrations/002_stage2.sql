-- Stage 2.1 — squads + missions tables, REQ + airspace columns on campaigns.
-- The legacy campaigns.current_mission JSON column is intentionally NOT dropped here;
-- Stage 2.6 performs the cutover once the runner reads from the missions table.

ALTER TABLE campaigns ADD COLUMN default_airspace   TEXT    NOT NULL DEFAULT 'contested';
ALTER TABLE campaigns ADD COLUMN req_enabled        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN req                INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN current_mission_id TEXT;

CREATE TABLE squads (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE missions (
  id           TEXT PRIMARY KEY,
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  data         TEXT NOT NULL,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_squads_campaign           ON squads(campaign_id);
CREATE INDEX idx_missions_campaign_status  ON missions(campaign_id, status);

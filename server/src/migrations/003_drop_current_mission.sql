-- Stage 6.1 — Drop legacy current_mission JSON column from campaigns.
-- Mission state is now authoritative in the missions table + current_mission_id FK.
-- SQLite 3.49.2 (bundled with better-sqlite3 ^11.9.1) supports DROP COLUMN (≥ 3.35).
ALTER TABLE campaigns DROP COLUMN current_mission;

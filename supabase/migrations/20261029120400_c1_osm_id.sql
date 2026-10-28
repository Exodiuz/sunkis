-- ══════════════════════════════════════════════════════
-- C1 — Plats från adressökningen i /submit
-- lat/lng finns redan; osm_id ("node/123") sparas när platsen kommer
-- från Photon/Nominatim i stället för Google Places.
-- ══════════════════════════════════════════════════════

ALTER TABLE bars ADD COLUMN IF NOT EXISTS osm_id TEXT;
CREATE INDEX IF NOT EXISTS bars_osm_id_idx ON bars(osm_id);

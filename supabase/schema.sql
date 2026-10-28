-- ══════════════════════════════════════════════════════
-- Sunkis — Databasschema för Supabase
-- Kör detta i: app.supabase.com → SQL Editor → Run
-- Kör därefter alla filer i supabase/migrations/ i namnordning.
-- Ändringar efter första versionen görs bara som nya migrationer.
-- ══════════════════════════════════════════════════════

-- Tabell: bars
-- Huvudtabellen med alla barer och deras priser
CREATE TABLE bars (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_place_id   TEXT UNIQUE,
  name              TEXT NOT NULL,
  address           TEXT,
  area              TEXT,             -- t.ex. "Södermalm", "Kungsholmen"
  lat               FLOAT,
  lng               FLOAT,
  opening_hours     JSONB,            -- { "monday": "15:00–01:00", ... }
  google_rating     FLOAT,
  photo_url         TEXT,
  website           TEXT,
  phone             TEXT,
  price_40cl        INT,              -- pris i kr för 40cl öl
  price_50cl        INT,              -- pris i kr för 50cl öl
  happy_hour_price  INT,              -- happy hour-pris
  happy_hour_start  TIME,             -- t.ex. 15:00
  happy_hour_end    TIME,             -- t.ex. 18:00
  happy_hour_days   TEXT[],           -- ["monday","tuesday","friday"]
  sunk_factor       FLOAT DEFAULT 0,  -- community-snitt 1–5
  sunk_votes        INT DEFAULT 0,
  price_verified    BOOLEAN DEFAULT false,
  price_thumbs_up   INT DEFAULT 0,
  price_thumbs_down INT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT now(),
  updated_at        TIMESTAMP DEFAULT now()
);

-- Tabell: sunk_votes
-- Community-röstning på sunkfaktor (1–5)
CREATE TABLE sunk_votes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id     UUID REFERENCES bars(id) ON DELETE CASCADE,
  score      INT CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT now()
);

-- Tabell: price_votes
-- Community-verifiering av priser (up = stämmer, down = stämmer inte)
CREATE TABLE price_votes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id     UUID REFERENCES bars(id) ON DELETE CASCADE,
  vote       TEXT CHECK (vote IN ('up','down')),
  created_at TIMESTAMP DEFAULT now()
);

-- ──────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- Alla kan läsa och skriva — ingen inloggning krävs
-- ──────────────────────────────────────────────────────

ALTER TABLE bars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alla kan läsa barer"      ON bars FOR SELECT USING (true);
CREATE POLICY "Alla kan skriva barer"    ON bars FOR INSERT WITH CHECK (true);
CREATE POLICY "Alla kan uppdatera barer" ON bars FOR UPDATE USING (true);
CREATE POLICY "Alla kan ta bort barer"   ON bars FOR DELETE USING (true);

ALTER TABLE sunk_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alla kan rösta sunkfaktor" ON sunk_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Alla kan läsa sunkröster"  ON sunk_votes FOR SELECT USING (true);

ALTER TABLE price_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alla kan rösta pris"     ON price_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Alla kan läsa prisröster" ON price_votes FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────
-- Index för vanliga sökningar
-- ──────────────────────────────────────────────────────

CREATE INDEX bars_area_idx        ON bars(area);
CREATE INDEX bars_price_40cl_idx  ON bars(price_40cl);
CREATE INDEX bars_price_50cl_idx  ON bars(price_50cl);
CREATE INDEX sunk_votes_bar_idx   ON sunk_votes(bar_id);
CREATE INDEX price_votes_bar_idx  ON price_votes(bar_id);

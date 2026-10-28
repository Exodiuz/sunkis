-- ══════════════════════════════════════════════════════
-- D2 — Prisförslag från besökare
-- Barer utan pris listas på /saknar-pris där vem som helst kan föreslå
-- ett pris. Förslagen granskas av admin innan de skrivs till bars (C2).
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS price_suggestions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id      UUID NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  price       INT NOT NULL CHECK (price BETWEEN 1 AND 999),
  size        TEXT NOT NULL DEFAULT '40cl' CHECK (size IN ('33cl', '40cl', '50cl')),
  device_id   TEXT CHECK (device_id IS NULL OR length(device_id) BETWEEN 8 AND 64),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_suggestions_status_idx ON price_suggestions(status, created_at);

-- Anon får bara skapa väntande förslag — läsning och granskning sker med service role
ALTER TABLE price_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alla kan föreslå pris" ON price_suggestions FOR INSERT
  WITH CHECK (status = 'pending');

-- ══════════════════════════════════════════════════════
-- D4 — Storlek för happy hour-priset
-- Priser jämförs per 40 cl; happy hour kan gälla en annan storlek.
-- ══════════════════════════════════════════════════════

ALTER TABLE bars
  ADD COLUMN IF NOT EXISTS happy_hour_size TEXT DEFAULT '40cl'
  CHECK (happy_hour_size IN ('33cl', '40cl', '50cl'));

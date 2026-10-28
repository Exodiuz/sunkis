-- ══════════════════════════════════════════════════════
-- F3 — Områden hämtas från datan
-- En vy med alla stadsdelar som förekommer bland barerna, för
-- områdesvalet i /submit. security_invoker gör att RLS på bars gäller.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE VIEW bar_areas
WITH (security_invoker = true) AS
SELECT DISTINCT trim(area) AS area
FROM bars
WHERE area IS NOT NULL AND trim(area) <> '';

GRANT SELECT ON bar_areas TO anon, authenticated;

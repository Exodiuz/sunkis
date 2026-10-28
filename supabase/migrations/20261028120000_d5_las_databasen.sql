-- ══════════════════════════════════════════════════════
-- D5 — Lås databasen
-- Anon får inte längre uppdatera eller radera barer. Röster skrivs bara
-- via vote_price/vote_sunk (security definer) som uppdaterar räknarna atomärt.
-- Admin skriver via server-routes med service role (går förbi RLS).
-- ══════════════════════════════════════════════════════

-- ── bars ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Alla kan uppdatera barer" ON bars;
DROP POLICY IF EXISTS "Alla kan ta bort barer"   ON bars;
DROP POLICY IF EXISTS "Alla kan skriva barer"    ON bars;

-- Inskick via /submit: alltid ogranskade och utan röster
CREATE POLICY "Alla kan föreslå barer" ON bars FOR INSERT
  WITH CHECK (
    price_verified = false
    AND COALESCE(price_thumbs_up, 0) = 0
    AND COALESCE(price_thumbs_down, 0) = 0
    AND COALESCE(sunk_votes, 0) = 0
    AND COALESCE(sunk_factor, 0) BETWEEN 0 AND 5
  );

-- ── röst-tabellerna ───────────────────────────────────
ALTER TABLE price_votes ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE sunk_votes  ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Direkt skrivning och läsning stängs — enhets-id ska inte vara publika
DROP POLICY IF EXISTS "Alla kan rösta pris"       ON price_votes;
DROP POLICY IF EXISTS "Alla kan läsa prisröster"  ON price_votes;
DROP POLICY IF EXISTS "Alla kan rösta sunkfaktor" ON sunk_votes;
DROP POLICY IF EXISTS "Alla kan läsa sunkröster"  ON sunk_votes;

-- ── vote_price ────────────────────────────────────────
-- Sparar en prisröst och räknar upp tumme upp/ner i samma transaktion.
-- Returnerar de nya räknarna: { price_thumbs_up, price_thumbs_down }
CREATE OR REPLACE FUNCTION public.vote_price(bar_id UUID, vote TEXT, device_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF vote_price.vote IS NULL OR vote_price.vote NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Ogiltig röst' USING ERRCODE = '22023';
  END IF;
  IF vote_price.device_id IS NULL OR length(vote_price.device_id) NOT BETWEEN 8 AND 64 THEN
    RAISE EXCEPTION 'Ogiltigt enhets-id' USING ERRCODE = '22023';
  END IF;

  INSERT INTO price_votes (bar_id, vote, device_id)
  VALUES (vote_price.bar_id, vote_price.vote, vote_price.device_id);

  UPDATE bars b SET
    price_thumbs_up   = COALESCE(b.price_thumbs_up, 0)   + CASE WHEN vote_price.vote = 'up'   THEN 1 ELSE 0 END,
    price_thumbs_down = COALESCE(b.price_thumbs_down, 0) + CASE WHEN vote_price.vote = 'down' THEN 1 ELSE 0 END
  WHERE b.id = vote_price.bar_id
  RETURNING json_build_object(
    'price_thumbs_up', b.price_thumbs_up,
    'price_thumbs_down', b.price_thumbs_down
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Baren finns inte' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;

-- ── vote_sunk ─────────────────────────────────────────
-- Sparar en sunkröst (1–5) och uppdaterar snittet i samma transaktion.
-- Returnerar { sunk_factor, sunk_votes }
CREATE OR REPLACE FUNCTION public.vote_sunk(bar_id UUID, score INT, device_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF vote_sunk.score IS NULL OR vote_sunk.score NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Ogiltig poäng' USING ERRCODE = '22023';
  END IF;
  IF vote_sunk.device_id IS NULL OR length(vote_sunk.device_id) NOT BETWEEN 8 AND 64 THEN
    RAISE EXCEPTION 'Ogiltigt enhets-id' USING ERRCODE = '22023';
  END IF;

  INSERT INTO sunk_votes (bar_id, score, device_id)
  VALUES (vote_sunk.bar_id, vote_sunk.score, vote_sunk.device_id);

  UPDATE bars b SET
    sunk_factor = (COALESCE(b.sunk_factor, 0) * COALESCE(b.sunk_votes, 0) + vote_sunk.score)
                  / (COALESCE(b.sunk_votes, 0) + 1),
    sunk_votes  = COALESCE(b.sunk_votes, 0) + 1
  WHERE b.id = vote_sunk.bar_id
  RETURNING json_build_object(
    'sunk_factor', b.sunk_factor,
    'sunk_votes', b.sunk_votes
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Baren finns inte' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.vote_price(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vote_sunk(UUID, INT, TEXT)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_price(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vote_sunk(UUID, INT, TEXT)   TO anon, authenticated;

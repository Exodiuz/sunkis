-- ══════════════════════════════════════════════════════
-- D3 — Färskhet
-- price_confirmed_at sätts när admin verifierar ett pris
-- (/api/admin/bars och approve_price_suggestion) och vid tumme upp.
-- Priser äldre än 90 dagar märks "Kan vara inaktuellt" i UI:t.
-- ══════════════════════════════════════════════════════

ALTER TABLE bars ADD COLUMN IF NOT EXISTS price_confirmed_at TIMESTAMPTZ;

-- Befintliga verifierade priser räknas som bekräftade när de senast uppdaterades
UPDATE bars SET price_confirmed_at = updated_at
WHERE price_verified = true AND price_confirmed_at IS NULL;

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

  -- Lås baren så att två samtidiga röster från samma enhet inte båda går igenom
  PERFORM 1 FROM bars b WHERE b.id = vote_price.bar_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM price_votes pv
    WHERE pv.bar_id = vote_price.bar_id
      AND pv.device_id = vote_price.device_id
      AND pv.created_at > now() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Du har redan röstat på priset' USING ERRCODE = 'SK001';
  END IF;

  INSERT INTO price_votes (bar_id, vote, device_id)
  VALUES (vote_price.bar_id, vote_price.vote, vote_price.device_id);

  UPDATE bars b SET
    price_thumbs_up   = COALESCE(b.price_thumbs_up, 0)   + CASE WHEN vote_price.vote = 'up'   THEN 1 ELSE 0 END,
    price_thumbs_down = COALESCE(b.price_thumbs_down, 0) + CASE WHEN vote_price.vote = 'down' THEN 1 ELSE 0 END,
    -- Tumme upp bekräftar att priset fortfarande stämmer (D3)
    price_confirmed_at = CASE WHEN vote_price.vote = 'up' THEN now() ELSE b.price_confirmed_at END
  WHERE b.id = vote_price.bar_id
  RETURNING json_build_object(
    'price_thumbs_up', b.price_thumbs_up,
    'price_thumbs_down', b.price_thumbs_down,
    'price_confirmed_at', b.price_confirmed_at
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Baren finns inte' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;

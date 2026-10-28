-- ══════════════════════════════════════════════════════
-- C3 — En röst per enhet och bar per 24 h
-- Enhets-id (uuid i localStorage) skickas redan med varje röst sedan D5.
-- Här spärras nya röster från samma enhet på samma bar inom 24 timmar.
-- Felkoden SK001 känns igen av klienten ("Du har redan röstat").
-- ══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS price_votes_device_idx ON price_votes(bar_id, device_id, created_at);
CREATE INDEX IF NOT EXISTS sunk_votes_device_idx  ON sunk_votes(bar_id, device_id, created_at);

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

  PERFORM 1 FROM bars b WHERE b.id = vote_sunk.bar_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM sunk_votes sv
    WHERE sv.bar_id = vote_sunk.bar_id
      AND sv.device_id = vote_sunk.device_id
      AND sv.created_at > now() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Du har redan röstat på sunkfaktorn' USING ERRCODE = 'SK001';
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

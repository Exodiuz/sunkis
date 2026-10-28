-- ══════════════════════════════════════════════════════
-- B1 — Sunkfaktorn räknas om från sunk_votes
-- vote_sunk sätter sunk_factor = AVG(score) och sunk_votes = COUNT(*)
-- från tabellen, så att snittet alltid stämmer med rösterna.
-- Obs: barer vars snitt bara finns i bars (t.ex. seed-data utan rader i
-- sunk_votes) får ett nytt snitt baserat på riktiga röster vid första rösten.
-- ══════════════════════════════════════════════════════

-- Barer som redan har röster i tabellen räknas om direkt
UPDATE bars b SET
  sunk_factor = s.avg_score,
  sunk_votes  = s.n
FROM (
  SELECT bar_id, AVG(score)::FLOAT AS avg_score, COUNT(*)::INT AS n
  FROM sunk_votes
  GROUP BY bar_id
) s
WHERE b.id = s.bar_id;

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

  -- Räkna om snitt och antal från alla röster i stället för att uppdatera inkrementellt
  UPDATE bars b SET
    sunk_factor = s.avg_score,
    sunk_votes  = s.n
  FROM (
    SELECT AVG(sv.score)::FLOAT AS avg_score, COUNT(*)::INT AS n
    FROM sunk_votes sv
    WHERE sv.bar_id = vote_sunk.bar_id
  ) s
  WHERE b.id = vote_sunk.bar_id
  RETURNING json_build_object(
    'sunk_factor', b.sunk_factor,
    'sunk_votes', b.sunk_votes,
    'your_score', vote_sunk.score
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Baren finns inte' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;

-- ══════════════════════════════════════════════════════
-- C2 — Granska prisförslag
-- Förslag kommer från /saknar-pris (D2) och efter tumme ner på
-- detaljsidan. Admin godkänner eller avvisar via review_price_suggestion,
-- som bara service role får anropa (admin-API:t).
-- ══════════════════════════════════════════════════════

ALTER TABLE price_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.review_price_suggestion(suggestion_id UUID, approve BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s price_suggestions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM price_suggestions ps
  WHERE ps.id = review_price_suggestion.suggestion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Förslaget finns inte' USING ERRCODE = 'P0002';
  END IF;
  IF s.status <> 'pending' THEN
    RAISE EXCEPTION 'Förslaget är redan granskat' USING ERRCODE = '22023';
  END IF;

  IF review_price_suggestion.approve THEN
    IF s.size NOT IN ('40cl', '50cl') THEN
      RAISE EXCEPTION 'Bara 40 cl och 50 cl kan godkännas direkt' USING ERRCODE = '22023';
    END IF;

    -- Nytt pris: verifierat, bekräftat nu och med nollställda prisröster
    UPDATE bars b SET
      price_40cl         = CASE WHEN s.size = '40cl' THEN s.price ELSE b.price_40cl END,
      price_50cl         = CASE WHEN s.size = '50cl' THEN s.price ELSE b.price_50cl END,
      price_verified     = true,
      price_confirmed_at = now(),
      price_thumbs_up    = 0,
      price_thumbs_down  = 0,
      updated_at         = now()
    WHERE b.id = s.bar_id;
  END IF;

  UPDATE price_suggestions ps SET
    status      = CASE WHEN review_price_suggestion.approve THEN 'approved' ELSE 'rejected' END,
    reviewed_at = now()
  WHERE ps.id = s.id;

  RETURN json_build_object('id', s.id, 'bar_id', s.bar_id, 'approved', review_price_suggestion.approve);
END;
$$;

REVOKE ALL ON FUNCTION public.review_price_suggestion(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_price_suggestion(UUID, BOOLEAN) TO service_role;

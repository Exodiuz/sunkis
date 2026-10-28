-- Körd mot produktionsdatabasen 2026-06-06 och inlagd i repot i efterhand
-- (SQL hämtad oförändrad från supabase_migrations.schema_migrations).

-- Röst-tabellerna är skriv-bara (bara INSERT); appen läser aldrig dem direkt
-- (aggregaten ligger på bars). Ta bort onödig läs-exponering.
revoke select on public.sunk_votes from anon, authenticated;
revoke select on public.price_votes from anon, authenticated;

-- Körd mot produktionsdatabasen 2026-06-06 och inlagd i repot i efterhand
-- (SQL hämtad oförändrad från supabase_migrations.schema_migrations).

-- Trigger-funktionerna ska bara köras av triggern (som tabellägare), aldrig
-- anropas direkt via PostgREST RPC. Återkalla EXECUTE från publika roller.
revoke execute on function public.apply_sunk_vote() from public, anon, authenticated;
revoke execute on function public.apply_price_vote() from public, anon, authenticated;

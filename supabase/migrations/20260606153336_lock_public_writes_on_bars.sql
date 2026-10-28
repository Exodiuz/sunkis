-- Körd mot produktionsdatabasen 2026-06-06 och inlagd i repot i efterhand
-- (SQL hämtad oförändrad från supabase_migrations.schema_migrations).

-- Stäng publik skrivning på bars. SELECT (publik läsning) behålls.
-- Skrivning sker nu bara server-side via service_role (kringgår RLS).
drop policy if exists "Alla kan skriva barer"   on public.bars;  -- INSERT
drop policy if exists "Alla kan uppdatera barer" on public.bars;  -- UPDATE
drop policy if exists "Alla kan ta bort barer"   on public.bars;  -- DELETE
-- "Alla kan läsa barer" (SELECT) lämnas orörd.

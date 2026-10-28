-- Körd mot produktionsdatabasen 2026-06-06 och inlagd i repot i efterhand
-- (SQL hämtad oförändrad från supabase_migrations.schema_migrations).

alter table public.bars add column if not exists tags  text[];
alter table public.bars add column if not exists blurb text;

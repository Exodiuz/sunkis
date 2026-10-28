-- Körd mot produktionsdatabasen 2026-06-06 och inlagd i repot i efterhand
-- (SQL hämtad oförändrad från supabase_migrations.schema_migrations).

-- enhetlig area-benämning
update public.bars set area = 'Norrmalm' where area = 'City';

-- röster ska följa med när en bar tas bort (admin-delete via service_role)
alter table public.price_votes drop constraint if exists price_votes_bar_id_fkey;
alter table public.price_votes
  add constraint price_votes_bar_id_fkey foreign key (bar_id) references public.bars(id) on delete cascade;

alter table public.sunk_votes drop constraint if exists sunk_votes_bar_id_fkey;
alter table public.sunk_votes
  add constraint sunk_votes_bar_id_fkey foreign key (bar_id) references public.bars(id) on delete cascade;

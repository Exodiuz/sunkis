-- Körd mot produktionsdatabasen 2026-06-06 och inlagd i repot i efterhand
-- (SQL hämtad oförändrad från supabase_migrations.schema_migrations).

-- Aggregat-uppdateringar för röster körs via SECURITY DEFINER så att anon
-- (som inte längre får skriva bars) ändå kan rösta. Funktionerna ägs av
-- postgres och kringgår RLS endast för just dessa aggregat.

create or replace function public.apply_sunk_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.bars
     set sunk_factor = ((coalesce(sunk_factor,0) * coalesce(sunk_votes,0)) + NEW.score) / (coalesce(sunk_votes,0) + 1),
         sunk_votes  = coalesce(sunk_votes,0) + 1,
         updated_at  = now()
   where id = NEW.bar_id;
  return NEW;
end $$;

drop trigger if exists trg_apply_sunk_vote on public.sunk_votes;
create trigger trg_apply_sunk_vote after insert on public.sunk_votes
  for each row execute function public.apply_sunk_vote();

create or replace function public.apply_price_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.bars
     set price_thumbs_up   = coalesce(price_thumbs_up,0)   + (NEW.vote = 'up')::int,
         price_thumbs_down = coalesce(price_thumbs_down,0) + (NEW.vote = 'down')::int,
         updated_at        = now()
   where id = NEW.bar_id;
  return NEW;
end $$;

drop trigger if exists trg_apply_price_vote on public.price_votes;
create trigger trg_apply_price_vote after insert on public.price_votes
  for each row execute function public.apply_price_vote();

-- All-time visit counter (the 👁 number next to "players online").
-- Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
create table if not exists public.site_stats (
  id int primary key default 1 check (id = 1),
  visits bigint not null default 0
);
insert into public.site_stats (id, visits) values (1, 0) on conflict (id) do nothing;
-- No direct table access: players only go through the two functions below.
alter table public.site_stats enable row level security;

-- +1 visit, returns the new total.
create or replace function public.record_visit()
returns bigint language sql security definer set search_path = public as $$
  update public.site_stats set visits = visits + 1 where id = 1 returning visits;
$$;

-- Current total.
create or replace function public.visit_count()
returns bigint language sql stable security definer set search_path = public as $$
  select visits from public.site_stats where id = 1;
$$;

revoke all on function public.record_visit() from public;
revoke all on function public.visit_count() from public;
grant execute on function public.record_visit() to anon, authenticated;
grant execute on function public.visit_count() to anon, authenticated;

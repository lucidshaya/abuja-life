-- Abuja Life online features. Run this once in Supabase → SQL Editor → New query → Run.
-- Also: Authentication → Sign In / Providers → Email → turn OFF "Confirm email".
-- Players log in with just their email (no verification): the same email opens the
-- same account and game save on any device. Emails stay private inside Supabase Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index if not exists messages_to_idx on public.messages (to_id, created_at desc);
create index if not exists messages_from_idx on public.messages (from_id, created_at desc);

create table if not exists public.transfers (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount between 1 and 5000000),
  note text check (char_length(note) <= 80),
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index if not exists transfers_to_idx on public.transfers (to_id) where not claimed;

alter table public.saves enable row level security;
drop policy if exists "save own" on public.saves;
create policy "save own" on public.saves for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.transfers enable row level security;

-- Profiles: signed-in players can look up usernames; you can only create/edit your own.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Messages: you send as yourself and read only your own conversations.
drop policy if exists "messages send" on public.messages;
create policy "messages send" on public.messages for insert to authenticated with check (from_id = auth.uid());
drop policy if exists "messages read own" on public.messages;
create policy "messages read own" on public.messages for select to authenticated using (auth.uid() in (from_id, to_id));

-- Transfers: you send as yourself, see only your own; claiming happens through claim_transfers().
drop policy if exists "transfers send" on public.transfers;
create policy "transfers send" on public.transfers for insert to authenticated with check (from_id = auth.uid() and claimed = false);
drop policy if exists "transfers read own" on public.transfers;
create policy "transfers read own" on public.transfers for select to authenticated using (auth.uid() in (from_id, to_id));

-- Hands each unclaimed transfer to its receiver exactly once.
create or replace function public.claim_transfers()
returns table (id bigint, from_id uuid, from_username text, to_id uuid, amount integer, note text, created_at timestamptz)
language sql security definer set search_path = public as $$
  with claimed as (
    update public.transfers t set claimed = true
    where t.to_id = auth.uid() and not t.claimed
    returning t.id, t.from_id, t.to_id, t.amount, t.note, t.created_at
  )
  select c.id, c.from_id, p.username, c.to_id, c.amount, c.note, c.created_at
  from claimed c left join public.profiles p on p.id = c.from_id;
$$;
revoke all on function public.claim_transfers() from public, anon;
grant execute on function public.claim_transfers() to authenticated;

-- Live updates for new messages and transfers.
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.transfers; exception when duplicate_object then null; end;
end $$;

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

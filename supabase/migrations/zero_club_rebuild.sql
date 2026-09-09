-- Zero Club rebuild: progress, clubs, leaderboards.
--
-- Until now a member's progress lived in auth.users.user_metadata, which only
-- that member's own session can read. Club standings and leaderboards are
-- queries across people, so progress has to live somewhere other members can
-- actually read — under rules that say exactly how much they get to see.

-- ── Identity + progress ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  handle         text not null unique check (char_length(handle) between 3 and 24),
  display_name   text check (char_length(display_name) <= 40),
  starting_debt  numeric(12,2) not null default 0 check (starting_debt >= 0),
  current_debt   numeric(12,2) not null default 0 check (current_debt >= 0),
  goal_date      date,
  -- Members who would rather not publish balances still appear on standings;
  -- percentages are the currency of this product, dollars are optional.
  show_amounts   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Clubs ──────────────────────────────────────────────────────────────────
create table if not exists public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 50),
  -- What gets texted to a friend. Short enough to read aloud.
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7)),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id   uuid not null references public.clubs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists club_members_user_idx on public.club_members(user_id);

-- ── Payments ───────────────────────────────────────────────────────────────
-- Promoted out of user_metadata: "eliminated this month" is a leaderboard
-- column, so it has to be summable per member by the database.
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists payments_user_date_idx on public.payments(user_id, created_at desc);

-- Posts become club-aware so a club feed can be its own room.
alter table public.posts add column if not exists club_id uuid references public.clubs(id) on delete cascade;
create index if not exists posts_club_idx on public.posts(club_id, created_at desc);

-- ── Membership helper ──────────────────────────────────────────────────────
-- SECURITY DEFINER on purpose: a policy on club_members that queries
-- club_members recurses forever. This reads the table with the definer's
-- rights, breaking the cycle.
create or replace function public.shares_club_with(other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from club_members mine
    join club_members theirs on theirs.club_id = mine.club_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other
  );
$$;

create or replace function public.is_club_member(club uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from club_members
    where club_id = club and user_id = auth.uid()
  );
$$;

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.clubs        enable row level security;
alter table public.club_members enable row level security;
alter table public.payments     enable row level security;

-- Profiles: yours, plus anyone you share a club with. Not the whole userbase.
drop policy if exists "Read own and clubmate profiles" on public.profiles;
create policy "Read own and clubmate profiles"
  on public.profiles for select
  using (id = auth.uid() or public.shares_club_with(id));

drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile"
  on public.profiles for insert with check (id = auth.uid());

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile"
  on public.profiles for update using (id = auth.uid());

-- Clubs are not browsable. You reach one by invite code, through join_club().
drop policy if exists "Read clubs you belong to" on public.clubs;
create policy "Read clubs you belong to"
  on public.clubs for select using (public.is_club_member(id));

drop policy if exists "Create clubs" on public.clubs;
create policy "Create clubs"
  on public.clubs for insert with check (created_by = auth.uid());

drop policy if exists "Owner updates club" on public.clubs;
create policy "Owner updates club"
  on public.clubs for update using (created_by = auth.uid());

drop policy if exists "Read fellow members" on public.club_members;
create policy "Read fellow members"
  on public.club_members for select using (public.is_club_member(club_id));

drop policy if exists "Join as yourself" on public.club_members;
create policy "Join as yourself"
  on public.club_members for insert with check (user_id = auth.uid());

drop policy if exists "Leave a club" on public.club_members;
create policy "Leave a club"
  on public.club_members for delete using (user_id = auth.uid());

-- Payments: your own in full; clubmates' only in aggregate, via the view below.
drop policy if exists "Read own payments" on public.payments;
create policy "Read own payments"
  on public.payments for select using (user_id = auth.uid());

drop policy if exists "Log own payments" on public.payments;
create policy "Log own payments"
  on public.payments for insert with check (user_id = auth.uid());

drop policy if exists "Delete own payments" on public.payments;
create policy "Delete own payments"
  on public.payments for delete using (user_id = auth.uid());

-- ── Club standings ─────────────────────────────────────────────────────────
-- One row per member per club: the numbers a standings table needs, with
-- dollars nulled out for anyone who chose to keep them private. Percentages
-- always show — that is what the leaderboard ranks on, and it puts a $2k
-- member and a $200k member on the same footing.
create or replace function public.club_standings(club uuid)
returns table (
  user_id        uuid,
  handle         text,
  display_name   text,
  progress_pct   numeric,
  eliminated     numeric,
  current_debt   numeric,
  month_paid     numeric,
  joined_at      timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.handle,
    p.display_name,
    case when p.starting_debt > 0
      then round(((p.starting_debt - p.current_debt) / p.starting_debt) * 100, 1)
      else 0 end,
    case when p.show_amounts then p.starting_debt - p.current_debt end,
    case when p.show_amounts then p.current_debt end,
    case when p.show_amounts then coalesce((
      select sum(pay.amount) from payments pay
      where pay.user_id = p.id
        and pay.created_at >= date_trunc('month', now())
    ), 0) end,
    m.joined_at
  from club_members m
  join profiles p on p.id = m.user_id
  where m.club_id = club
    and public.is_club_member(club)   -- non-members get an empty set, not a leak
  order by 4 desc;
$$;

-- ── Joining by code ────────────────────────────────────────────────────────
-- Clubs are unlistable, so joining needs a definer-rights lookup. Returns the
-- club id on success and null for a bad code, without revealing anything else.
create or replace function public.join_club(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target uuid;
begin
  select id into target from clubs where invite_code = upper(trim(code));
  if target is null then return null; end if;

  insert into club_members (club_id, user_id)
  values (target, auth.uid())
  on conflict do nothing;

  return target;
end;
$$;

-- ── Keep updated_at honest ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

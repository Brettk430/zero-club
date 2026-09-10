-- Viewable member profiles, and the friend graph behind them.
--
-- Privacy decisions baked in here, since they are easier to argue about in one
-- place than to find scattered through the UI:
--
--   * A profile is viewable by any signed-in member. This is a social product
--     and a profile nobody can open is not a profile.
--   * Dollar amounts still obey show_amounts. Percentages, badges and streaks
--     are the public surface; balances remain the member's own call.
--   * Only PUBLIC clubs appear on a profile. Listing someone's private clubs
--     would leak a private group's membership roster to anyone who looked.
--   * Nothing here exposes an email address.

-- ── Friends ────────────────────────────────────────────────────────────────
-- Mutual by request rather than one-way following: "mutual friends" only means
-- something if the edge is agreed at both ends.
create table if not exists public.friendships (
  requester    uuid not null references auth.users(id) on delete cascade,
  addressee    uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester, addressee),
  constraint no_self_friending check (requester <> addressee)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee, status);
create index if not exists friendships_requester_idx on public.friendships (requester, status);

alter table public.friendships enable row level security;

drop policy if exists "See your own edges" on public.friendships;
create policy "See your own edges"
  on public.friendships for select
  using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists "Send your own requests" on public.friendships;
create policy "Send your own requests"
  on public.friendships for insert
  with check (requester = auth.uid());

-- Only the person who received it can accept it.
drop policy if exists "Answer requests sent to you" on public.friendships;
create policy "Answer requests sent to you"
  on public.friendships for update
  using (addressee = auth.uid());

drop policy if exists "Withdraw or unfriend" on public.friendships;
create policy "Withdraw or unfriend"
  on public.friendships for delete
  using (requester = auth.uid() or addressee = auth.uid());

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- ── Derived stats ──────────────────────────────────────────────────────────
-- Badge thresholds mirror MILESTONES in src/lib/zero.js. Kept here too because
-- a viewer's browser cannot see someone else's balances to derive them.
create or replace function public.badge_count(starting numeric, current numeric)
returns int language sql immutable as $$
  select (
    (select count(*) from unnest(array[1000, 5000, 10000, 25000, 50000]) t
      where greatest(0, starting - current) >= t)
    +
    (select count(*) from unnest(array[10, 25, 50, 75, 90, 100]) t
      where starting > 0 and (greatest(0, starting - current) / starting * 100) >= t)
  )::int;
$$;

-- Consecutive months with a payment, ending this month or last. Missing the
-- current month does not break a streak until the month is actually over —
-- nobody should watch their streak die on the 2nd.
create or replace function public.payment_streak(member uuid)
returns int language sql security definer set search_path = public stable as $$
  with months as (
    select distinct date_trunc('month', created_at) as m
    from payments where user_id = member
  ),
  anchor as (
    select case
      when exists (select 1 from months where m = date_trunc('month', now()))
        then date_trunc('month', now())
      else date_trunc('month', now()) - interval '1 month'
    end as a
  ),
  probe as (
    select i, exists (
      select 1 from months
      where m = (select a from anchor) - (i || ' months')::interval
    ) as present
    from generate_series(0, 119) i
  )
  select coalesce((select min(i) from probe where not present), 120)::int;
$$;

-- ── The profile a visitor sees ─────────────────────────────────────────────
create or replace function public.member_profile(target_handle text)
returns table (
  user_id        uuid,
  handle         text,
  display_name   text,
  avatar_url     text,
  progress_pct   numeric,
  eliminated     numeric,
  starting_debt  numeric,
  badges         int,
  streak_months  int,
  member_since   timestamptz,
  friend_count   int,
  mutual_friends int,
  club_count     int,
  is_self        boolean,
  friend_status  text          -- none | pending_out | pending_in | friends
)
language sql security definer set search_path = public stable as $$
  select
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    case when p.starting_debt > 0
      then round((greatest(0, p.starting_debt - p.current_debt) / p.starting_debt) * 100, 1)
      else 0 end,
    case when p.show_amounts or p.id = auth.uid()
      then greatest(0, p.starting_debt - p.current_debt) end,
    case when p.show_amounts or p.id = auth.uid() then p.starting_debt end,
    public.badge_count(p.starting_debt, p.current_debt),
    public.payment_streak(p.id),
    p.created_at,
    (select count(*)::int from friendships f
      where f.status = 'accepted' and (f.requester = p.id or f.addressee = p.id)),
    -- friends of theirs who are also friends of mine
    (select count(*)::int from (
        select case when f.requester = p.id then f.addressee else f.requester end as other
        from friendships f
        where f.status = 'accepted' and (f.requester = p.id or f.addressee = p.id)
      ) theirs
      where theirs.other <> auth.uid() and public.are_friends(theirs.other, auth.uid())),
    (select count(*)::int from club_members m
      join clubs c on c.id = m.club_id
      where m.user_id = p.id and c.is_public),
    p.id = auth.uid(),
    case
      when p.id = auth.uid() then 'self'
      when public.are_friends(p.id, auth.uid()) then 'friends'
      when exists (select 1 from friendships f where f.requester = auth.uid() and f.addressee = p.id) then 'pending_out'
      when exists (select 1 from friendships f where f.requester = p.id and f.addressee = auth.uid()) then 'pending_in'
      else 'none'
    end
  from profiles p
  where lower(p.handle) = lower(trim(target_handle))
    and auth.uid() is not null;   -- signed-out visitors see nothing
$$;

-- Public clubs only, for the same reason as above.
create or replace function public.member_clubs(target_handle text)
returns table (id uuid, name text, category text, member_count int)
language sql security definer set search_path = public stable as $$
  select c.id, c.name, c.category,
         (select count(*)::int from club_members m2 where m2.club_id = c.id)
  from profiles p
  join club_members m on m.user_id = p.id
  join clubs c on c.id = m.club_id
  where lower(p.handle) = lower(trim(target_handle))
    and c.is_public
    and auth.uid() is not null
  order by 4 desc;
$$;

-- ── Badge leaderboard ──────────────────────────────────────────────────────
-- Ranked on badges earned, which is a record of what someone has done rather
-- than of how much they happened to owe.
create or replace function public.badge_leaderboard(limit_count int default 25)
returns table (
  user_id      uuid,
  handle       text,
  avatar_url   text,
  badges       int,
  progress_pct numeric,
  streak_months int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.handle, p.avatar_url,
         public.badge_count(p.starting_debt, p.current_debt),
         case when p.starting_debt > 0
           then round((greatest(0, p.starting_debt - p.current_debt) / p.starting_debt) * 100, 1)
           else 0 end,
         public.payment_streak(p.id)
  from profiles p
  where auth.uid() is not null and p.starting_debt > 0
  order by 4 desc, 5 desc
  limit least(coalesce(limit_count, 25), 100);
$$;

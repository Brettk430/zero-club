-- Unread markers for club chat, and an admin view of the whole app.

-- ── Unread ────────────────────────────────────────────────────────────────
-- One row per member per club, holding the moment they last looked. Counting
-- from a timestamp rather than storing per-message read receipts keeps this to
-- a single row per membership no matter how much a club talks.
create table if not exists public.club_reads (
  club_id      uuid not null references public.clubs(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

alter table public.club_reads enable row level security;

drop policy if exists "Own read markers" on public.club_reads;
create policy "Own read markers"
  on public.club_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Unread per club for the caller. A club never looked at counts everything in
-- it, which is what a member would expect on first visit.
create or replace function public.club_unread()
returns table (club_id uuid, unread int)
language sql security definer set search_path = public stable as $$
  select m.club_id,
         (select count(*)::int
            from club_messages msg
           where msg.club_id = m.club_id
             and msg.user_id <> auth.uid()          -- your own messages are not news
             and msg.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz))
    from club_members m
    left join club_reads r on r.club_id = m.club_id and r.user_id = auth.uid()
   where m.user_id = auth.uid();
$$;

create or replace function public.mark_club_read(club uuid)
returns void language sql security definer set search_path = public as $$
  insert into club_reads (club_id, user_id, last_read_at)
  values (club, auth.uid(), now())
  on conflict (club_id, user_id) do update set last_read_at = now();
$$;

-- ── Admin ─────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_admin boolean not null default false;

update public.profiles p
   set is_admin = true
  from auth.users u
 where u.id = p.id and lower(u.email) = 'brettkreider11@gmail.com';

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Every function below returns nothing at all unless the caller is an admin.
-- The check lives inside each one rather than in the UI, so hiding the page is
-- a convenience and not the security boundary.
create or replace function public.admin_overview()
returns table (
  members            int,
  members_with_plan  int,
  active_7d          int,
  clubs              int,
  public_clubs       int,
  payments           int,
  eliminated_total    numeric,
  eliminated_30d     numeric,
  posts              int,
  messages           int,
  friendships        int
)
language sql security definer set search_path = public stable as $$
  select
    (select count(*)::int from profiles),
    (select count(*)::int from profiles where starting_debt > 0),
    (select count(distinct user_id)::int from payments where created_at > now() - interval '7 days'),
    (select count(*)::int from clubs),
    (select count(*)::int from clubs where is_public),
    (select count(*)::int from payments),
    (select coalesce(sum(greatest(0, starting_debt - current_debt)), 0) from profiles),
    (select coalesce(sum(amount), 0) from payments where created_at > now() - interval '30 days'),
    (select count(*)::int from posts),
    (select count(*)::int from club_messages),
    (select count(*)::int from friendships where status = 'accepted')
  where public.is_admin();
$$;

create or replace function public.admin_members()
returns table (
  user_id       uuid,
  handle        text,
  display_name  text,
  avatar_url    text,
  starting_debt numeric,
  current_debt  numeric,
  eliminated    numeric,
  progress_pct  numeric,
  payments      int,
  last_payment  timestamptz,
  clubs         int,
  friends       int,
  joined        timestamptz
)
language sql security definer set search_path = public stable as $$
  select
    p.id, p.handle, p.display_name, p.avatar_url,
    p.starting_debt, p.current_debt,
    greatest(0, p.starting_debt - p.current_debt),
    case when p.starting_debt > 0
      then round((greatest(0, p.starting_debt - p.current_debt) / p.starting_debt) * 100, 1)
      else 0 end,
    (select count(*)::int from payments pay where pay.user_id = p.id),
    (select max(created_at) from payments pay where pay.user_id = p.id),
    (select count(*)::int from club_members m where m.user_id = p.id),
    (select count(*)::int from friendships f where f.status = 'accepted' and (f.requester = p.id or f.addressee = p.id)),
    p.created_at
  from profiles p
  where public.is_admin()
  order by p.created_at desc;
$$;

-- A single stream of what has happened, newest first.
create or replace function public.admin_activity(limit_count int default 60)
returns table (kind text, handle text, detail text, at timestamptz)
language sql security definer set search_path = public stable as $$
  select * from (
    select 'payment'::text, p.handle, '$' || round(pay.amount)::text || ' eliminated', pay.created_at
      from payments pay join profiles p on p.id = pay.user_id where public.is_admin()
    union all
    select 'joined', p.handle, 'created an account', p.created_at
      from profiles p where public.is_admin()
    union all
    select 'club', p.handle, 'joined ' || c.name, m.joined_at
      from club_members m join profiles p on p.id = m.user_id join clubs c on c.id = m.club_id
     where public.is_admin()
    union all
    select 'message', p.handle, 'posted in ' || c.name, msg.created_at
      from club_messages msg join profiles p on p.id = msg.user_id join clubs c on c.id = msg.club_id
     where public.is_admin()
  ) x
  order by x.at desc
  limit least(coalesce(limit_count, 60), 200);
$$;

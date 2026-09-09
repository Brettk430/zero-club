-- Club chat and opt-in avatars.
--
-- Chat was tried once before as cohort rooms and retired: a handful of members
-- spread across five public rooms produced five empty rooms. A club is the
-- opposite shape — small, private, and full of people who already know each
-- other — which is the condition under which a room is worth opening.

create table if not exists public.club_messages (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists club_messages_club_idx
  on public.club_messages (club_id, created_at desc);

alter table public.club_messages enable row level security;

drop policy if exists "Read messages in your clubs" on public.club_messages;
create policy "Read messages in your clubs"
  on public.club_messages for select
  using (public.is_club_member(club_id));

-- Membership is checked on write too: without it a member could post into any
-- club whose id they happened to learn.
drop policy if exists "Post to your own clubs" on public.club_messages;
create policy "Post to your own clubs"
  on public.club_messages for insert
  with check (user_id = auth.uid() and public.is_club_member(club_id));

drop policy if exists "Delete your own messages" on public.club_messages;
create policy "Delete your own messages"
  on public.club_messages for delete
  using (user_id = auth.uid());

-- ── Avatars ────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Stored as <user id>/<file>, so the folder is the owner and the policy can
-- say plainly that nobody writes into anybody else's.
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Members upload their own avatar" on storage.objects;
create policy "Members upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members replace their own avatar" on storage.objects;
create policy "Members replace their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members remove their own avatar" on storage.objects;
create policy "Members remove their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Standings carry the avatar so a club reads as faces, not initials.
-- Dropped first: create-or-replace cannot change a function's output columns,
-- and this adds one.
drop function if exists public.club_standings(uuid);
create or replace function public.club_standings(club uuid)
returns table (
  user_id        uuid,
  handle         text,
  display_name   text,
  avatar_url     text,
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
    p.avatar_url,
    case when p.starting_debt > 0
      then round((greatest(0, p.starting_debt - p.current_debt) / p.starting_debt) * 100, 1)
      else 0 end,
    case when p.show_amounts then greatest(0, p.starting_debt - p.current_debt) end,
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
    and public.is_club_member(club)
  order by 5 desc;
$$;

-- Message authors, resolved for the room. Definer rights because a club-mate's
-- profile row is readable, but this keeps the join in one place and returns
-- only what a chat bubble needs.
create or replace function public.club_chat(club uuid, limit_count int default 100)
returns table (
  id         uuid,
  user_id    uuid,
  handle     text,
  avatar_url text,
  body       text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.user_id, p.handle, p.avatar_url, m.body, m.created_at
  from club_messages m
  join profiles p on p.id = m.user_id
  where m.club_id = club
    and public.is_club_member(club)
  order by m.created_at asc
  limit least(coalesce(limit_count, 100), 200);
$$;

-- ── Public clubs ───────────────────────────────────────────────────────────
-- Without somewhere to land, anyone who arrives without friends on the app has
-- no club to join and the social half of the product is closed to them. Public
-- clubs are browsable; private ones stay reachable only by their invite code.
alter table public.clubs add column if not exists is_public boolean not null default false;

drop policy if exists "Read clubs you belong to" on public.clubs;
create policy "Read clubs you belong to"
  on public.clubs for select
  using (is_public or created_by = auth.uid() or public.is_club_member(id));

-- Being listed is not the same as being open: a public club shows its name and
-- size to anyone, but standings and chat still require membership.
create or replace function public.discover_clubs(search text default null, limit_count int default 30)
returns table (
  id           uuid,
  name         text,
  member_count int,
  eliminated   numeric,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.name,
    (select count(*)::int from club_members m where m.club_id = c.id),
    -- Withheld below three members, where a "club total" is really one
    -- person's balance wearing a group's name.
    case when (select count(*) from club_members m where m.club_id = c.id) >= 3
      then (
        select coalesce(sum(greatest(0, p.starting_debt - p.current_debt)), 0)
        from club_members m
        join profiles p on p.id = m.user_id
        where m.club_id = c.id and p.show_amounts
      )
    end,
    c.created_at
  from clubs c
  where c.is_public
    and (search is null or trim(search) = '' or c.name ilike '%' || trim(search) || '%')
  order by (select count(*) from club_members m where m.club_id = c.id) desc, c.created_at desc
  limit least(coalesce(limit_count, 30), 50);
$$;

create or replace function public.join_public_club(club uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  -- A private club is not joinable this way, however its id was come by
  select is_public into ok from clubs where id = club;
  if ok is not true then return null; end if;

  insert into club_members (club_id, user_id)
  values (club, auth.uid())
  on conflict do nothing;
  return club;
end;
$$;

-- create_club learns about visibility. The single-argument version is dropped
-- rather than replaced: a new parameter list defines an overload, so both would
-- survive and PostgREST would have two candidates to choose between.
drop function if exists public.create_club(text);
create or replace function public.create_club(club_name text, public_club boolean default false)
returns public.clubs
language plpgsql
security definer
set search_path = public
as $$
declare fresh public.clubs;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if char_length(trim(club_name)) < 2 then
    raise exception 'That club name is too short';
  end if;

  insert into clubs (name, created_by, is_public)
  values (trim(club_name), auth.uid(), coalesce(public_club, false))
  returning * into fresh;

  insert into club_members (club_id, user_id, role)
  values (fresh.id, auth.uid(), 'owner');

  return fresh;
end;
$$;

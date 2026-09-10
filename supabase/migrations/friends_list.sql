-- Somewhere to actually see your friends, and to answer requests.
--
-- Run after profiles_and_friends.sql.

-- Friends can read each other's profile rows directly. Until now the policy
-- only admitted clubmates, so two friends who shared no club could see each
-- other through member_profile() but nowhere else.
drop policy if exists "Read own and clubmate profiles" on public.profiles;
create policy "Read own and clubmate profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.shares_club_with(id)
    or public.are_friends(id, auth.uid())
  );

-- Accepted friends, with what a list row needs to show.
create or replace function public.my_friends()
returns table (
  user_id      uuid,
  handle       text,
  avatar_url   text,
  progress_pct numeric,
  badges       int,
  since        timestamptz
)
language sql security definer set search_path = public stable as $$
  select
    p.id,
    p.handle,
    p.avatar_url,
    case when p.starting_debt > 0
      then round((greatest(0, p.starting_debt - p.current_debt) / p.starting_debt) * 100, 1)
      else 0 end,
    public.badge_count(p.starting_debt, p.current_debt),
    coalesce(f.responded_at, f.created_at)
  from friendships f
  join profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.status = 'accepted'
    and auth.uid() in (f.requester, f.addressee)
  order by 4 desc;
$$;

-- Requests waiting on you. Definer rights because the sender's profile row is
-- not otherwise readable — you are not clubmates and not yet friends.
create or replace function public.pending_friend_requests()
returns table (
  user_id     uuid,
  handle      text,
  avatar_url  text,
  requested_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select p.id, p.handle, p.avatar_url, f.created_at
  from friendships f
  join profiles p on p.id = f.requester
  where f.addressee = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;

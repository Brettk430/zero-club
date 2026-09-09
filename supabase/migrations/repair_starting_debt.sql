-- Some profiles carry starting_debt below current_debt, which makes
-- "eliminated" (starting - current) negative — it renders as the member's whole
-- balance with a minus sign in front. The cause was a client that could delete
-- the starting figure from local storage while keeping the current one, and
-- then publish that half-state on first sign-in.

-- Repair: nobody has eliminated a negative amount. The most that can be said
-- about these rows is that the member started where they are now.
update public.profiles
   set starting_debt = current_debt
 where starting_debt < current_debt;

-- And make the state unrepresentable from here on.
alter table public.profiles drop constraint if exists profiles_start_ge_current;
alter table public.profiles add  constraint profiles_start_ge_current
  check (starting_debt >= current_debt);

-- Belt and braces: clamp in the standings themselves, so a bad row can never
-- render as a negative total to a whole club.
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
  order by 4 desc;
$$;

-- Clubs get a category, chosen from a fixed list.
--
-- Deliberately not free text: "student loans", "Student Loan" and "student
-- debt" would arrive as three separate things within a week and filtering on
-- them would be worthless. A short closed list stays useful.
--
-- This is the supply half of finding the right club. Asking members questions
-- and matching them is the demand half, and it only earns its friction once
-- there are enough clubs to match against — but a club that was never
-- categorised at creation is very hard to categorise later, so the field goes
-- in now and the matching can come when it is worth building.

alter table public.clubs add column if not exists category text;

alter table public.clubs drop constraint if exists clubs_category_valid;
alter table public.clubs add constraint clubs_category_valid check (
  category is null or category in (
    'student-loans', 'credit-cards', 'medical', 'car',
    'couples-family', 'friends', 'coworkers', 'under-30', 'open'
  )
);

create index if not exists clubs_category_idx on public.clubs (category) where is_public;

-- Return type changes, so it has to go before it can be replaced.
drop function if exists public.discover_clubs(text, int);
create or replace function public.discover_clubs(
  search text default null,
  category_filter text default null,
  limit_count int default 30
)
returns table (
  id           uuid,
  name         text,
  category     text,
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
    c.category,
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
    and (category_filter is null or c.category = category_filter)
  order by (select count(*) from club_members m where m.club_id = c.id) desc, c.created_at desc
  limit least(coalesce(limit_count, 30), 50);
$$;

-- Same again: a new parameter defines an overload rather than replacing, so the
-- two-argument version is dropped instead of left alongside.
drop function if exists public.create_club(text, boolean);
create or replace function public.create_club(
  club_name text,
  public_club boolean default false,
  club_category text default null
)
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

  insert into clubs (name, created_by, is_public, category)
  values (trim(club_name), auth.uid(), coalesce(public_club, false),
          nullif(trim(coalesce(club_category, '')), ''))
  returning * into fresh;

  insert into club_members (club_id, user_id, role)
  values (fresh.id, auth.uid(), 'owner');

  return fresh;
end;
$$;

-- The one public club that predates categories shouldn't be unfindable.
update public.clubs set category = 'open' where is_public and category is null;

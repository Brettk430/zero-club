-- Creating a club failed with "new row violates row-level security policy".
-- The insert itself was fine; asking for the row back was not. PostgREST's
-- .select() turns it into INSERT ... RETURNING, so Postgres evaluates the
-- SELECT policy against the new row — and "is a member of this club" can never
-- be true for a club that has no members yet.

-- The creator can always read their own club, member row or not.
drop policy if exists "Read clubs you belong to" on public.clubs;
create policy "Read clubs you belong to"
  on public.clubs for select
  using (created_by = auth.uid() or public.is_club_member(id));

-- Create the club and its founding membership in one statement. Two separate
-- round trips could leave a club with no members: invisible under the policy
-- above, unreachable by its own invite code, and impossible to delete.
create or replace function public.create_club(club_name text)
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

  insert into clubs (name, created_by)
  values (trim(club_name), auth.uid())
  returning * into fresh;

  insert into club_members (club_id, user_id, role)
  values (fresh.id, auth.uid(), 'owner');

  return fresh;
end;
$$;

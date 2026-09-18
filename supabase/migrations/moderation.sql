-- Moderation: reports, blocks, a blocked-terms filter, and the admin actions
-- behind them. Apple guideline 1.2 expects all four of any app with
-- user-generated content — Zero Club has club chat, feed comments, handles and
-- club names. Safe to run more than once.

-- ── Reports ────────────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references auth.users(id) on delete cascade,
  target_type    text not null check (target_type in ('post','comment','message','profile','club')),
  target_id      uuid not null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason         text not null check (reason in ('harassment','hate','sexual','self-harm','spam','other')),
  note           text check (char_length(note) <= 500),
  snapshot       text,            -- the reported text as it stood, so removal doesn't erase the evidence
  status         text not null default 'open' check (status in ('open','removed','dismissed')),
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  unique (reporter_id, target_type, target_id)
);
create index if not exists content_reports_open_idx on public.content_reports (created_at desc) where status = 'open';

-- No policies: members never read or write this table directly. Filing goes
-- through report_content() and reading through admin_reports(), both below.
alter table public.content_reports enable row level security;

-- Files a report. The reported text and its author are looked up here rather
-- than taken from the caller, so a report can't misattribute or invent content.
create or replace function public.report_content(kind text, target uuid, reason text, note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_text   text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;

  if kind = 'message' then
    select m.user_id, m.body into v_author, v_text from club_messages m where m.id = target;
  elsif kind = 'comment' then
    select c.user_id, c.body into v_author, v_text from post_comments c where c.id = target;
  elsif kind = 'post' then
    select p.user_id, p.type || ': ' || p.payload::text into v_author, v_text from posts p where p.id = target;
  elsif kind = 'profile' then
    select p.id, coalesce(p.display_name || ' ', '') || '@' || p.handle into v_author, v_text from profiles p where p.id = target;
  elsif kind = 'club' then
    select c.created_by, c.name into v_author, v_text from clubs c where c.id = target;
  else
    raise exception 'unknown_kind';
  end if;

  if v_author is null then raise exception 'not_found'; end if;
  if v_author = auth.uid() then raise exception 'own_content'; end if;

  insert into content_reports (reporter_id, target_type, target_id, target_user_id, reason, note, snapshot)
  values (auth.uid(), kind, target, v_author, reason, nullif(trim(note), ''), v_text)
  on conflict (reporter_id, target_type, target_id) do nothing;
end;
$$;

-- ── Blocks ─────────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
-- The handle as it stood when blocked: a member can only read the profiles of
-- clubmates and friends, so a stranger blocked from the public feed would
-- otherwise appear in the block list as nobody.
alter table public.user_blocks add column if not exists blocked_handle text;
alter table public.user_blocks enable row level security;

drop policy if exists "Own blocks: read"   on public.user_blocks;
drop policy if exists "Own blocks: add"    on public.user_blocks;
drop policy if exists "Own blocks: remove" on public.user_blocks;
create policy "Own blocks: read"   on public.user_blocks for select using (blocker_id = auth.uid());
create policy "Own blocks: add"    on public.user_blocks for insert with check (blocker_id = auth.uid());
create policy "Own blocks: remove" on public.user_blocks for delete using (blocker_id = auth.uid());

-- ── Blocked-terms filter ───────────────────────────────────────────────────
-- Enforced in the database, so no client can post around it. Matching is on
-- whole words (plus a plural), which keeps "spicy" or "raccoon" from tripping
-- a term meant for a slur. Add a term any time:
--   insert into public.blocked_terms (term) values ('...');
create table if not exists public.blocked_terms (term text primary key check (term = lower(term)));
alter table public.blocked_terms enable row level security;   -- definer functions only

insert into public.blocked_terms (term) values
  ('nigger'), ('nigga'), ('sandnigger'), ('chink'), ('gook'), ('spic'), ('wetback'),
  ('kike'), ('beaner'), ('coon'), ('raghead'), ('towelhead'), ('jigaboo'), ('paki'),
  ('faggot'), ('fag'), ('tranny'), ('shemale'),
  ('retard'), ('retarded'),
  ('kys'), ('kill yourself'), ('kill urself'), ('hang yourself'), ('neck yourself'),
  ('slit your wrists'), ('go die')
on conflict do nothing;

create or replace function public.contains_blocked_term(input text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocked_terms b
    where lower(coalesce(input, '')) ~ ('\m' || b.term || '(s|es)?\M')
  );
$$;

-- One trigger function for every moderated table; each trigger names the
-- columns to check as arguments.
create or replace function public.reject_blocked_terms()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  i int;
begin
  for i in 0 .. tg_nargs - 1 loop
    if public.contains_blocked_term(to_jsonb(new) ->> tg_argv[i]) then
      raise exception 'content_blocked'
        using errcode = 'P0001', hint = 'That contains language Zero Club does not allow.';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists moderate_club_messages on public.club_messages;
create trigger moderate_club_messages before insert or update on public.club_messages
  for each row execute function public.reject_blocked_terms('body');

drop trigger if exists moderate_post_comments on public.post_comments;
create trigger moderate_post_comments before insert or update on public.post_comments
  for each row execute function public.reject_blocked_terms('body');

-- Profiles only when the public-facing names change, so balance updates never
-- run the check.
drop trigger if exists moderate_profiles on public.profiles;
create trigger moderate_profiles before insert or update of handle, display_name on public.profiles
  for each row execute function public.reject_blocked_terms('handle', 'display_name');

drop trigger if exists moderate_clubs on public.clubs;
create trigger moderate_clubs before insert or update of name on public.clubs
  for each row execute function public.reject_blocked_terms('name');

-- ── Admin ──────────────────────────────────────────────────────────────────
-- Open reports first. still_there tells the admin whether the content survives.
drop function if exists public.admin_reports();
create or replace function public.admin_reports()
returns table (
  id uuid, created_at timestamptz, status text, reason text, note text,
  target_type text, target_id uuid, snapshot text,
  author_id uuid, author_handle text, reporter_handle text,
  reports_on_target int, still_there boolean
)
language sql security definer set search_path = public stable as $$
  select
    r.id, r.created_at, r.status, r.reason, r.note,
    r.target_type, r.target_id, r.snapshot,
    r.target_user_id, a.handle, rp.handle,
    (select count(*)::int from content_reports r2
      where r2.target_type = r.target_type and r2.target_id = r.target_id),
    case r.target_type
      when 'message' then exists (select 1 from club_messages where club_messages.id = r.target_id)
      when 'comment' then exists (select 1 from post_comments where post_comments.id = r.target_id)
      when 'post'    then exists (select 1 from posts where posts.id = r.target_id)
      when 'club'    then exists (select 1 from clubs where clubs.id = r.target_id)
      else true
    end
  from content_reports r
  left join profiles a  on a.id  = r.target_user_id
  left join profiles rp on rp.id = r.reporter_id
  where public.is_admin()
  order by (r.status = 'open') desc, r.created_at desc
  limit 200;
$$;

-- 'remove' takes the content down (a profile is reset to a neutral handle
-- rather than deleted) and closes every report on it; 'dismiss' closes them.
create or replace function public.admin_resolve_report(report uuid, action text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r content_reports%rowtype;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if action not in ('remove', 'dismiss') then raise exception 'unknown_action'; end if;
  select * into r from content_reports where id = report;
  if not found then raise exception 'not_found'; end if;

  if action = 'remove' then
    if r.target_type = 'message' then delete from club_messages where id = r.target_id;
    elsif r.target_type = 'comment' then delete from post_comments where id = r.target_id;
    elsif r.target_type = 'post' then delete from posts where id = r.target_id;
    elsif r.target_type = 'club' then delete from clubs where id = r.target_id;
    elsif r.target_type = 'profile' then
      update profiles
         set handle = 'Member' || left(replace(id::text, '-', ''), 6),
             display_name = null,
             avatar_url = null
       where id = r.target_id;
    end if;
  end if;

  update content_reports
     set status = case action when 'remove' then 'removed' else 'dismissed' end,
         resolved_at = now()
   where target_type = r.target_type and target_id = r.target_id and status = 'open';
end;
$$;

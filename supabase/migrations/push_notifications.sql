-- Push notifications: device tokens, each member's choices, and a log that
-- keeps one event from ever being sent twice. Safe to run more than once.
--
-- Two kinds for now — club chat messages and milestone celebrations — because
-- those are the ones people are glad to get. The monthly payment reminder stays
-- a local notification scheduled on the phone and needs none of this.

-- ── Device tokens ──────────────────────────────────────────────────────────
-- Keyed by the token, not the member: a phone has one token, and when someone
-- signs out and a different member signs in on it, the row moves to them rather
-- than leaving the first person getting the second person's notifications.
create table if not exists public.push_tokens (
  token      text primary key check (char_length(token) between 32 and 512),
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- No policies: the app writes through the two functions below, and only the
-- server (service role) reads tokens to send.
alter table public.push_tokens enable row level security;

create or replace function public.register_push_token(push_token text, push_platform text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into push_tokens (token, user_id, platform, updated_at)
  values (push_token, auth.uid(), push_platform, now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

-- Called on sign-out, so a shared or handed-down phone stops receiving the
-- previous member's club chat.
create or replace function public.unregister_push_token(push_token text)
returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where token = push_token and user_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text)     from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text)     to authenticated;

-- ── Choices ────────────────────────────────────────────────────────────────
-- One row per member, created the first time they change anything. No row
-- means both kinds are on: iOS's own permission prompt is the opt-in, and these
-- are how to narrow it afterwards.
create table if not exists public.notification_prefs (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  chat       boolean not null default true,
  milestones boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;

drop policy if exists "Own notification prefs" on public.notification_prefs;
create policy "Own notification prefs"
  on public.notification_prefs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Sent log ───────────────────────────────────────────────────────────────
-- The app asks the server to send after it writes a message or a milestone.
-- Claiming the source row here first means a retry, a double tap or a replayed
-- request finds it already taken and sends nothing.
create table if not exists public.push_events (
  kind       text not null check (kind in ('chat', 'milestone')),
  source_id  uuid not null,
  sent_at    timestamptz not null default now(),
  primary key (kind, source_id)
);
alter table public.push_events enable row level security;   -- server only

-- A busy club would otherwise buzz every phone for every line. A member gets
-- at most one chat notification per club in any few minutes; the server checks
-- and stamps this per recipient.
create table if not exists public.push_chat_throttle (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, club_id)
);
alter table public.push_chat_throttle enable row level security;   -- server only

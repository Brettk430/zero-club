-- More push notifications: friend requests, comments, likes and cheers, and
-- friends' payments, alongside club chat and milestones. Run after
-- push_notifications.sql. Safe to run more than once.

-- ── Choices ────────────────────────────────────────────────────────────────
-- One switch per kind, all on until the member turns one off.
alter table public.notification_prefs add column if not exists friend_requests boolean not null default true;
alter table public.notification_prefs add column if not exists comments        boolean not null default true;
alter table public.notification_prefs add column if not exists reactions       boolean not null default true;
alter table public.notification_prefs add column if not exists friend_payments boolean not null default true;

-- ── Sent log ───────────────────────────────────────────────────────────────
-- Friendships and reactions have no id of their own — they are keyed by the
-- people (and the post) involved — so the log takes a text key. A friend
-- request is logged as requester:addressee, which is what makes withdrawing and
-- re-sending one never ring twice.
alter table public.push_events alter column source_id type text using source_id::text;
alter table public.push_events drop constraint if exists push_events_kind_check;
alter table public.push_events add constraint push_events_kind_check check (kind in (
  'chat', 'milestone', 'payment', 'comment', 'reaction', 'friend_request', 'friend_accepted'
));

-- ── Quiet windows ──────────────────────────────────────────────────────────
-- One table for every "not again so soon" rule, keyed per recipient: a club's
-- chat, a post's likes, a friend's payments. Replaces the chat-only table,
-- which never held anything that mattered (no build had shipped with push).
create table if not exists public.push_throttle (
  user_id uuid not null references auth.users(id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_throttle enable row level security;   -- server only

drop table if exists public.push_chat_throttle;

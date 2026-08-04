-- Zero Club — Phase 3: community feed
-- Run this in: supabase.com → your project → SQL Editor → New query → Run
-- Safe to run more than once (create if not exists / drop-and-recreate policies).

-- ─── Community feed (Phase 3) ────────────────────────────────────────────────
-- Strava-style feed: auto-posts for payments and milestones, with reactions
-- and comments. Groups are a static catalog in the app; posts carry group_id.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  type text not null check (type in ('payment', 'milestone')),
  payload jsonb not null,               -- payment: {amount, debtName} · milestone: {label}
  group_id text,                        -- e.g. "student-loans"; null = everyone only
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts for select using (true);

drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_group_idx on public.posts (group_id, created_at desc);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like', 'celebrate')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

alter table public.post_reactions enable row level security;

drop policy if exists "Anyone can read reactions" on public.post_reactions;
create policy "Anyone can read reactions"
  on public.post_reactions for select using (true);

drop policy if exists "Users can react as themselves" on public.post_reactions;
create policy "Users can react as themselves"
  on public.post_reactions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own reactions" on public.post_reactions;
create policy "Users can remove their own reactions"
  on public.post_reactions for delete using (auth.uid() = user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

drop policy if exists "Anyone can read comments" on public.post_comments;
create policy "Anyone can read comments"
  on public.post_comments for select using (true);

drop policy if exists "Users can comment as themselves" on public.post_comments;
create policy "Users can comment as themselves"
  on public.post_comments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments"
  on public.post_comments for delete using (auth.uid() = user_id);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

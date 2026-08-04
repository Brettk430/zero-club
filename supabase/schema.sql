-- Zero Club — Supabase schema
-- Run this in: supabase.com → your project → SQL Editor → New query

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Extends auth.users with Pro status. Created automatically on sign-up via trigger.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── progress_logs ───────────────────────────────────────────────────────────
-- Monthly debt balance check-ins logged from the Plan page.

create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_month text not null,          -- e.g. "June 2025"
  debt_balances jsonb not null,        -- array of {id, name, startingBalance, actualBalance, rate}
  notes text,
  created_at timestamptz not null default now()
);

alter table public.progress_logs enable row level security;

create policy "Users can read their own progress logs"
  on public.progress_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress logs"
  on public.progress_logs for insert
  with check (auth.uid() = user_id);


-- ─── community_messages ──────────────────────────────────────────────────────
-- Anonymous peer chat messages, scoped by room (dti_range + country).

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  message text not null,
  room text not null,                  -- e.g. "21-40% | United States"
  country text,
  dti_range text,
  created_at timestamptz not null default now()
);

alter table public.community_messages enable row level security;

create policy "Anyone can read community messages"
  on public.community_messages for select
  using (true);

create policy "Authenticated users can insert messages"
  on public.community_messages for insert
  with check (auth.uid() = user_id);

-- Index for efficient room queries
create index if not exists community_messages_room_idx
  on public.community_messages(room, created_at);


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

create policy "Anyone can read posts"
  on public.posts for select using (true);

create policy "Users can insert their own posts"
  on public.posts for insert with check (auth.uid() = user_id);

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

create policy "Anyone can read reactions"
  on public.post_reactions for select using (true);

create policy "Users can react as themselves"
  on public.post_reactions for insert with check (auth.uid() = user_id);

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

create policy "Anyone can read comments"
  on public.post_comments for select using (true);

create policy "Users can comment as themselves"
  on public.post_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.post_comments for delete using (auth.uid() = user_id);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);


-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime on community_messages so chat updates live.
-- Run in Supabase dashboard: Database → Replication → add community_messages

-- Or via SQL:
alter publication supabase_realtime add table public.community_messages;

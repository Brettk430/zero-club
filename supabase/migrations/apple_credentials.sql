-- The Sign in with Apple refresh token for each member who used it. Apple
-- requires apps to revoke it when the member deletes their account, and it can
-- only be obtained once, at sign-in — so it is kept here until then.
--
-- No policies: only the server (service role) reads or writes this table. A
-- refresh token is a credential and never needs to reach a device.
create table if not exists public.apple_credentials (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);
alter table public.apple_credentials enable row level security;

-- Sign-up was failing with:
--   null value in column "handle" of relation "profiles" violates not-null
--
-- A trigger on auth.users creates the profiles row at sign-up with id, email
-- and is_pro. The rebuild migration added `handle` as NOT NULL without giving
-- it a default, so that insert — which knows nothing about handles — began
-- failing, and with it every new account.
--
-- Fixed with a default rather than by loosening the column or editing the
-- trigger: any writer gets a valid handle whether or not it thinks to set one,
-- and the app still replaces it with the member's own on first sync.
alter table public.profiles
  alter column handle set default 'Member' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

-- Anything already stranded without one (should be none, since the insert
-- failed outright, but a partially-applied state is cheap to repair).
update public.profiles
   set handle = 'Member' || substr(replace(id::text, '-', ''), 1, 8)
 where handle is null;

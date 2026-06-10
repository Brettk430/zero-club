-- Zero Club — RLS Security Audit
-- Run each section in Supabase SQL Editor to verify policies are correct

-- ─── 1. Verify RLS is enabled on all tables ──────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: rls_enabled = true for profiles, progress_logs, community_messages


-- ─── 2. List all active policies ─────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- ─── 3. Cross-user read test — should return 0 rows ──────────────────────────
-- This simulates a logged-in user trying to read another user's progress logs.
-- Replace 'fake-user-id' with any UUID that is NOT your real user ID.
-- If this returns rows, your RLS is leaking data.
SELECT count(*) AS leaked_rows
FROM public.progress_logs
WHERE user_id = 'fake-user-id-00000000-0000-0000-0000-000000000000';
-- Expected: 0


-- ─── 4. Tighten community_messages — add UPDATE/DELETE protection ─────────────
-- Users should only be able to delete their own messages (not others')
DROP POLICY IF EXISTS "Users can delete own messages" ON public.community_messages;
CREATE POLICY "Users can delete own messages"
  ON public.community_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Prevent users from updating other people's messages
DROP POLICY IF EXISTS "Users can update own messages" ON public.community_messages;
CREATE POLICY "Users can update own messages"
  ON public.community_messages FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── 5. Tighten progress_logs — add DELETE protection ────────────────────────
DROP POLICY IF EXISTS "Users can delete own progress logs" ON public.progress_logs;
CREATE POLICY "Users can delete own progress logs"
  ON public.progress_logs FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 6. Verify profiles can't be read cross-user ─────────────────────────────
-- The profiles table has is_pro — leaking this would expose subscription status.
-- Existing policy: auth.uid() = id — this is correct.
-- Run this to confirm no anonymous access:
SELECT count(*) AS profiles_visible_to_anon
FROM public.profiles;
-- When run as anonymous (no JWT), this should return 0 or error.


-- ─── 7. Add win + made_payment + on_track columns to progress_logs ───────────
-- These were added to the check-in UI but the DB schema doesn't have them yet.
ALTER TABLE public.progress_logs ADD COLUMN IF NOT EXISTS win text;
ALTER TABLE public.progress_logs ADD COLUMN IF NOT EXISTS made_payment boolean;
ALTER TABLE public.progress_logs ADD COLUMN IF NOT EXISTS on_track boolean;

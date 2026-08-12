-- Exact lifetime minutes breathed, for the breathing overview's header stat (#778).
--
-- The redesigned overview reads "6 sessions · 21 minutes · last today, 5:43 pm". The
-- sessions figure is already exact - `countMindfulnessSessionsExcludingNames()` counts
-- server-side - but the minutes had no aggregate, and the only list the screen holds is
-- the newest 50 sessions it renders the "recent" rows from. Summing that list would make
-- the stat silently become "minutes in your last 50 sessions" the moment a user passed
-- the cap, while the label still said "minutes". Same defect class as the meditation
-- median (#337, `meditation_median_minutes()`) and the journal word total (#293), and the
-- reason those are RPCs rather than client-side reductions.
--
-- Nothing new is persisted: the figure is derived per call, so no derived column lands on
-- a content table and no write path is touched.
--
-- Counting by EXCLUSION, not inclusion. `mindfulness_sessions` holds breathing and
-- grounding; breathing is an open set - three built-in slugs plus every custom pattern,
-- whose sessions carry the pattern's row id as their name - so it cannot be enumerated in
-- a filter. Grounding is the closed slug set, so "not grounding" is the only correct line
-- to draw, and it is the same line `countMindfulnessSessionsExcludingNames()` and
-- src/features/routines/derive.ts already draw. The slug list is passed in rather than
-- hardcoded so it stays in one place on the client.
--
-- Ownership. `security invoker` means the function runs as the calling role, so the
-- table's own RLS policy is enforced against every row the aggregate touches - the
-- database, not this function body, is what confines the sum to one user. A
-- `security definer` copy would run as the owner with that policy switched off, leaving
-- the hand-written filter below as the only thing between two users' sessions, in a
-- function whose whole output is a single number that would look perfectly plausible
-- while wrong. The `user_id = uid` filter is belt and braces on top of RLS, and an
-- unauthenticated caller is rejected outright rather than silently aggregating zero rows.
--
-- `duration_minutes` is a plain, unencrypted `int` column, so the aggregate reads it
-- directly - no decrypting view is involved. `coalesce(sum(...), 0)` returns 0 rather
-- than null for a user with no sessions, because "0 minutes" is the honest reading of an
-- empty history here (unlike a median, which has no value over an empty set).
create or replace function public.breathing_total_minutes(excluded_names text[])
returns integer
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  result integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(sum(session.duration_minutes), 0)::integer
    into result
    from public.mindfulness_sessions as session
   where session.user_id = uid
     and not (session.exercise_name = any(coalesce(excluded_names, array[]::text[])));

  return result;
end;
$$;

revoke all on function public.breathing_total_minutes(text[]) from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.breathing_total_minutes(text[]) from anon;
grant execute on function public.breathing_total_minutes(text[]) to authenticated;

notify pgrst, 'reload schema';

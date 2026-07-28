-- Exact lifetime median sit length for the meditation hero stat (#337).
--
-- The client list query is capped at 200 sessions, so taking the median on the device
-- silently became a "newest 200" figure once a daily meditator passed the cap - under
-- seven months of practice. The hero reads as a lifetime median but wasn't, and it sat
-- beside a sessions count that *is* exact (`countMeditationSessions()` in
-- src/features/meditation/repository.ts), so the same hero could show a lifetime count
-- next to a truncated lifetime median. Same defect class as the journal word total
-- (#293, `journal_word_total()`) and the Home journal-week stats (#323).
--
-- A median cannot be summed incrementally the way a count or a total can, so this is a
-- percentile aggregate rather than a running total. `duration_minutes` is a plain,
-- unencrypted `int` column on `meditation_sessions` (see 20260522_meditation_sessions.sql),
-- so the aggregate reads it directly - no decrypting view is involved here, unlike the
-- journal equivalent. Nothing new is persisted: the figure is derived per call, so no
-- derived column lands on a content table and no write path is touched.
--
-- Ownership. `security invoker` means the function runs as the calling role, so the
-- table's own RLS policy ("Users can manage their own meditation sessions",
-- `auth.uid() = user_id`) is enforced against every row the aggregate touches - the
-- database, not this function body, is what confines the median to one user. A
-- `security definer` copy would run as the owner with that policy switched off, leaving
-- the hand-written filter below as the only thing standing between two users' sits: one
-- careless refactor from a cross-user leak, in a function whose whole output is a single
-- number that would look perfectly plausible while wrong. The `user_id = uid` filter is
-- belt and braces on top of RLS, and an unauthenticated caller is rejected outright
-- rather than silently aggregating zero rows.
--
-- Rounding deliberately stays in TypeScript. `percentile_cont` returns the exact
-- interpolated value (the middle sit for an odd count, the mean of the two middle sits
-- for an even one) and `medianMeditationMinutes()` applies the same `Math.round` the
-- old client-side `median()` did, so the two implementations cannot drift on a `.5`
-- tie - `round(double precision)` in Postgres breaks ties to even, `Math.round` breaks
-- them upward, and 22.5 would render as 22 here and 23 there.
create or replace function public.meditation_median_minutes()
returns numeric
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  result numeric;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select percentile_cont(0.5) within group (order by session.duration_minutes)::numeric
    into result
    from public.meditation_sessions as session
   where session.user_id = uid;

  -- Null for a user with no sessions, matching median([]) === null on the client.
  return result;
end;
$$;

revoke all on function public.meditation_median_minutes() from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.meditation_median_minutes() from anon;
grant execute on function public.meditation_median_minutes() to authenticated;

notify pgrst, 'reload schema';

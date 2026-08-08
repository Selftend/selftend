-- mood_emotion_counts(): lifetime usage per emotion, for the delete confirmation (#743).
--
-- The count exists for exactly one job: telling someone what they are about to lose when
-- they delete an emotion. It is deliberately NOT rendered next to every row - twenty-two
-- numbers in a column is a leaderboard of someone's feelings, and "what do I feel most"
-- is already answered, better and windowed, by the overview's "Felt most often".
--
-- Why a server aggregate at all, when four other check-in stats are computed on the
-- client: every one of those runs over `useMoodHistory`'s capped 200-row cache, so they
-- are already silently wrong for a long-tenured user. A *lifetime* count over a 200-row
-- window would not be approximately right, it would be arbitrary - "you have used this
-- 3 times" when the true answer is 60. Deletion safety is the one place that cannot be
-- approximate.
--
-- No arguments and no time zone. This is the one check-in aggregate that is unbucketed
-- and lifetime, so it is also the one that cannot get the civil-day key wrong - there is
-- no day boundary to disagree about.
--
-- **It reads `mood_logs_data`, never `public.mood_logs`.** `app.decrypt_text` is declared
-- with no volatility marker (`20260586_app_crypto_helpers.sql`), so PostgreSQL defaults it
-- to VOLATILE, and the planner refuses to prune volatile output expressions from a
-- subquery - `remove_unused_subquery_outputs()` says "we daren't remove it". So selecting
-- `emotions` alone from the view would decrypt all five encrypted columns on every row.
-- Same trap `sleep_stats` paid for silently until `20260808000000`; see ADR-0001 and #706.
--
-- `emotions` is a plaintext `text[]` on the base table, so nothing here needs decrypting.
--
-- `security invoker`, so the caller's own RLS applies: `mood_logs_select_own` on
-- `mood_logs_data` is `auth.uid() = user_id`. The explicit `user_id = uid` filter is belt
-- and braces on top of that, and it is what makes the index-friendly plan obvious.
create or replace function public.mood_emotion_counts()
returns table (
  emotion_id text,
  uses bigint
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select emotion.id, count(*)
    -- The base table, not the view: see the header.
    from public.mood_logs_data as mood_log
    cross join lateral unnest(mood_log.emotions) as emotion(id)
   where mood_log.user_id = uid
   group by emotion.id;
end;
$$;

revoke all on function public.mood_emotion_counts() from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.mood_emotion_counts() from anon;
grant execute on function public.mood_emotion_counts() to authenticated;

notify pgrst, 'reload schema';

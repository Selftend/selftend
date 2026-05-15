-- Migrate the mood scale from 1-10 to 1-5 across all mood scoring inputs.
--
-- Pre-launch reset: existing mood scores are wiped rather than mapped, since
-- there is no production user data to preserve. mood_logs.mood_score is
-- NOT NULL, so affected rows are deleted entirely; activities and mindfulness
-- mood columns are nullable, so only the score columns are cleared.

-- 1. mood_logs: drop all rows, then tighten the CHECK constraint.
delete from public.mood_logs;

alter table public.mood_logs
  drop constraint mood_logs_mood_score_check;

alter table public.mood_logs
  add constraint mood_logs_mood_score_check
  check (mood_score between 1 and 5);

-- 2. activity_logs: null out before/after scores, then tighten constraints.
update public.activity_logs
  set mood_before = null
  where mood_before is not null;

update public.activity_logs
  set mood_after = null
  where mood_after is not null;

alter table public.activity_logs
  drop constraint if exists activity_logs_mood_before_check;

alter table public.activity_logs
  add constraint activity_logs_mood_before_check
  check (mood_before between 1 and 5);

alter table public.activity_logs
  drop constraint if exists activity_logs_mood_after_check;

alter table public.activity_logs
  add constraint activity_logs_mood_after_check
  check (mood_after between 1 and 5);

-- 3. mindfulness_sessions: null out mood_after, then tighten constraint.
update public.mindfulness_sessions
  set mood_after = null
  where mood_after is not null;

alter table public.mindfulness_sessions
  drop constraint mindfulness_sessions_mood_after_check;

alter table public.mindfulness_sessions
  add constraint mindfulness_sessions_mood_after_check
  check (mood_after between 1 and 5);

-- 4. mood_logs: allow users to correct their own entries after creation.
drop policy if exists "mood_logs_update_own" on public.mood_logs;
create policy "mood_logs_update_own" on public.mood_logs
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

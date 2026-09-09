-- home_tool_stats(): every Home tool card's stat line in one round trip (#2212).
--
-- Home renders the whole eight-tool catalogue for everyone, and each tool card
-- quotes its tool's own header figures. Until this migration those figures were
-- fetched the way the tool screens fetch them - fifteen separate queries the
-- moment Home mounted, guest included, four of them list reads - so the landing
-- screen's cost was fixed at fifteen requests however little of the product a
-- person used. The owner's decision on #2212 was "one server aggregate": this
-- function returns all eight stats at once, and Home mounts one query.
--
-- === What this is NOT ===============================================================
-- Not a new stat, and not a new definition of any stat. Every figure below is the
-- one its tool's own header already renders, produced from the same rows by the
-- same rule - and where the tool already has an aggregate function, this CALLS it
-- rather than restating it: `journal_word_total()`, `meditation_median_minutes()`,
-- `breathing_total_minutes(text[])` and `sleep_stats(text)` are invoked as they are,
-- so a later change to one of them reaches Home by construction. The counts that
-- ADR-0001 says need no function (PostgREST `head` counts) are folded in here only
-- because a round trip is what this migration exists to save; the tool screens keep
-- their head counts. `test/integration/home-tool-stats.integration.test.ts` pins
-- every leg to its tool's own read on seeded rows (ADR-0001's parity obligation).
--
-- === Shape ===========================================================================
-- One row per tool key, `stats` a jsonb object of that tool's figures, so the eight
-- tools' unlike fields ride one signature and a later field is an addition rather
-- than a new function. Everything is exact and UNROUNDED: averages and the median
-- come back as numerics, and the client applies the same `Math.round`/`roundTo1` the
-- per-tool hooks always did, so the two cannot drift on a `.5` tie (ADR-0001).
--
--   mood        { lifetimeCount, thisWeekCount, avg7 }
--   journal     { entries, words }
--   gratitude   { entries, thisWeek }
--   breathing   { sessions, minutes }
--   grounding   { sessions, lastCompletedAt, lastCompletedOffsetMinutes }
--   meditation  { sits, medianMinutes }
--   sleep       { avgDurationMinutes7, avgQuality7 }
--   habits      { active, dueToday, doneToday }
--
-- === The viewer's frame, passed in ===================================================
-- `p_time_zone` is the viewer's IANA zone, the `sleep_stats` pattern: it resolves the
-- civil day of a check-in or gratitude entry whose offset was never captured (every
-- row predating 20260726), exactly as `entryDayKey` falls back to the device's local
-- day, and it is handed on to `sleep_stats` untouched. `p_day` is the viewer's own
-- civil day - the day Home is describing - and it anchors the two day-scoped windows
-- the client used to anchor on `currentDateKey()`: the mood and gratitude "this week"
-- clauses (Monday-start calendar week, #697) and the habits "due today" fraction.
-- `p_grounding_names` is the grounding slug list, passed in rather than hardcoded so
-- it stays in one place on the client (the `breathing_total_minutes` argument).
--
-- === Why the _data tables ============================================================
-- The counts and the civil-day arithmetic read only plaintext columns - ids,
-- timestamps, offsets, a score, an exercise name, a cadence - so they read the
-- `*_data` base tables (`record_days`, `sleep_stats`, `mood_emotion_counts` do the
-- same); `meditation_sessions` is the one plain table. `security invoker` keeps each
-- base table's own `*_select_own` policy in force, so the function sees only the
-- caller's rows exactly as the views would, and the `user_id = uid` filters are belt
-- and braces on top. Nothing is persisted; this adds no table and no column, so
-- `export_user_data` is untouched.
--
-- === Forward compatibility ===========================================================
-- Purely additive (docs/releasing.md): nothing on the shipped client calls this, and
-- nothing existing is dropped, renamed or re-signed. The per-tool hooks and functions
-- the tool screens use are unchanged.

create or replace function public.home_tool_stats(
  p_time_zone text,
  p_day date,
  p_grounding_names text[]
)
returns table (
  tool_key text,
  stats jsonb
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  grounding text[] := coalesce(p_grounding_names, array[]::text[]);
  -- Monday of the week holding p_day: `mondayKeyOf` in src/utils/date.ts.
  week_start date;
  -- The day-key filters below are on `logged_at`, a UTC instant, while the windows
  -- are civil days; a captured offset spans at most 14 hours either way, so a
  -- two-day pad around the window is enough and the civil-day check narrows it back.
  pad interval := interval '2 days';

  mood_lifetime bigint;
  mood_this_week bigint;
  mood_avg7 numeric;
  journal_entries bigint;
  journal_words bigint;
  gratitude_entries bigint;
  gratitude_this_week bigint;
  breathing_sessions bigint;
  breathing_minutes integer;
  grounding_sessions bigint;
  grounding_last_at timestamptz;
  grounding_last_offset integer;
  meditation_sits bigint;
  meditation_median numeric;
  sleep_avg_duration_7 numeric;
  sleep_avg_quality_7 numeric;
  habits_active bigint;
  habits_due_today bigint;
  habits_done_today bigint;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_time_zone is null then
    raise exception 'Time zone is required' using errcode = 'invalid_parameter_value';
  end if;
  begin
    perform now() at time zone p_time_zone;
  exception
    when invalid_parameter_value then
      raise exception 'Unknown time zone: %', p_time_zone using errcode = 'invalid_parameter_value';
  end;
  if p_day is null then
    raise exception 'Day is required' using errcode = 'invalid_parameter_value';
  end if;

  week_start := p_day - (extract(isodow from p_day)::int - 1);

  -- 1. mood - `useMoodStat`: the lifetime head count, plus the two windowed clauses
  -- over the fortnight `useMoodWeek` fetches ([previous Monday, this Sunday]).
  -- "This week" is the calendar week; the 7-day average is trailing, and it ends on
  -- the later of today and the newest captured day in that fortnight - `dayRangeEndKey`
  -- - so an entry logged east of here still counts (#250). Each row's civil day is
  -- the one captured with it, falling back to the viewer's zone where none was.
  select count(*) into mood_lifetime
    from public.mood_logs_data as mood
   where mood.user_id = uid;

  with fortnight as (
    select mood.mood_score,
           coalesce(
             public.occurrence_day_key(mood.logged_at, mood.logged_offset_minutes),
             to_char(mood.logged_at at time zone p_time_zone, 'YYYY-MM-DD')
           )::date as civil_day
      from public.mood_logs_data as mood
     where mood.user_id = uid
       and mood.logged_at >= ((week_start - 7)::timestamp at time zone 'UTC') - pad
       and mood.logged_at <  ((week_start + 7)::timestamp at time zone 'UTC') + pad
  ),
  window_rows as (
    select fortnight.mood_score, fortnight.civil_day
      from fortnight
     where fortnight.civil_day between week_start - 7 and week_start + 6
  ),
  bounds as (
    -- `greatest` ignores a null max, so a fortnight with no rows ends on p_day.
    select greatest(p_day, max(window_rows.civil_day)) as end_day from window_rows
  )
  select
    (select count(*) from window_rows
      where window_rows.civil_day between week_start and week_start + 6),
    (select avg(window_rows.mood_score) from window_rows, bounds
      where window_rows.civil_day between bounds.end_day - 6 and bounds.end_day)
    into mood_this_week, mood_avg7;

  -- 2. journal - `useJournalStat`: lifetime entries and lifetime words.
  select count(*) into journal_entries
    from public.journal_entries_data as journal
   where journal.user_id = uid;
  journal_words := public.journal_word_total();

  -- 3. gratitude - `useGratitudeStat`: lifetime entries, and entries since Monday by
  -- the civil day captured with each (`countGratitudeEntriesSinceDayKey`).
  select count(*) into gratitude_entries
    from public.gratitude_entries_data as gratitude
   where gratitude.user_id = uid;

  select count(*) into gratitude_this_week
    from public.gratitude_entries_data as gratitude
   where gratitude.user_id = uid
     and gratitude.logged_at >= (week_start::timestamp at time zone 'UTC') - pad
     and coalesce(
           public.occurrence_day_key(gratitude.logged_at, gratitude.logged_offset_minutes),
           to_char(gratitude.logged_at at time zone p_time_zone, 'YYYY-MM-DD')
         )::date >= week_start;

  -- 4. breathing - `useBreathingStat`: sessions by EXCLUSION of the grounding slugs
  -- (breathing is an open set - custom patterns carry their own id as the name), the
  -- line `countMindfulnessSessionsExcludingNames` and `breathing_total_minutes` draw.
  select count(*) into breathing_sessions
    from public.mindfulness_sessions_data as mind
   where mind.user_id = uid
     and not (mind.exercise_name = any(grounding));
  breathing_minutes := public.breathing_total_minutes(grounding);

  -- 5. grounding - `useGroundingStat`: sessions by INCLUSION, and the newest one's
  -- instant with the offset captured beside it, for the client to format.
  select count(*) into grounding_sessions
    from public.mindfulness_sessions_data as mind
   where mind.user_id = uid
     and mind.exercise_name = any(grounding);

  select mind.completed_at, mind.completed_offset_minutes
    into grounding_last_at, grounding_last_offset
    from public.mindfulness_sessions_data as mind
   where mind.user_id = uid
     and mind.exercise_name = any(grounding)
   order by mind.completed_at desc, mind.id desc
   limit 1;

  -- 6. meditation - `useMeditationStat`: lifetime sits and the lifetime median.
  select count(*) into meditation_sits
    from public.meditation_sessions as sit
   where sit.user_id = uid;
  meditation_median := public.meditation_median_minutes();

  -- 7. sleep - `useSleepStat`: the two 7-day figures, straight from `sleep_stats`.
  select sleep.avg_duration_minutes_7, sleep.avg_quality_7
    into sleep_avg_duration_7, sleep_avg_quality_7
    from public.sleep_stats(p_time_zone) as sleep;

  -- 8. habits - `useHabitsStat`: unarchived habits, those due on p_day by cadence
  -- (`isScheduledOn`: daily; weekdays Mon-Fri; otherwise the custom day list, in
  -- JavaScript's 0 = Sunday numbering, which `extract(dow)` shares), and those with
  -- a tick on p_day (`isTickedOn`).
  select
    count(*),
    count(*) filter (where scheduled.due),
    count(*) filter (
      where scheduled.due
        and exists (
          select 1
            from public.habit_logs_data as tick
           where tick.user_id = uid
             and tick.habit_id = scheduled.id
             and tick.logged_on = p_day
        )
    )
    into habits_active, habits_due_today, habits_done_today
    from (
      select habit.id,
             case habit.cadence
               when 'daily' then true
               when 'weekdays' then extract(dow from p_day)::int between 1 and 5
               else extract(dow from p_day)::smallint = any(habit.custom_days)
             end as due
        from public.habits_data as habit
       where habit.user_id = uid
         and habit.archived_at is null
    ) as scheduled;

  return query
  select 'mood'::text, jsonb_build_object(
           'lifetimeCount', mood_lifetime,
           'thisWeekCount', mood_this_week,
           'avg7', mood_avg7)
  union all
  select 'journal'::text, jsonb_build_object(
           'entries', journal_entries,
           'words', journal_words)
  union all
  select 'gratitude'::text, jsonb_build_object(
           'entries', gratitude_entries,
           'thisWeek', gratitude_this_week)
  union all
  select 'breathing'::text, jsonb_build_object(
           'sessions', breathing_sessions,
           'minutes', breathing_minutes)
  union all
  select 'grounding'::text, jsonb_build_object(
           'sessions', grounding_sessions,
           -- The exact shape `Date.prototype.toISOString` produces, so the client
           -- parses it the way it parses its own timestamps.
           'lastCompletedAt', to_char(grounding_last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'lastCompletedOffsetMinutes', grounding_last_offset)
  union all
  select 'meditation'::text, jsonb_build_object(
           'sits', meditation_sits,
           'medianMinutes', meditation_median)
  union all
  select 'sleep'::text, jsonb_build_object(
           'avgDurationMinutes7', sleep_avg_duration_7,
           'avgQuality7', sleep_avg_quality_7)
  union all
  select 'habits'::text, jsonb_build_object(
           'active', habits_active,
           'dueToday', habits_due_today,
           'doneToday', habits_done_today);
end;
$$;

revoke all on function public.home_tool_stats(text, date, text[]) from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.home_tool_stats(text, date, text[]) from anon;
grant execute on function public.home_tool_stats(text, date, text[]) to authenticated;

notify pgrst, 'reload schema';

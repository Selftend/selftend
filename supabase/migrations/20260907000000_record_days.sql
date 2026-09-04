-- Every civil day the viewer has any record on, across the whole product (#1904).
--
-- The "Looking back" screen draws one inert mark per day that has a record, over
-- an all-time axis anchored at the first one. That cannot come from the per-tool
-- list hooks: they cap at 250 rows, and `use-routine-tool-records.ts` documents
-- what happens past the cap - "the oldest in-window day can fall off the cap and
-- its dot renders conservatively OPEN". A rare edge over seven days; the normal
-- case over all time, and it would draw FALSE ABSENCE in early history on the one
-- screen whose whole job is to state the record truthfully. So this spends the
-- screen's single ADR-0001 RPC budget - on READING the record, not on stating
-- anything about it, which is why "the screen computes nothing" survives.
--
-- === The span rule ==================================================================
-- A mark sits on the day the record ITSELF names, so the ten sources below are
-- exactly the ones that name their own day. Everything else is excluded by that
-- rule and not for want of completeness:
--
--   * the nine ACT tables capture no UTC offset (#1513 settled that this is how
--     ACT stays), and
--   * exposure_sessions, worry_entries, anger_logs, core_beliefs, goals,
--     milestones, procrastination_tasks, task_steps and values_profile capture
--     none either - CBT tables excluded by the SAME rule, not by ACT's invariant.
--
-- Their day exists only relative to whoever is looking, so a mark for them would
-- move under the reader's feet. Do not add them "for completeness".
--
-- There is also no routine-completion table to add: doing a routine writes no row
-- of its own, only the underlying tool's, which is already a mark.
--
-- === One frame, the viewer's, passed in =============================================
-- `p_fallback_offset_minutes` is the client-passed frame - the
-- `program_widget_task_status` pattern, NOT a server-resolved day, so it raises no
-- second-frame question. It is used only where a row named no day of its own:
-- 20260726_occurrence_offset_nullable cleared every stored `0`, so mood, gratitude,
-- sleep and journal rows predating it carry a NULL offset. `entryDayKey`
-- (src/lib/occurrence-time.ts) falls back to the viewer's local day for exactly
-- those rows, and this function reproduces that fallback so the two agree row for
-- row. Such rows can move day when the user travels - already true on every screen
-- that renders them.
--
-- === Why the _data tables, not the views ============================================
-- Seven of these ten are decrypting views (`app.decrypt_text` per row, VOLATILE, so
-- the planner can neither merge nor drop the calls - #706). This function reads only
-- plaintext timestamp, offset and date columns, and it scans ALL TIME, so going
-- through the views would decrypt the user's entire history to answer a question
-- about calendar days. `sleep_stats` (20260811000000) already reads
-- `sleep_logs_data` for the same reason. `security invoker` keeps each base table's
-- own `*_select_own` RLS policy in force, so the function sees only the caller's
-- rows - exactly as the views would.
--
-- This declares no exportable column and deliberately does not touch
-- `export_user_data`; every column it reads was added to the export by the
-- migration that introduced it.

create or replace function public.record_days(p_fallback_offset_minutes integer)
returns setof text
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
  -- The same bound the offset columns carry (-840..840). A wild value would not
  -- error anywhere downstream, it would quietly file the legacy tail on the wrong
  -- days, so reject it here rather than render it.
  if p_fallback_offset_minutes is null
     or p_fallback_offset_minutes < -840
     or p_fallback_offset_minutes > 840 then
    raise exception 'Invalid fallback UTC offset'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  with marked as (
    -- The four #250 tools: an occurrence timestamp plus the offset captured with
    -- it, with the viewer's frame standing in where none was captured.
    select coalesce(
             public.occurrence_day_key(mood.logged_at, mood.logged_offset_minutes),
             public.occurrence_day_key(mood.logged_at, p_fallback_offset_minutes)
           ) as day_key
      from public.mood_logs_data as mood
     where mood.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(gratitude.logged_at, gratitude.logged_offset_minutes),
             public.occurrence_day_key(gratitude.logged_at, p_fallback_offset_minutes)
           )
      from public.gratitude_entries_data as gratitude
     where gratitude.user_id = uid
    union
    -- Journal dates by the user-chosen `occurred_at`, not `created_at`: an entry
    -- written today about yesterday belongs to yesterday, which is where the
    -- journal itself files it.
    select coalesce(
             public.occurrence_day_key(journal.occurred_at, journal.occurred_offset_minutes),
             public.occurrence_day_key(journal.occurred_at, p_fallback_offset_minutes)
           )
      from public.journal_entries_data as journal
     where journal.user_id = uid
    union
    -- Sleep is the one source whose day is not `logged_at` at all when the entry
    -- carries a window: #800 files a windowed entry on the civil day at SLEEP
    -- START, in the frame captured at that bound, and stores it as the plaintext
    -- `entry_day`. `window_enc is not null` is the mode marker and costs no
    -- decrypt - verbatim the shape `sleep_stats` uses. Duration-only entries keep
    -- the captured-day calculation, fallback and all.
    select case
             when sleep.window_enc is not null then to_char(sleep.entry_day, 'YYYY-MM-DD')
             else coalesce(
                    public.occurrence_day_key(sleep.logged_at, sleep.logged_offset_minutes),
                    public.occurrence_day_key(sleep.logged_at, p_fallback_offset_minutes)
                  )
           end
      from public.sleep_logs_data as sleep
     where sleep.user_id = uid
    union
    select coalesce(
             public.occurrence_day_key(meditation.completed_at, meditation.completed_offset_minutes),
             public.occurrence_day_key(meditation.completed_at, p_fallback_offset_minutes)
           )
      from public.meditation_sessions as meditation
     where meditation.user_id = uid
    union
    -- Breathing AND grounding share this table and are told apart only by
    -- `exercise_name`. The unit here is a day, and both name the same one, so the
    -- split would change nothing - do not add it.
    select coalesce(
             public.occurrence_day_key(mindfulness.completed_at, mindfulness.completed_offset_minutes),
             public.occurrence_day_key(mindfulness.completed_at, p_fallback_offset_minutes)
           )
      from public.mindfulness_sessions_data as mindfulness
     where mindfulness.user_id = uid
    union
    -- Behavioural activation contributes COMPLETIONS ONLY. An activity can be
    -- scheduled days before it is done, and planning is not a record of doing
    -- (the same rule `stepDoneOnDate` applies). An open activity has a null
    -- `completed_at` and contributes nothing.
    select coalesce(
             public.occurrence_day_key(activity.completed_at, activity.completed_offset_minutes),
             public.occurrence_day_key(activity.completed_at, p_fallback_offset_minutes)
           )
      from public.activity_logs_data as activity
     where activity.user_id = uid
       and activity.completed_at is not null
    union
    -- Archiving IS this tool's delete - every thought-record read filters
    -- `archived_at is null` (src/features/cbt/repository.ts), and a deleted record
    -- must not leave a permanent mark the person cannot remove.
    select coalesce(
             public.occurrence_day_key(thought.created_at, thought.created_offset_minutes),
             public.occurrence_day_key(thought.created_at, p_fallback_offset_minutes)
           )
      from public.thought_records_data as thought
     where thought.user_id = uid
       and thought.archived_at is null
    union
    -- Habits and self-care store a plaintext civil date already: no timestamp, no
    -- offset, no frame question. `to_char` rather than `::text` so the key never
    -- depends on the session's DateStyle.
    select to_char(habit.logged_on, 'YYYY-MM-DD')
      from public.habit_logs_data as habit
     where habit.user_id = uid
    union
    select to_char(self_care.log_date, 'YYYY-MM-DD')
      from public.self_care_logs_data as self_care
     where self_care.user_id = uid
  )
  -- `union` has already made the set distinct: a day with six records across four
  -- tools yields exactly one key, same as a day with one. Ascending, because the
  -- axis is anchored at the first record.
  select marked.day_key
    from marked
   where marked.day_key is not null
   order by 1;
end;
$$;

revoke all on function public.record_days(integer) from public;
revoke execute on function public.record_days(integer) from anon;
grant execute on function public.record_days(integer) to authenticated;

notify pgrst, 'reload schema';

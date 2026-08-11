-- Optional encrypted sleep window + plaintext derived entry day (#800, built for #774).
--
-- The redesign assumes a sleep log is *about a night*; the schema modelled it as
-- *an event logged at a moment*. #800 resolved the mismatch without inventing a
-- night identity: a row stays one **sleep entry**, which may now opt into one
-- **sleep window** — estimated `Sleep started` / `Sleep ended` bounds.
--
-- Shape (decided on #800, trade-offs recorded in docs/adr/0002):
--
--   * `window_enc bytea` — the exact bounds and the UTC offset captured at each
--     bound, encrypted TOGETHER as one JSON payload through the existing
--     application encryption boundary. One ciphertext, so the decrypting view
--     pays ONE `app.decrypt_text` per row, not four — `decrypt_text` is VOLATILE
--     and the planner cannot merge or drop its calls (#706).
--   * `entry_day date not null` — the coarse plaintext calendar key: the civil
--     day at sleep start for windowed entries, the existing captured-day
--     calculation otherwise (UTC fallback when the offset was never captured).
--     Not user input, not a night identity. It exists so day-scoped statistics
--     and stable paged ordering never need to decrypt exact timing.
--   * Both bounds present or both absent — one-sided windows are invalid.
--   * The write path DERIVES duration from the bounds and rejects a client
--     duration that contradicts them: a screen must never hold a duration its
--     own two times contradict (#774).
--   * Switching an entry back to duration-only deletes the ciphertext rather
--     than retaining hidden exact times.
--
-- Existing rows receive no guessed window and remain valid indefinitely.

-- === Part 1: columns ===============================================================

alter table public.sleep_logs_data add column if not exists window_enc bytea;
alter table public.sleep_logs_data add column if not exists entry_day date;

-- Backfill the derived day for every existing row: exactly the day the product
-- already uses for offset-carrying rows; the UTC day where the offset was never
-- captured (those rows keep rendering on the viewer's local day client-side —
-- the stored value only ever drives ordering and windowed aggregates).
--
-- `set_sleep_logs_updated_at` is disabled across the backfill: deriving a
-- calendar key is not a user edit, and `updated_at` reads as genuine activity
-- (see 20260726 for the precedent and the journal incident that motivated it).
alter table public.sleep_logs_data disable trigger set_sleep_logs_updated_at;
update public.sleep_logs_data
   set entry_day = ((logged_at at time zone 'UTC')
                    + make_interval(mins => coalesce(logged_offset_minutes, 0)))::date
 where entry_day is null;
alter table public.sleep_logs_data enable trigger set_sleep_logs_updated_at;

alter table public.sleep_logs_data alter column entry_day set not null;

-- Keyset ordering for the all-history screen (#800: entry day, then creation
-- time; ordering by encrypted sleep end was considered and rejected).
create index if not exists sleep_logs_user_day_created_idx
  on public.sleep_logs_data (user_id, entry_day desc, created_at desc, id desc);

-- Safety net so ANY insert path satisfies `not null` — the view's own writer
-- (`sleep_logs_ins`) inserts before `zz_sleep_logs_occurrence` runs, and a
-- service-role script inserting into the base table directly never runs the
-- view triggers at all. The zz trigger below remains authoritative for view
-- writes and overwrites this first approximation with the offset-aware value.
create or replace function public.set_sleep_logs_entry_day() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if new.entry_day is null then
    new.entry_day := ((new.logged_at at time zone 'UTC')
                      + make_interval(mins => coalesce(new.logged_offset_minutes, 0)))::date;
  end if;
  return new;
end;
$$;
drop trigger if exists set_sleep_logs_entry_day on public.sleep_logs_data;
create trigger set_sleep_logs_entry_day
  before insert on public.sleep_logs_data
  for each row execute function public.set_sleep_logs_entry_day();

-- === Part 2: the decrypting view =====================================================
-- Existing columns keep their exact order and types; the two new ones append.
-- `sleep_window` is the decrypted JSON payload as text (null when no window).

create or replace view public.sleep_logs with (security_invoker = true) as
  select id, user_id, duration_minutes, quality,
         app.decrypt_text(notes_enc) as notes,
         logged_at, created_at, updated_at,
         logged_offset_minutes,
         app.decrypt_text(window_enc) as sleep_window,
         entry_day
    from public.sleep_logs_data;

grant select, insert, update, delete on public.sleep_logs to authenticated;

-- === Part 3: the window-aware occurrence trigger =====================================
-- `zz_sleep_logs_occurrence` already runs after `sleep_logs_ins`/`_upd` (INSTEAD OF
-- triggers fire in name order) and attaches what the original encrypted writers do
-- not know about. It now also owns the sleep window: validation, duration check,
-- the derived entry day, and the ciphertext itself.

create or replace function public.zz_sleep_logs_occurrence() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  w jsonb;
  v_started timestamptz;
  v_ended timestamptz;
  v_started_offset integer;
  v_ended_offset integer;
  v_derived integer;
  v_window_text text;
  v_entry_day date;
begin
  perform public.validate_occurrence_time(new.logged_at, new.logged_offset_minutes);

  if new.sleep_window is not null then
    begin
      w := new.sleep_window::jsonb;
      v_started := (w ->> 'startedAt')::timestamptz;
      v_ended := (w ->> 'endedAt')::timestamptz;
      v_started_offset := (w ->> 'startedOffsetMinutes')::integer;
      v_ended_offset := (w ->> 'endedOffsetMinutes')::integer;
    exception when others then
      raise exception 'Invalid sleep window' using errcode = 'check_violation';
    end;

    -- Pair completeness: both bounds and both captured offsets, or nothing.
    if v_started is null or v_ended is null
       or v_started_offset is null or v_ended_offset is null then
      raise exception 'Sleep window requires both bounds and both offsets'
        using errcode = 'check_violation';
    end if;
    if v_started_offset < -840 or v_started_offset > 840
       or v_ended_offset < -840 or v_ended_offset > 840 then
      raise exception 'Invalid sleep window offset' using errcode = 'check_violation';
    end if;
    if v_ended <= v_started then
      raise exception 'Sleep end must be after sleep start' using errcode = 'check_violation';
    end if;
    if v_ended > timezone('utc', now()) + interval '5 minutes' then
      raise exception 'Sleep end cannot be in the future' using errcode = 'check_violation';
    end if;

    v_derived := round(extract(epoch from (v_ended - v_started)) / 60)::integer;
    if v_derived < 1 or v_derived > 1440 then
      raise exception 'Sleep window must be between one minute and 24 hours'
        using errcode = 'check_violation';
    end if;
    -- The duration is DERIVED, never independently editable: a client value that
    -- contradicts its own two times is rejected rather than silently corrected,
    -- so the record can never disagree with what the user was shown (#774).
    if new.duration_minutes is distinct from v_derived then
      raise exception 'Duration must match the sleep window'
        using errcode = 'check_violation';
    end if;

    -- Re-serialize from the parsed values: only the four known fields persist.
    v_window_text := jsonb_build_object(
      'startedAt', to_char(v_started at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'startedOffsetMinutes', v_started_offset,
      'endedAt', to_char(v_ended at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'endedOffsetMinutes', v_ended_offset
    )::text;
    -- A windowed entry belongs to the civil day at sleep start, in the frame
    -- captured at that bound (#800).
    v_entry_day := ((v_started at time zone 'UTC')
                    + make_interval(mins => v_started_offset))::date;
  else
    -- Duration-only: no ciphertext retained (switching modes DELETES the window),
    -- and the entry day stays the captured-day calculation.
    v_window_text := null;
    v_entry_day := ((new.logged_at at time zone 'UTC')
                    + make_interval(mins => coalesce(new.logged_offset_minutes, 0)))::date;
  end if;

  update public.sleep_logs_data
     set logged_offset_minutes = new.logged_offset_minutes,
         window_enc = case when v_window_text is null then null
                           else app.encrypt_text(v_window_text) end,
         entry_day = v_entry_day
   where id = new.id
   returning updated_at into new.updated_at;

  new.sleep_window := v_window_text;
  new.entry_day := v_entry_day;
  return new;
end;
$$;

-- === Part 4: sleep_stats buckets windowed entries by their entry day ================
-- Same signature, same shape; the only change is the civil-day case for windowed
-- rows, which no longer depends on `logged_at`. `window_enc is not null` is the
-- mode marker and costs no decrypt. Everything else is verbatim from 20260808000000.

create or replace function public.sleep_stats(p_time_zone text)
returns table (
  avg_duration_minutes_7 numeric,
  avg_quality_7 numeric,
  avg_duration_minutes_30 numeric,
  avg_quality_30 numeric,
  quality_counts_30 bigint[],
  longest_minutes integer,
  shortest_minutes integer,
  weekday_avg_minutes numeric[]
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
  if p_time_zone is null then
    raise exception 'Time zone is required' using errcode = 'invalid_parameter_value';
  end if;
  begin
    perform now() at time zone p_time_zone;
  exception
    when invalid_parameter_value then
      raise exception 'Unknown time zone: %', p_time_zone using errcode = 'invalid_parameter_value';
  end;

  return query
  with night as (
    -- One row per sleep entry, carrying the civil day it belongs to. Windowed
    -- entries use the stored derived day (civil day at sleep start, #800);
    -- the rest mirror `entryDayKey()` in src/lib/occurrence-time.ts, including
    -- its viewer-time-zone fallback for never-captured offsets.
    select
      sleep_log.duration_minutes,
      sleep_log.quality,
      case
        when sleep_log.window_enc is not null then sleep_log.entry_day
        when sleep_log.logged_offset_minutes is null
          then (sleep_log.logged_at at time zone p_time_zone)::date
        else (
          (sleep_log.logged_at at time zone 'UTC')
            + make_interval(mins => sleep_log.logged_offset_minutes)
        )::date
      end as civil_day
      from public.sleep_logs_data as sleep_log
     where sleep_log.user_id = uid
  ),
  bounds as (
    select greatest(max(night.civil_day), (now() at time zone p_time_zone)::date) as end_day
      from night
  ),
  win7 as (
    select night.*
      from night, bounds
     where night.civil_day between bounds.end_day - 6 and bounds.end_day
  ),
  win30 as (
    select night.*
      from night, bounds
     where night.civil_day between bounds.end_day - 29 and bounds.end_day
  )
  select
    (select avg(win7.duration_minutes) from win7),
    (select avg(win7.quality) from win7),
    (select avg(win30.duration_minutes) from win30),
    (select avg(win30.quality) from win30),
    (select array_agg(bucket.n order by bucket.q)
       from (
         select q.q, count(win30.quality) as n
           from generate_series(1, 5) as q(q)
           left join win30 on win30.quality = q.q
          group by q.q
       ) as bucket),
    (select max(night.duration_minutes) from night),
    (select min(night.duration_minutes) from night),
    (select array_agg(weekday.avg_minutes order by weekday.idx)
       from (
         select d.idx, avg(night.duration_minutes) as avg_minutes
           from generate_series(1, 7) as d(idx)
           left join night on extract(isodow from night.civil_day)::int = d.idx
          group by d.idx
       ) as weekday);
end;
$$;

revoke all on function public.sleep_stats(text) from public;
revoke execute on function public.sleep_stats(text) from anon;
grant execute on function public.sleep_stats(text) to authenticated;

-- === Part 5: export gains the window ================================================
-- Flat redeclaration from 20260810000002, extended only with `entry_day` and the
-- decrypted `sleep_window` payload in the sleepLogs block.
create or replace function public.export_user_data()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
  reminder_prefs jsonb;
  funnel_prefs jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- === base ===
  result := json_build_object(
    'exportDate', timezone('utc', now()),
    'profile', (
      select row_to_json(p)
      from (
        select
          email,
          display_name,
          avatar_url,
          avatar_source,
          avatar_updated_at,
          created_at,
          updated_at
        from public.profiles
        where user_id = uid
      ) p
    ),
    'preferences', (
      select row_to_json(pr)
      from (
        select
          enabled_modules,
          reminder_consent,
          reminder_consent_updated_at,
          cbt_reminders_enabled,
          cbt_reminder_hour,
          cbt_reminder_minute,
          cbt_reminder_timezone,
          app_onboarding_completed,
          cbt_onboarding_completed,
          privacy_policy_accepted_at,
          terms_accepted_at,
          policy_version_accepted,
          cookie_consent,
          language,
          email_verified,
          selected_concerns,
          active_strategies,
          reminder_prompted_tools,
          theme,
          notifications_enabled_global,
          ambient_sound_id,
          ambient_volume,
          breath_sound_id,
          breath_volume,
          breathing_cycles,
          last_breathing_pattern_id,
          emotions_seeded,
          widgets_seeded,
          shown_button_tours,
          mood_onboarding_completed,
          gratitude_onboarding_completed,
          journal_onboarding_completed,
          sleep_onboarding_completed,
          habits_onboarding_completed,
          meditation_onboarding_completed,
          meditation_info_completed,
          mindfulness_onboarding_completed,
          grounding_onboarding_completed,
          act_onboarding_completed,
          cbt_wizard_completed,
          cbt_program_started_at,
          cbt_program_phase_index,
          cbt_program_phase_started_at,
          cbt_program_completed_at,
          cbt_program_prompt_dismissed_at,
          cbt_graduation_dismissed_at,
          act_program_started_at,
          act_program_phase_index,
          act_program_phase_started_at,
          act_program_completed_at,
          act_program_prompt_dismissed_at,
          act_graduation_dismissed_at,
          created_at,
          updated_at
        from public.user_preferences
        where user_id = uid
      ) pr
    ),
    'webPushSubscriptions', (
      select coalesce(json_agg(row_to_json(wps)), '[]'::json)
      from (
        select
          endpoint,
          user_agent,
          time_zone,
          enabled,
          last_success_at,
          last_failure_at,
          failure_count,
          last_reminder_key,
          created_at,
          updated_at
        from public.web_push_subscriptions
        where user_id = uid
        order by created_at asc
      ) wps
    ),
    'thoughtRecords', (
      select coalesce(json_agg(row_to_json(tr)), '[]'::json)
      from (
        select
          id,
          situation,
          nats,
          emotions,
          emotion_intensity_before,
          distortions,
          evidence_for,
          evidence_against,
          balanced_thought,
          emotion_intensity_after,
          outcome_notes,
          archived_at,
          created_at,
          updated_at,
          created_offset_minutes
        from public.thought_records
        where user_id = uid
        order by created_at asc
      ) tr
    ),
    'goals', (
      select coalesce(json_agg(row_to_json(g)), '[]'::json)
      from (
        select
          id,
          title,
          description,
          life_domain,
          goal_type,
          target_date,
          status,
          created_at,
          updated_at
        from public.goals
        where user_id = uid
        order by created_at asc
      ) g
    ),
    'milestones', (
      select coalesce(json_agg(row_to_json(m)), '[]'::json)
      from (
        select
          id,
          goal_id,
          description,
          target_date,
          completed_at,
          created_at,
          updated_at
        from public.milestones
        where user_id = uid
        order by created_at asc
      ) m
    ),
    'valuesProfiles', (
      select coalesce(json_agg(row_to_json(vp)), '[]'::json)
      from (
        select
          id,
          personal_values,
          priority_values,
          created_at,
          updated_at
        from public.values_profile
        where user_id = uid
        order by created_at asc
      ) vp
    ),
    'activityLogs', (
      select coalesce(json_agg(row_to_json(al)), '[]'::json)
      from (
        select
          id,
          activity_name,
          category,
          pace_category,
          scheduled_at,
          completed_at,
          mood_before,
          mood_after,
          notes,
          created_at,
          updated_at,
          completed_offset_minutes,
          scheduled_offset_minutes
        from public.activity_logs
        where user_id = uid
        order by created_at asc
      ) al
    ),
    'moodLogs', (
      select coalesce(json_agg(row_to_json(ml)), '[]'::json)
      from (
        select
          id,
          mood_score,
          emotions,
          notes,
          situation,
          thoughts,
          behaviours,
          bodily_sensations,
          linked_strategy,
          logged_at,
          created_at,
          logged_offset_minutes
        from public.mood_logs
        where user_id = uid
        order by logged_at asc
      ) ml
    ),
    'coreBeliefs', (
      select coalesce(json_agg(row_to_json(cb)), '[]'::json)
      from (
        select
          id,
          belief_statement,
          triggering_situations,
          evidence_for,
          evidence_against,
          alternative_belief,
          original_belief_strength,
          alternative_belief_strength,
          reinforcement_plan,
          next_review_date,
          created_at,
          updated_at
        from public.core_beliefs
        where user_id = uid
        order by created_at asc
      ) cb
    ),
    'exposureHierarchies', (
      select coalesce(json_agg(row_to_json(eh)), '[]'::json)
      from (
        select
          id,
          title,
          anxiety_type,
          created_at,
          updated_at
        from public.exposure_hierarchies
        where user_id = uid
        order by created_at asc
      ) eh
    ),
    'exposureItems', (
      select coalesce(json_agg(row_to_json(ei)), '[]'::json)
      from (
        select
          id,
          hierarchy_id,
          description,
          suds_rating,
          completed_at,
          created_at,
          updated_at
        from public.exposure_items
        where user_id = uid
        order by created_at asc
      ) ei
    ),
    'exposureSessions', (
      select coalesce(json_agg(row_to_json(es)), '[]'::json)
      from (
        select
          id,
          exposure_item_id,
          pre_suds,
          post_suds,
          duration_minutes,
          safety_behaviors_used,
          safety_behavior_description,
          notes,
          completed_at,
          created_at
        from public.exposure_sessions
        where user_id = uid
        order by created_at asc
      ) es
    ),
    'worryEntries', (
      select coalesce(json_agg(row_to_json(we)), '[]'::json)
      from (
        select
          id,
          worry_statement,
          worry_category,
          probability_estimate,
          evidence_for,
          evidence_against,
          coping_statement,
          action_steps,
          resolved,
          created_at,
          updated_at
        from public.worry_entries
        where user_id = uid
        order by created_at asc
      ) we
    ),
    'mindfulnessSessions', (
      select coalesce(json_agg(row_to_json(ms)), '[]'::json)
      from (
        select
          id,
          exercise_name,
          duration_minutes,
          reflection,
          mood_after,
          feeling_after,
          cycles,
          duration_seconds,
          completed_at,
          created_at,
          completed_offset_minutes,
          steps_completed,
          steps_total
        from public.mindfulness_sessions
        where user_id = uid
        order by completed_at asc
      ) ms
    ),
    'procrastinationTasks', (
      select coalesce(json_agg(row_to_json(pt)), '[]'::json)
      from (
        select
          id,
          task_description,
          avoidance_reason,
          fear_thought,
          challenged_thought,
          deadline,
          reward,
          status,
          created_at,
          updated_at
        from public.procrastination_tasks
        where user_id = uid
        order by created_at asc
      ) pt
    ),
    'taskSteps', (
      select coalesce(json_agg(row_to_json(ts)), '[]'::json)
      from (
        select
          id,
          task_id,
          description,
          estimated_minutes,
          completed_at,
          created_at,
          updated_at
        from public.task_steps
        where user_id = uid
        order by created_at asc
      ) ts
    ),
    'angerLogs', (
      select coalesce(json_agg(row_to_json(agl)), '[]'::json)
      from (
        select
          id,
          trigger_text,
          interpretation,
          arousal_level,
          urge,
          behavior_chosen,
          consequence,
          time_out_taken,
          alternative_interpretation,
          outcome_rating,
          notes,
          created_at,
          updated_at
        from public.anger_logs
        where user_id = uid
        order by created_at asc
      ) agl
    ),
    'selfCareLogs', (
      select coalesce(json_agg(row_to_json(scl)), '[]'::json)
      from (
        select
          id,
          log_date,
          exercise_done,
          exercise_minutes,
          exercise_type,
          meals_structured,
          emotional_eating,
          social_connection_made,
          social_notes,
          meaningful_activity,
          created_at,
          updated_at
        from public.self_care_logs
        where user_id = uid
        order by log_date asc
      ) scl
    ),
    'recoveryPlans', (
      select coalesce(json_agg(row_to_json(rp)), '[]'::json)
      from (
        select
          id,
          recovery_keys,
          personal_slogan,
          strategy_integration_notes,
          maintenance_commitments,
          created_at,
          updated_at
        from public.recovery_plans
        where user_id = uid
        order by created_at asc
      ) rp
    ),
    'challengePlans', (
      select coalesce(json_agg(row_to_json(cp)), '[]'::json)
      from (
        select
          id,
          recovery_plan_id,
          challenge_description,
          coping_steps,
          created_at,
          updated_at
        from public.challenge_plans
        where user_id = uid
        order by created_at asc
      ) cp
    ),
    'journalEntries', (
      select coalesce(json_agg(row_to_json(je)), '[]'::json)
      from (
        select
          id,
          title,
          body,
          occurred_at,
          created_at,
          updated_at,
          occurred_offset_minutes
        from public.journal_entries
        where user_id = uid
        order by created_at asc
      ) je
    ),
    'sleepLogs', (
      -- The decrypted window payload nests as real JSON (start, end and both
      -- captured offsets — no stored user field may silently disappear from
      -- export, #800). The cast happens out here because the select below must
      -- stay bare identifiers for test/export-user-data-monotonic.test.ts.
      select coalesce(
        json_agg((to_jsonb(sl) - 'sleep_window')
                 || jsonb_build_object('sleep_window', sl.sleep_window::jsonb)),
        '[]'::json)
      from (
        select
          id,
          duration_minutes,
          quality,
          notes,
          logged_at,
          created_at,
          updated_at,
          logged_offset_minutes,
          entry_day,
          sleep_window
        from public.sleep_logs
        where user_id = uid
        order by logged_at asc
      ) sl
    )
  )::jsonb;

  -- === meditation / gratitude / habits ===
  result := result || jsonb_build_object(
    'meditationSessions', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select
          id,
          stage_at_session,
          duration_minutes,
          completed_at,
          created_at,
          mind_wandering_episodes,
          dullness_level,
          distraction_level,
          obstacle_tags,
          reflection,
          mood_after,
          technique_used,
          completed_offset_minutes
        from public.meditation_sessions
        where user_id = uid
        order by completed_at asc
      ) s
    ),
    'meditationProgramState', (
      select to_jsonb(p)
      from (
        select
          current_stage,
          assessed_stage,
          milestones_reached,
          onboarding_completed_at,
          last_session_at,
          preferred_duration_minutes,
          preferred_time_of_day,
          created_at,
          updated_at
        from public.meditation_program_state
        where user_id = uid
      ) p
    ),
    'stagePracticeNotes', (
      select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
      from (
        select
          id,
          stage,
          note,
          created_at,
          updated_at
        from public.stage_practice_notes
        where user_id = uid
        order by stage asc, updated_at asc
      ) n
    )
  );

  result := result || jsonb_build_object(
    'gratitudeEntries', (
      select coalesce(jsonb_agg(to_jsonb(ge)), '[]'::jsonb)
      from (
        select
          id,
          level,
          events,
          good_moment,
          miss_if_gone,
          hidden_good,
          item_1,
          item_2,
          item_3,
          item_4,
          item_5,
          life_item_1,
          life_item_2,
          life_item_3,
          note,
          starred,
          logged_at,
          created_at,
          updated_at,
          logged_offset_minutes
        from public.gratitude_entries
        where user_id = uid
        order by logged_at asc
      ) ge
    )
  );

  result := result || jsonb_build_object(
    'habits', (
      select coalesce(jsonb_agg(to_jsonb(h)), '[]'::jsonb)
      from (
        select
          id,
          name,
          kind,
          identity,
          cue_plan,
          stack_after,
          craving_pairing,
          two_minute_version,
          reward_note,
          cadence,
          custom_days,
          color,
          archived_at,
          created_at,
          updated_at
        from public.habits
        where user_id = uid
        order by created_at asc
      ) h
    ),
    'habitLogs', (
      select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
      from (
        select
          id,
          habit_id,
          logged_on,
          note,
          created_at,
          updated_at
        from public.habit_logs
        where user_id = uid
        order by logged_on asc, created_at asc
      ) l
    )
  );

  -- === emotion preferences ===
  result := result || jsonb_build_object(
    'emotionPreferences', (
      select coalesce(jsonb_agg(to_jsonb(ep)), '[]'::jsonb)
      from (
        select
          id,
          emotion_id,
          name,
          emoji,
          position,
          removed,
          is_custom,
          created_at,
          updated_at
        from public.emotion_preferences
        where user_id = uid
        order by position asc, created_at asc
      ) ep
    )
  );

  -- === ACT program state / logs ===
  result := result || jsonb_build_object(
    'actProgramState', (
      select to_jsonb(s)
      from (
        select
          active_principles,
          primary_concerns,
          myths_acknowledged,
          onboarding_completed_at,
          last_check_in_at,
          preferred_check_in_time,
          created_at,
          updated_at
        from public.act_program_state
        where user_id = uid
      ) s
    ),
    'actDefusionLogs', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
      from (
        select
          id, fused_thought, thought_category, fusion_level_before, technique_used,
          defused_version, fusion_level_after, notes, created_at, updated_at
        from public.act_defusion_logs
        where user_id = uid
        order by created_at asc
      ) d
    ),
    'actExpansionLogs', (
      select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
      from (
        select
          id, emotion, body_sensation, intensity_before, struggle_switch_on,
          discomfort_type, technique_used, intensity_after, notes, created_at, updated_at
        from public.act_expansion_logs
        where user_id = uid
        order by created_at asc
      ) e
    ),
    'actUrgeSurfLogs', (
      select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
      from (
        select
          id, urge_description, trigger, peak_intensity, surfing_notes,
          urge_acted_on, completed_at, created_at, updated_at
        from public.act_urge_surf_logs
        where user_id = uid
        order by created_at asc
      ) u
    ),
    'actConnectionLogs', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from (
        select
          id, technique, activity_context, notices_from_senses, duration_minutes,
          mood_after, notes, created_at, updated_at
        from public.act_connection_logs
        where user_id = uid
        order by created_at asc
      ) c
    ),
    'actObservingSelfSessions', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select
          id, technique_used, what_was_observed, duration_minutes, mood_after,
          notes, created_at, updated_at
        from public.act_observing_self_sessions
        where user_id = uid
        order by created_at asc
      ) o
    )
  );

  result := result || jsonb_build_object(
    'actValueEntries', (
      select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
      from (
        select
          id, life_domain, value_statement, importance_rating, current_alignment_rating,
          current_actions_note, desired_actions_note, barriers, created_at, updated_at
        from public.act_value_entries
        where user_id = uid
        order by life_domain asc
      ) v
    ),
    'actBullsEyeSnapshots', (
      select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
      from (
        select
          id, domain, alignment_rating, reviewed_at, created_at
        from public.act_bulls_eye_snapshots
        where user_id = uid
        order by reviewed_at asc
      ) b
    ),
    'actCommittedActions', (
      select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
      from (
        select
          id, life_domain, title, description, status, target_date, obstacles,
          created_at, updated_at
        from public.act_committed_actions
        where user_id = uid
        order by created_at asc
      ) a
    ),
    'actActionSteps', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select
          id, action_id, description, is_completed, completed_at, created_at, updated_at
        from public.act_action_steps
        where user_id = uid
        order by created_at asc
      ) s
    ),
    'actChoicePoints', (
      select coalesce(jsonb_agg(to_jsonb(cp)), '[]'::jsonb)
      from (
        select
          id, hooks, away_moves, toward_moves, notes, created_at, updated_at
        from public.act_choice_points
        where user_id = uid
        order by created_at asc
      ) cp
    )
  );

  result := result || jsonb_build_object(
    'routines', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      from (
        select
          id, name, reminder_enabled, reminder_hour, reminder_minute,
          reminder_timezone, cadence, custom_days, created_at, updated_at
        from public.routines
        where user_id = uid
        order by created_at asc
      ) r
    ),
    'routineSteps', (
      select coalesce(jsonb_agg(to_jsonb(rs)), '[]'::jsonb)
      from (
        select
          id, routine_id, tool_id, position, created_at, updated_at
        from public.routine_steps
        where user_id = uid
        order by routine_id asc, position asc, created_at asc
      ) rs
    ),
    'widgetPreferences', (
      select coalesce(jsonb_agg(to_jsonb(wp)), '[]'::jsonb)
      from (
        select
          id, widget_id, position, created_at
        from public.widget_preferences
        where user_id = uid
        order by position asc
      ) wp
    )
  );

  -- === reminder prefs merged into preferences ===
  select to_jsonb(p) into reminder_prefs
  from (
    select
      meditation_reminders_enabled, meditation_reminder_hour,
      meditation_reminder_minute, meditation_reminder_timezone,
      act_reminders_enabled, act_reminder_hour,
      act_reminder_minute, act_reminder_timezone,
      mood_reminders_enabled, mood_reminder_hour,
      mood_reminder_minute, mood_reminder_timezone,
      journal_reminders_enabled, journal_reminder_hour,
      journal_reminder_minute, journal_reminder_timezone,
      gratitude_reminders_enabled, gratitude_reminder_hour,
      gratitude_reminder_minute, gratitude_reminder_timezone,
      grounding_reminders_enabled, grounding_reminder_hour,
      grounding_reminder_minute, grounding_reminder_timezone,
      breathing_reminders_enabled, breathing_reminder_hour,
      breathing_reminder_minute, breathing_reminder_timezone,
      sleep_reminders_enabled, sleep_reminder_hour,
      sleep_reminder_minute, sleep_reminder_timezone,
      habits_reminders_enabled, habits_reminder_hour,
      habits_reminder_minute, habits_reminder_timezone
    from public.user_preferences
    where user_id = uid
  ) p;

  if reminder_prefs is not null then
    result := jsonb_set(
      result,
      '{preferences}',
      coalesce(result -> 'preferences', '{}'::jsonb) || reminder_prefs
    );
  end if;

  -- === device push tokens ===
  result := result || jsonb_build_object(
    'devicePushTokens', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select id, platform, time_zone, enabled, last_success_at, last_failure_at,
          failure_count, created_at, updated_at
        from public.device_push_tokens
        where user_id = uid
        order by created_at asc
      ) t
    )
  );

  -- === custom breathing exercises (#429 - the table-level completeness check's
  -- first catch: user-created content that had never been in the export) ===
  result := result || jsonb_build_object(
    'breathingExercises', (
      select coalesce(jsonb_agg(to_jsonb(bx)), '[]'::jsonb)
      from (
        select id, name, inhale_seconds, hold_in_seconds, exhale_seconds,
          hold_out_seconds, cycles, color, created_at, updated_at
        from public.breathing_exercises
        where user_id = uid
        order by created_at asc
      ) bx
    )
  );

  -- === feedback submissions (#429 - rate-limit rows, but "when I sent
  -- feedback" is the user's own activity record) ===
  result := result || jsonb_build_object(
    'feedbackSubmissions', (
      select coalesce(jsonb_agg(to_jsonb(fs)), '[]'::jsonb)
      from (
        select id, created_at
        from public.feedback_submissions
        where user_id = uid
        order by created_at asc
      ) fs
    )
  );

  -- === funnel prefs merged into preferences (was the head export_user_data) ===
  select to_jsonb(p) into funnel_prefs
  from (
    select
      start_here_dismissed_at,
      app_onboarding_completed_via,
      app_onboarding_completed_at
    from public.user_preferences
    where user_id = uid
  ) p;

  if funnel_prefs is not null then
    result := jsonb_set(
      result,
      '{preferences}',
      coalesce(result -> 'preferences', '{}'::jsonb) || funnel_prefs
    );
  end if;

  return result;
end;
$$;

revoke execute on function public.export_user_data() from public, anon;
grant execute on function public.export_user_data() to authenticated;

notify pgrst, 'reload schema';

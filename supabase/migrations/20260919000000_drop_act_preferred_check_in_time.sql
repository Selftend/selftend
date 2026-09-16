-- Drop act_program_state.preferred_check_in_time (#2490; `docs/reminders.md`
-- § 11 item 10, found on #2414).
--
-- The column held one thing: an HH:mm string the ACT programme would have used
-- to time its own check-in reminder. No screen ever collected it, nothing in
-- the app reads it back, and ACT's reminder time has lived in the
-- `act_reminder_*` columns on `user_preferences` since the notification
-- registry existed - the same four columns every other module's reminder uses.
-- A stored preference with no reader is personal data kept for no reason, so it
-- goes, column and values.
--
-- ⚠️ "No writer, no reader" is true of the app, not of the repo: the demo seed
-- wrote "20:30" into it and an integration test asserted it survived to the
-- base table in plaintext. Both go with the column in this change.
--
-- ⚠️ A shipped client that still sends this column is safe. `act_program_state`
-- is a view whose INSTEAD OF INSERT trigger names its own column list, so an
-- older build's `preferred_check_in_time` key meets PostgREST's reloaded schema
-- cache and is rejected as an unknown column on that key alone - the ACT
-- programme has no live write path today (`upsertACTProgramState` has no caller
-- that sets it), so nothing degrades.

-- ═══════════════════════════════════════════════════════════════════════════════
-- The column, and the view that selects it
-- ═══════════════════════════════════════════════════════════════════════════════
-- `act_program_state` is the transparent decrypting view over
-- `act_program_state_data` (20260635) and selects this column by name, so the
-- drop would otherwise need CASCADE. The view is dropped first and rebuilt
-- below - which takes its three INSTEAD OF triggers with it, so all three are
-- re-attached at the end. `create or replace view` cannot do this: Postgres
-- allows a replacement to add trailing columns, never to remove one.

drop view if exists public.act_program_state;

alter table public.act_program_state_data
  drop column if exists preferred_check_in_time;

-- Rebuilt from 20260635 minus the one column. `security_invoker = true` keeps
-- the base table's RLS applying to the caller rather than to the view's owner.
create view public.act_program_state with (security_invoker = true) as
  select user_id,
         active_principles,
         app.decrypt_text(primary_concerns_enc)::text[] as primary_concerns,
         myths_acknowledged,
         onboarding_completed_at,
         last_check_in_at,
         created_at,
         updated_at
  from public.act_program_state_data;

-- ═══════════════════════════════════════════════════════════════════════════════
-- The INSTEAD OF trigger functions that copied the column
-- ═══════════════════════════════════════════════════════════════════════════════
-- Each is copied WHOLESALE from its newest declaration and differs from it by
-- exactly the lines naming the dropped column - the same last-writer-wins
-- hazard `export_user_data` has (#429), on a much shorter body.
--
--   act_program_state_ins - newest declaration 20260668 (the partial-upsert
--     hardening, #40: NEW.* raw means "omitted", coalesced to the existing base
--     value so a partial write cannot clobber the rest of the row).
--   act_program_state_upd - newest declaration 20260662 (returns the fresh
--     created_at/updated_at into NEW so .update().select() reflects them).
--   act_program_state_del - unchanged since 20260635; it keys on old.user_id
--     and never named this column, so the function is left exactly as it is and
--     only its trigger is re-attached.

create or replace function public.act_program_state_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare merged_primary_concerns_enc bytea;
begin
  insert into public.act_program_state_data (
    user_id, active_principles, primary_concerns_enc, myths_acknowledged,
    onboarding_completed_at, last_check_in_at, created_at, updated_at)
  values (
    coalesce(new.user_id, auth.uid()),
    coalesce(new.active_principles, array[]::text[]),
    app.encrypt_text(coalesce(new.primary_concerns, array[]::text[])::text),
    coalesce(new.myths_acknowledged, false),
    new.onboarding_completed_at,
    new.last_check_in_at,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  on conflict (user_id) do update set
    active_principles       = coalesce(new.active_principles, act_program_state_data.active_principles),
    primary_concerns_enc    = coalesce(app.encrypt_text(new.primary_concerns::text), act_program_state_data.primary_concerns_enc),
    myths_acknowledged      = coalesce(new.myths_acknowledged, act_program_state_data.myths_acknowledged),
    onboarding_completed_at = coalesce(new.onboarding_completed_at, act_program_state_data.onboarding_completed_at),
    last_check_in_at        = coalesce(new.last_check_in_at, act_program_state_data.last_check_in_at),
    updated_at              = timezone('utc', now())
  returning user_id, active_principles, primary_concerns_enc, myths_acknowledged,
            onboarding_completed_at, last_check_in_at, created_at, updated_at
    into new.user_id, new.active_principles, merged_primary_concerns_enc, new.myths_acknowledged,
         new.onboarding_completed_at, new.last_check_in_at,
         new.created_at, new.updated_at;
  new.primary_concerns := app.decrypt_text(merged_primary_concerns_enc)::text[];
  return new;
end; $$;

create or replace function public.act_program_state_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_program_state_data set
    active_principles       = coalesce(new.active_principles, array[]::text[]),
    primary_concerns_enc    = app.encrypt_text(coalesce(new.primary_concerns, array[]::text[])::text),
    myths_acknowledged      = new.myths_acknowledged,
    onboarding_completed_at = new.onboarding_completed_at,
    last_check_in_at        = new.last_check_in_at,
    created_at              = new.created_at,
    updated_at              = timezone('utc', now())
   where user_id = old.user_id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;

-- Re-attached to the rebuilt view: a trigger belongs to its view and went with
-- the drop above.
create trigger act_program_state_ins instead of insert on public.act_program_state
  for each row execute function public.act_program_state_ins();
create trigger act_program_state_upd instead of update on public.act_program_state
  for each row execute function public.act_program_state_upd();
create trigger act_program_state_del instead of delete on public.act_program_state
  for each row execute function public.act_program_state_del();

-- The rebuilt view is a new object with no inherited ACL, so 20260635's grant
-- is re-issued here. Without it the view is unreadable by `authenticated` on
-- any database built from migrations alone.
grant select, insert, update, delete on public.act_program_state to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- export_user_data - redeclared from 20260918000000 minus preferred_check_in_time
-- ═══════════════════════════════════════════════════════════════════════════════
-- ☠️ Redeclarations are last-writer-wins over the whole body, so this copies the
-- newest declaration WHOLESALE rather than patching it - two in-flight
-- migrations once silently dropped each other's columns (#429). Checked on the
-- way in: 20260918000000 is the newest declaration as of 2026-09-16, and the
-- body below differs from it by exactly one line, the `preferred_check_in_time`
-- entry in the `actProgramState` projection.
--
-- This is the one shape the monotonic gate is built to refuse: a later
-- declaration may ADD columns and may not LOSE them. Losing one is legitimate
-- only when the column itself is gone, so the drop above is paired with an
-- entry in `INTENTIONALLY_DROPPED` in `test/export-user-data-monotonic.test.ts`
-- - which is where the reason lives for whoever meets that failure instead of
-- this file.

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
          age_floor_met,
          age_attested_country,
          age_attested_at,
          account_origin,
          health_data_consent_at,
          cookie_consent,
          language,
          email_verified,
          initial_concerns,
          active_strategies,
          starter_routine_offered,
          theme,
          notifications_enabled_global,
          ambient_sound_id,
          ambient_volume,
          breath_sound_id,
          breath_volume,
          breathing_cycles,
          last_breathing_pattern_id,
          meditation_interval_bell_minutes,
          bell_volume,
          meditation_bell_at_half,
          meditation_ambient_sound_id,
          meditation_ambient_volume,
          haptic_cues,
          emotions_seeded,
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
          dbt_program_started_at,
          dbt_program_phase_index,
          dbt_program_phase_started_at,
          dbt_program_completed_at,
          dbt_program_prompt_dismissed_at,
          dbt_graduation_dismissed_at,
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
          belief_after,
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
          updated_at,
          value_key
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
          self_criticism_noticed,
          self_compassion_note,
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
    ),
    'favorites', (
      select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      from (
        select
          id, kind, key, created_at
        from public.favorites
        where user_id = uid
        order by created_at asc, kind asc, key asc
      ) f
    )
  );

  -- === DBT module (#1980): seven tables, read through the decrypting views ===
  result := result || jsonb_build_object(
    'dbtCopingPlans', (
      select coalesce(jsonb_agg(to_jsonb(cp)), '[]'::jsonb)
      from (
        select id, plan, created_at, updated_at
        from public.dbt_coping_plans
        where user_id = uid
        order by created_at asc
      ) cp
    ),
    'dbtSessions', (
      select coalesce(jsonb_agg(to_jsonb(ds)), '[]'::jsonb)
      from (
        select id, session_slug, variant, duration_seconds, completed_at,
          completed_offset_minutes, created_at, updated_at
        from public.dbt_sessions
        where user_id = uid
        order by completed_at asc
      ) ds
    ),
    'dbtWiseMindCheckins', (
      select coalesce(jsonb_agg(to_jsonb(wm)), '[]'::jsonb)
      from (
        select id, question, emotion_mind, reason, wise_mind, created_at,
          created_offset_minutes, updated_at
        from public.dbt_wise_mind_checkins
        where user_id = uid
        order by created_at asc
      ) wm
    ),
    'dbtJudgements', (
      select coalesce(jsonb_agg(to_jsonb(dj)), '[]'::jsonb)
      from (
        select id, judgement, restatement, valence, created_at,
          created_offset_minutes, updated_at
        from public.dbt_judgements
        where user_id = uid
        order by created_at asc
      ) dj
    ),
    'dbtEmotionRecords', (
      select coalesce(jsonb_agg(to_jsonb(er)), '[]'::jsonb)
      from (
        select id, what_happened, meaning, body_sensations, urges, did_and_said,
          afterwards, primary_emotions, secondary_emotions, created_at,
          created_offset_minutes, updated_at
        from public.dbt_emotion_records
        where user_id = uid
        order by created_at asc
      ) er
    ),
    'dbtOppositeActionPlans', (
      select coalesce(jsonb_agg(to_jsonb(oa)), '[]'::jsonb)
      from (
        select id, emotion, pull, opposite_action, hold_for, what_shifted, created_at,
          created_offset_minutes, done_at, done_offset_minutes, updated_at
        from public.dbt_opposite_action_plans
        where user_id = uid
        order by created_at asc
      ) oa
    ),
    'dbtScripts', (
      select coalesce(jsonb_agg(to_jsonb(sc)), '[]'::jsonb)
      from (
        select id, situation, want_changed, i_think, emotion, i_feel, i_want, self_care,
          difficulty, when_where, how_it_went, created_at, created_offset_minutes,
          done_at, done_offset_minutes, updated_at
        from public.dbt_scripts
        where user_id = uid
        order by created_at asc
      ) sc
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
      habits_reminder_minute, habits_reminder_timezone,
      dbt_reminders_enabled, dbt_reminder_hour,
      dbt_reminder_minute, dbt_reminder_timezone,
      general_reminders_enabled, general_reminder_hour,
      general_reminder_minute, general_reminder_timezone
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

-- Carried with the declaration, exactly as every prior one carries it. `create
-- or replace function` preserves the existing ACL, so these are a no-op on an
-- already-deployed database - but they are what makes the function's grants
-- correct on a database built from migrations alone. Dropping them here would
-- leave `export_user_data` executable by `anon` on a fresh build.
revoke execute on function public.export_user_data() from public, anon;
grant execute on function public.export_user_data() to authenticated;

-- PostgREST caches the schema, and this migration REMOVES a column the cache
-- still lists. Without the reload a shipped client's write of
-- `preferred_check_in_time` would pass PostgREST's stale cache and die inside
-- the view's trigger against a column that no longer exists; the reload is what
-- turns that into a clean "column not found" at the edge instead.
notify pgrst, 'reload schema';

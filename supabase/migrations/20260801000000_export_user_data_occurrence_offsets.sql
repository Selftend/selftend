-- Put the activity occurrence offsets back into the GDPR export (#330, #429).
--
-- Both #423 and #424 redeclared the whole of `export_user_data`, as
-- supabase/README.md "Modifying export_user_data" requires, and each was copied
-- from what was newest when it was written - `20260730_mindfulness`. So one
-- declaration carried `thought_records.created_offset_minutes` and the other
-- carried `activity_logs.completed_offset_minutes` / `scheduled_offset_minutes`,
-- and neither carried both.
--
-- The last one to apply wins outright. Filename order decides that, and when
-- this was written the thought-record migration was still named
-- `20260731_thought_records_occurrence_offset.sql`, so
-- `20260731120000_activity_occurrence_offsets.sql` sorted BEFORE it - every digit
-- sorts before the `_` of the short form, so the timestamped name that fixed the
-- version collision also moved activities earlier. The thought-record
-- declaration therefore landed last and the two activity columns fell straight
-- back out of the export. (#432 has since renamed the short form to
-- `20260731130000_...`; the relative order of the two is unchanged, so this
-- file is still the one that has to carry the union.)
--
-- Measured on a database with both applied in filename order: the resulting
-- function matched `created_offset_minutes`, did NOT match
-- `scheduled_offset_minutes`, and matched `completed_offset_minutes` twice
-- (mindfulness and meditation) instead of three times. So this is live on dev,
-- not hypothetical - a user exporting their data gets activity rows with no way
-- to reconstruct which civil day either the completion or the plan belonged to.
--
-- This file is the union: the thought-record declaration with the two
-- activityLogs lines added, and nothing else changed. It must stay LAST of the
-- `export_user_data` redeclarations, which is what its later day buys it.
--
-- Nothing asserts export completeness column-by-column, which is why neither PR's
-- CI noticed. #429 tracks the gate; until it exists, every migration that touches
-- this function has to be diffed against the newest declaration on `dev` by hand.

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
        select email, created_at, updated_at
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
          selected_concerns,
          active_strategies,
          reminder_prompted_tools,
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
          created_at
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
          completed_at,
          created_at,
          completed_offset_minutes
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
          created_at,
          updated_at
        from public.journal_entries
        where user_id = uid
        order by created_at asc
      ) je
    ),
    'sleepLogs', (
      select coalesce(json_agg(row_to_json(sl)), '[]'::json)
      from (
        select
          id,
          duration_minutes,
          quality,
          notes,
          logged_at,
          created_at,
          updated_at
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
          updated_at
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

notify pgrst, 'reload schema';

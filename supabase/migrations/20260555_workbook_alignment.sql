-- Re-versioned from 20260524_workbook_alignment.sql, which never applied because
-- it collided with 20260524_thought_records_multiple_nats (same version prefix).
-- This applies the values/activities schema changes AND re-declares
-- export_user_data() to match (personal_values/priority_values + pace_category),
-- since this migration drops the values_profile columns the old export selected.

-- === Values: replace domain-matrix model with personal-values jsonb ===

-- 1. Remove all existing domain rows (no cross-model backfill possible)
DELETE FROM public.values_profile;

-- 2. Drop domain-specific columns
ALTER TABLE public.values_profile
  DROP COLUMN IF EXISTS life_domain,
  DROP COLUMN IF EXISTS importance_rating,
  DROP COLUMN IF EXISTS satisfaction_rating,
  DROP COLUMN IF EXISTS domain_note;

-- 3. Add personal_values column
ALTER TABLE public.values_profile
  ADD COLUMN IF NOT EXISTS personal_values jsonb NOT NULL DEFAULT '[]';

-- 4. Switch from composite key (user_id, life_domain) to single-row per user
ALTER TABLE public.values_profile
  DROP CONSTRAINT IF EXISTS values_profile_user_id_life_domain_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'values_profile_user_id_key'
      AND conrelid = 'public.values_profile'::regclass
  ) THEN
    ALTER TABLE public.values_profile
      ADD CONSTRAINT values_profile_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- === Activities: add PACE category ===

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS pace_category text
    CHECK (pace_category IN ('physical', 'achievement', 'connection', 'enjoyment'));

-- === Reconcile export_user_data() with the new values_profile / activity_logs schema ===

CREATE OR REPLACE FUNCTION public.export_user_data()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  result json;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select json_build_object(
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
          updated_at
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
          updated_at
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
          created_at
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
  ) into result;

  return result;
end;
$function$;

grant execute on function public.export_user_data() to authenticated;

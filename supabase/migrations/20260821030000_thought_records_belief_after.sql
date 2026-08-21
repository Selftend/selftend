-- Rate the same belief twice: a record-level `belief_after` (#1376).
--
-- A thought record can only tell someone what writing it down did if it rates
-- the same belief twice. Today it rates it ONCE: `beliefRating` lives inside
-- each negative automatic thought, and nothing re-rates the hot thought at the
-- end. So "you believed it 85%, now 40%" has no data behind it at all.
--
-- PLAINTEXT AND RECORD-LEVEL, and both halves are the point. The existing
-- rating sits inside `nats_enc`, which is encrypted jsonb: a second rating in
-- there would round-trip fine for one record and remain invisible to SQL, so no
-- aggregate over it could ever be computed. This column exists to be averaged.
-- It holds a 0-100 self-report about a thought the user chose to write down -
-- the same shape as `emotion_intensity_before`/`_after`, which are already
-- plaintext for the same reason - and it carries no thought text, so the
-- narrative content stays encrypted exactly as before.
--
-- NULLABLE, NO DEFAULT, NO BACKFILL. Every record written before this migration
-- is null, and so is every record whose author left the rating untouched -
-- nothing in the thought record form is required, deliberately, so that legacy
-- records with blank fields stay saveable, and this field is not the first
-- exception. Null means "not rated", which is emphatically not 0: 0 is "I no
-- longer believe this at all", the best outcome a record can have. Anything
-- reading this column has to keep those apart.
--
-- The check is satisfied by null, so it constrains real values without blocking
-- "unrated", and it matches the range `emotion_intensity_before` has carried
-- since 20260519.
alter table public.thought_records_data
  add column if not exists belief_after integer
    check (belief_after between 0 and 100);

-- The view is the client's only handle on this table - PostgREST cannot see a
-- column the view omits - so it is recreated re-listing EVERY column, not just
-- the new one. Copied from 20260731130000, which is the newest declaration, with
-- the single column appended.
create or replace view public.thought_records with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(situation_enc)                as situation,
         emotions,
         distortions,
         app.decrypt_text(balanced_thought_enc)         as balanced_thought,
         archived_at,
         created_at,
         updated_at,
         emotion_intensity_before,
         app.decrypt_text(evidence_for_enc)::text[]     as evidence_for,
         app.decrypt_text(evidence_against_enc)::text[] as evidence_against,
         emotion_intensity_after,
         app.decrypt_text(outcome_notes_enc)            as outcome_notes,
         app.decrypt_text(nats_enc)::jsonb              as nats,
         created_offset_minutes,
         belief_after
    from public.thought_records_data;

-- The view is not updatable on its own, so BOTH `INSTEAD OF` writers have to
-- learn the column or it is silently dropped on the way in - an insert would
-- succeed, return the row, and store null. Both are copied from 20260731130000
-- with one line added each; the 4000-character caps live here because 20260592
-- dropped the CHECK constraints along with the plaintext.
--
-- No `coalesce`: null is a real value here ("not rated") and must reach the
-- column as null rather than be turned into a number nobody chose.
create or replace function public.thought_records_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.situation) > 4000 then
    raise exception 'thought record situation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.balanced_thought) > 4000 then
    raise exception 'thought record balanced_thought exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.outcome_notes) > 4000 then
    raise exception 'thought record outcome_notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.thought_records_data (
    id, user_id, situation_enc, emotions, distortions, balanced_thought_enc,
    archived_at, emotion_intensity_before, evidence_for_enc, evidence_against_enc,
    emotion_intensity_after, outcome_notes_enc, nats_enc, created_at, updated_at,
    created_offset_minutes, belief_after)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.situation, '')),
    coalesce(new.emotions, array[]::text[]),
    coalesce(new.distortions, array[]::text[]),
    app.encrypt_text(coalesce(new.balanced_thought, '')),
    new.archived_at,
    new.emotion_intensity_before,
    app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    new.emotion_intensity_after,
    app.encrypt_text(coalesce(new.outcome_notes, '')),
    app.encrypt_text(coalesce(new.nats, '[]'::jsonb)::text),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())),
    -- No `coalesce(..., 0)` (20260726:81-84): a client that omits the column
    -- records "unknown", not an assertion that it was standing at UTC.
    new.created_offset_minutes,
    new.belief_after)
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;

-- Kept in step with the INSERT writer. Assigning NEW unconditionally is what
-- lets an edit CLEAR the rating back to null as well as set it; an UPDATE that
-- does not mention the column carries the stored value through NEW unchanged,
-- so archiving a record or editing its text leaves the rating alone.
create or replace function public.thought_records_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.situation) > 4000 then
    raise exception 'thought record situation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.balanced_thought) > 4000 then
    raise exception 'thought record balanced_thought exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.outcome_notes) > 4000 then
    raise exception 'thought record outcome_notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.thought_records_data set
    situation_enc            = app.encrypt_text(coalesce(new.situation, '')),
    emotions                 = coalesce(new.emotions, array[]::text[]),
    distortions              = coalesce(new.distortions, array[]::text[]),
    balanced_thought_enc     = app.encrypt_text(coalesce(new.balanced_thought, '')),
    archived_at              = new.archived_at,
    emotion_intensity_before = new.emotion_intensity_before,
    evidence_for_enc         = app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    evidence_against_enc     = app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    emotion_intensity_after  = new.emotion_intensity_after,
    outcome_notes_enc        = app.encrypt_text(coalesce(new.outcome_notes, '')),
    nats_enc                 = app.encrypt_text(coalesce(new.nats, '[]'::jsonb)::text),
    created_at               = new.created_at,
    created_offset_minutes   = new.created_offset_minutes,
    belief_after             = new.belief_after
   where id = old.id   -- set_thought_records_updated_at BEFORE-UPDATE trigger refreshes updated_at
   -- ...which is why the fresh timestamps have to be read back out (20260662):
   -- the trigger stamps `updated_at` on the _data row, but NEW still carries the
   -- pre-edit value, and NEW is what PostgREST returns to `.update().select()`.
   -- Dropping this clause would make an edited record report its old
   -- `updated_at` until a separate fetch landed - and the history list sorts and
   -- labels by `updated_at`, so that is user-visible.
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;

-- ── export_user_data: carry the belief rating into the GDPR export ───────────
--
-- The whole flat function is redeclared here, per supabase/README.md "Modifying
-- export_user_data". The thoughtRecords projection enumerates columns
-- explicitly, so a new column is absent from the export until it is named -
-- and test/export-user-data-monotonic.test.ts fails on a declaration that loses
-- one.
--
-- Copied from 20260821020000_goal_value_key.sql, which is the newest
-- declaration, NOT from any older one. Several migrations redeclare this whole
-- function and each runs in filename order, so starting from an older copy would
-- silently drop the columns added since back out of the export. The only
-- difference from 20260821020000 is the one line added to the thoughtRecords
-- projection.

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
          meditation_interval_bell_minutes,
          bell_volume,
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

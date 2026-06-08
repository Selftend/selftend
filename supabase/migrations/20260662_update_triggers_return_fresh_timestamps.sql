-- Migration: 20260662_update_triggers_return_fresh_timestamps
-- Fix: INSTEAD OF UPDATE trigger functions returned NEW with pre-update updated_at.
-- Each function now captures the freshly-persisted timestamps from the inner UPDATE
-- via RETURNING … INTO new.updated_at, new.created_at so PostgREST .update().select()
-- reports the actual persisted value.
--
-- SKIPPED (no updated_at column on _data table):
--   exposure_sessions, mindfulness_sessions, mood_logs


-- ── Group A: functions that set updated_at = timezone('utc', now()) themselves ──

create or replace function public.act_action_steps_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_action_steps_data set
    action_id       = new.action_id,
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    is_completed    = new.is_completed,
    completed_at    = new.completed_at,
    created_at      = new.created_at,
    updated_at      = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_choice_points_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_choice_points_data set
    hooks_enc        = app.encrypt_text(coalesce(new.hooks, array[]::text[])::text),
    away_moves_enc   = app.encrypt_text(coalesce(new.away_moves, array[]::text[])::text),
    toward_moves_enc = app.encrypt_text(coalesce(new.toward_moves, array[]::text[])::text),
    notes_enc        = app.encrypt_text(coalesce(new.notes, '')),
    created_at       = new.created_at,
    updated_at       = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_committed_actions_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_committed_actions_data set
    life_domain     = new.life_domain,
    title_enc       = app.encrypt_text(coalesce(new.title, '')),
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    status          = new.status,
    target_date     = new.target_date,
    obstacles_enc   = app.encrypt_text(coalesce(new.obstacles, '')),
    created_at      = new.created_at,
    updated_at      = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_connection_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_connection_logs_data set
    technique               = new.technique,
    activity_context_enc    = app.encrypt_text(coalesce(new.activity_context, '')),
    notices_from_senses_enc = app.encrypt_text(coalesce(new.notices_from_senses, '')),
    duration_minutes        = new.duration_minutes,
    mood_after              = new.mood_after,
    notes_enc               = app.encrypt_text(coalesce(new.notes, '')),
    created_at              = new.created_at,
    updated_at              = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_defusion_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_defusion_logs_data set
    fused_thought_enc   = app.encrypt_text(coalesce(new.fused_thought, '')),
    thought_category    = new.thought_category,
    fusion_level_before = new.fusion_level_before,
    technique_used      = new.technique_used,
    defused_version_enc = app.encrypt_text(coalesce(new.defused_version, '')),
    fusion_level_after  = new.fusion_level_after,
    notes_enc           = app.encrypt_text(coalesce(new.notes, '')),
    created_at          = new.created_at,
    updated_at          = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_expansion_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_expansion_logs_data set
    emotion_enc        = app.encrypt_text(coalesce(new.emotion, '')),
    body_sensation_enc = app.encrypt_text(coalesce(new.body_sensation, '')),
    intensity_before   = new.intensity_before,
    struggle_switch_on = new.struggle_switch_on,
    discomfort_type    = new.discomfort_type,
    technique_used     = new.technique_used,
    intensity_after    = new.intensity_after,
    notes_enc          = app.encrypt_text(coalesce(new.notes, '')),
    created_at         = new.created_at,
    updated_at         = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_observing_self_sessions_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_observing_self_sessions_data set
    technique_used        = new.technique_used,
    what_was_observed_enc = app.encrypt_text(coalesce(new.what_was_observed, '')),
    duration_minutes      = new.duration_minutes,
    mood_after            = new.mood_after,
    notes_enc             = app.encrypt_text(coalesce(new.notes, '')),
    created_at            = new.created_at,
    updated_at            = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


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
    preferred_check_in_time = new.preferred_check_in_time,
    created_at              = new.created_at,
    updated_at              = timezone('utc', now())
   where user_id = old.user_id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_urge_surf_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_urge_surf_logs_data set
    urge_description_enc = app.encrypt_text(coalesce(new.urge_description, '')),
    trigger_enc          = app.encrypt_text(coalesce(new.trigger, '')),
    peak_intensity       = new.peak_intensity,
    surfing_notes_enc    = app.encrypt_text(coalesce(new.surfing_notes, '')),
    urge_acted_on        = new.urge_acted_on,
    completed_at         = new.completed_at,
    created_at           = new.created_at,
    updated_at           = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.act_value_entries_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.act_value_entries_data set
    life_domain              = new.life_domain,
    value_statement_enc      = app.encrypt_text(coalesce(new.value_statement, '')),
    importance_rating        = new.importance_rating,
    current_alignment_rating = new.current_alignment_rating,
    current_actions_note_enc = app.encrypt_text(coalesce(new.current_actions_note, '')),
    desired_actions_note_enc = app.encrypt_text(coalesce(new.desired_actions_note, '')),
    barriers_enc             = app.encrypt_text(coalesce(new.barriers, '')),
    created_at               = new.created_at,
    updated_at               = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.stage_practice_notes_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  -- No BEFORE-UPDATE updated_at trigger on this table, so refresh updated_at here.
  update public.stage_practice_notes_data set
    stage      = new.stage,
    note_enc   = app.encrypt_text(coalesce(new.note, '')),
    created_at = new.created_at,
    updated_at = timezone('utc', now())
   where id = old.id
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


-- ── Group B: functions that rely on a set_<table>_updated_at BEFORE-UPDATE trigger ──
-- The BEFORE trigger fires first and writes updated_at on the _data row before
-- the inner UPDATE executes, so RETURNING captures the freshly-advanced value.

create or replace function public.activity_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.activity_name) > 300 then
    raise exception 'activity_logs activity_name exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.notes) > 2000 then
    raise exception 'activity_logs notes exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.activity_logs_data set
    activity_name_enc = app.encrypt_text(coalesce(new.activity_name, '')),
    category          = new.category,
    scheduled_at      = new.scheduled_at,
    completed_at      = new.completed_at,
    mood_before       = new.mood_before,
    mood_after        = new.mood_after,
    notes_enc         = app.encrypt_text(coalesce(new.notes, '')),
    pace_category     = new.pace_category,
    created_at        = new.created_at
   where id = old.id   -- set_activity_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.anger_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.trigger_text) > 4000 then
    raise exception 'anger log trigger_text exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.interpretation) > 4000 then
    raise exception 'anger log interpretation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.alternative_interpretation) > 4000 then
    raise exception 'anger log alternative_interpretation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.notes) > 4000 then
    raise exception 'anger log notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.anger_logs_data set
    trigger_text_enc               = app.encrypt_text(coalesce(new.trigger_text, '')),
    interpretation_enc             = app.encrypt_text(coalesce(new.interpretation, '')),
    arousal_level                  = new.arousal_level,
    urge_enc                       = app.encrypt_text(coalesce(new.urge, '')),
    behavior_chosen_enc            = app.encrypt_text(coalesce(new.behavior_chosen, '')),
    consequence_enc                = app.encrypt_text(coalesce(new.consequence, '')),
    time_out_taken                 = new.time_out_taken,
    alternative_interpretation_enc = app.encrypt_text(coalesce(new.alternative_interpretation, '')),
    outcome_rating                 = new.outcome_rating,
    notes_enc                      = app.encrypt_text(coalesce(new.notes, '')),
    created_at                     = new.created_at
   where id = old.id   -- set_anger_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.breathing_exercises_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  perform public.breathing_exercises_guard(new.name);
  update public.breathing_exercises_data set
    name_enc         = app.encrypt_text(new.name),
    inhale_seconds   = new.inhale_seconds,
    hold_in_seconds  = new.hold_in_seconds,
    exhale_seconds   = new.exhale_seconds,
    hold_out_seconds = new.hold_out_seconds,
    cycles           = new.cycles,
    color            = new.color,
    created_at       = new.created_at
   where id = old.id   -- set_breathing_exercises_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.challenge_plans_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.challenge_plans_data set
    recovery_plan_id          = new.recovery_plan_id,
    challenge_description_enc  = app.encrypt_text(coalesce(new.challenge_description, '')),
    coping_steps_enc          = app.encrypt_text(coalesce(new.coping_steps, array[]::text[])::text),
    created_at                = new.created_at
   where id = old.id   -- set_challenge_plans_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.core_beliefs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.belief_statement) > 4000 then
    raise exception 'core belief belief_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.alternative_belief) > 4000 then
    raise exception 'core belief alternative_belief exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.reinforcement_plan) > 4000 then
    raise exception 'core belief reinforcement_plan exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.core_beliefs_data set
    belief_statement_enc        = app.encrypt_text(coalesce(new.belief_statement, '')),
    triggering_situations_enc   = app.encrypt_text(coalesce(new.triggering_situations, array[]::text[])::text),
    evidence_for_enc            = app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    evidence_against_enc        = app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    alternative_belief_enc      = app.encrypt_text(coalesce(new.alternative_belief, '')),
    original_belief_strength    = new.original_belief_strength,
    alternative_belief_strength = new.alternative_belief_strength,
    reinforcement_plan_enc      = app.encrypt_text(coalesce(new.reinforcement_plan, '')),
    next_review_date            = new.next_review_date,
    created_at                  = new.created_at
   where id = old.id   -- set_core_beliefs_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.emotion_preferences_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.emotion_preferences_data set
    emotion_id = new.emotion_id,
    name_enc   = app.encrypt_text(new.name),  -- NULL name -> NULL ciphertext (round-trips)
    emoji      = new.emoji,
    position   = new.position,
    removed    = new.removed,
    is_custom  = new.is_custom,
    created_at = new.created_at
   where id = old.id   -- set_emotion_preferences_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.exposure_hierarchies_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.title) > 300 then
    raise exception 'exposure hierarchy title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  update public.exposure_hierarchies_data set
    title_enc        = app.encrypt_text(coalesce(new.title, '')),
    anxiety_type_enc = app.encrypt_text(coalesce(new.anxiety_type, '')),
    created_at       = new.created_at
   where id = old.id   -- set_exposure_hierarchies_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.exposure_items_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.description) > 2000 then
    raise exception 'exposure item description exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.exposure_items_data set
    hierarchy_id    = new.hierarchy_id,
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    suds_rating     = new.suds_rating,
    completed_at    = new.completed_at,
    created_at      = new.created_at
   where id = old.id   -- set_exposure_items_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.goals_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.title) > 300 then
    raise exception 'goals title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.description) > 4000 then
    raise exception 'goals description exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.goals_data set
    title_enc       = app.encrypt_text(coalesce(new.title, '')),
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    life_domain     = new.life_domain,
    goal_type       = new.goal_type,
    target_date     = new.target_date,
    status          = new.status,
    created_at      = new.created_at
   where id = old.id   -- set_goals_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.gratitude_entries_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  perform public.gratitude_entries_guard(
    new.item_1, new.item_2, new.item_3, new.item_4, new.item_5,
    new.good_moment, new.miss_if_gone, new.hidden_good,
    new.life_item_1, new.life_item_2, new.life_item_3, new.note, new.events);
  update public.gratitude_entries_data set
    item_1_enc       = app.encrypt_text(new.item_1),  -- NO coalesce: NULL slot stays NULL
    item_2_enc       = app.encrypt_text(new.item_2),
    item_3_enc       = app.encrypt_text(new.item_3),
    item_4_enc       = app.encrypt_text(new.item_4),
    item_5_enc       = app.encrypt_text(new.item_5),
    events_enc       = app.encrypt_text(new.events::text),
    good_moment_enc  = app.encrypt_text(new.good_moment),
    miss_if_gone_enc = app.encrypt_text(new.miss_if_gone),
    hidden_good_enc  = app.encrypt_text(new.hidden_good),
    life_item_1_enc  = app.encrypt_text(new.life_item_1),
    life_item_2_enc  = app.encrypt_text(new.life_item_2),
    life_item_3_enc  = app.encrypt_text(new.life_item_3),
    note_enc         = app.encrypt_text(new.note),
    logged_at        = new.logged_at,
    level            = new.level,
    starred          = new.starred,
    created_at       = new.created_at
   where id = old.id   -- set_gratitude_entries_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.habit_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.note) > 500 then
    raise exception 'habit log note exceeds 500 characters' using errcode = 'check_violation';
  end if;
  update public.habit_logs_data set
    habit_id   = new.habit_id,
    logged_on  = new.logged_on,
    note_enc   = app.encrypt_text(coalesce(new.note, '')),
    created_at = new.created_at
   where id = old.id   -- set_habit_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.habits_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  perform public.habits_guard(new.name, new.identity, new.cue_plan, new.stack_after,
                              new.craving_pairing, new.two_minute_version, new.reward_note);
  update public.habits_data set
    name_enc               = app.encrypt_text(new.name),
    kind                   = new.kind,
    identity_enc           = app.encrypt_text(coalesce(new.identity, '')),
    cue_plan_enc           = app.encrypt_text(coalesce(new.cue_plan, '')),
    stack_after_enc        = app.encrypt_text(coalesce(new.stack_after, '')),
    craving_pairing_enc    = app.encrypt_text(coalesce(new.craving_pairing, '')),
    two_minute_version_enc = app.encrypt_text(coalesce(new.two_minute_version, '')),
    reward_note_enc        = app.encrypt_text(coalesce(new.reward_note, '')),
    cadence                = new.cadence,
    custom_days            = coalesce(new.custom_days, array[]::smallint[]),
    color                  = new.color,
    archived_at            = new.archived_at,
    created_at             = new.created_at
   where id = old.id   -- set_habits_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.journal_entries_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.body is null or length(btrim(new.body)) = 0 then
    raise exception 'journal entry body must not be blank'
      using errcode = 'check_violation';
  end if;
  if char_length(new.title) > 300 then
    raise exception 'journal entry title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.body) > 20000 then
    raise exception 'journal entry body exceeds 20000 characters' using errcode = 'check_violation';
  end if;
  update public.journal_entries_data
     set title_enc  = app.encrypt_text(new.title),
         body_enc   = app.encrypt_text(new.body),
         created_at = new.created_at
   where id = old.id   -- set_journal_entries_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.milestones_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.milestones_data set
    goal_id         = new.goal_id,
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    target_date     = new.target_date,
    completed_at    = new.completed_at,
    created_at      = new.created_at
   where id = old.id   -- set_milestones_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.procrastination_tasks_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.task_description) > 2000 then
    raise exception 'procrastination task task_description exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.fear_thought) > 2000 then
    raise exception 'procrastination task fear_thought exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.challenged_thought) > 2000 then
    raise exception 'procrastination task challenged_thought exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.procrastination_tasks_data set
    task_description_enc   = app.encrypt_text(coalesce(new.task_description, '')),
    avoidance_reason_enc   = app.encrypt_text(coalesce(new.avoidance_reason, '')),
    fear_thought_enc       = app.encrypt_text(coalesce(new.fear_thought, '')),
    challenged_thought_enc = app.encrypt_text(coalesce(new.challenged_thought, '')),
    deadline               = new.deadline,
    reward_enc             = app.encrypt_text(coalesce(new.reward, '')),
    status                 = new.status,
    created_at             = new.created_at
   where id = old.id   -- set_procrastination_tasks_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.recovery_plans_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.personal_slogan) > 500 then
    raise exception 'recovery plan personal_slogan exceeds 500 characters' using errcode = 'check_violation';
  end if;
  update public.recovery_plans_data set
    recovery_keys_enc              = app.encrypt_text(coalesce(new.recovery_keys, array[]::text[])::text),
    personal_slogan_enc            = app.encrypt_text(coalesce(new.personal_slogan, '')),
    strategy_integration_notes_enc = app.encrypt_text(coalesce(new.strategy_integration_notes, '{}'::jsonb)::text),
    maintenance_commitments_enc    = app.encrypt_text(coalesce(new.maintenance_commitments, array[]::text[])::text),
    created_at                     = new.created_at
   where id = old.id   -- set_recovery_plans_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.self_care_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.social_notes) > 2000 then
    raise exception 'self_care_logs social_notes exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.self_care_logs_data set
    log_date                = new.log_date,
    exercise_done           = new.exercise_done,
    exercise_minutes        = new.exercise_minutes,
    exercise_type_enc       = app.encrypt_text(coalesce(new.exercise_type, '')),
    meals_structured        = new.meals_structured,
    emotional_eating        = new.emotional_eating,
    social_connection_made  = new.social_connection_made,
    social_notes_enc        = app.encrypt_text(coalesce(new.social_notes, '')),
    meaningful_activity_enc = app.encrypt_text(coalesce(new.meaningful_activity, '')),
    created_at              = new.created_at
   where id = old.id   -- set_self_care_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.sleep_logs_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.sleep_logs_data set
    duration_minutes = new.duration_minutes,
    quality          = new.quality,
    notes_enc        = app.encrypt_text(coalesce(new.notes, '')),
    logged_at        = new.logged_at,
    created_at       = new.created_at
   where id = old.id   -- set_sleep_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.task_steps_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.task_steps_data set
    task_id           = new.task_id,
    description_enc   = app.encrypt_text(coalesce(new.description, '')),
    estimated_minutes = new.estimated_minutes,
    completed_at      = new.completed_at,
    created_at        = new.created_at
   where id = old.id   -- set_task_steps_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.thought_records_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
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
    created_at               = new.created_at
   where id = old.id   -- set_thought_records_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.values_profile_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  update public.values_profile_data set
    personal_values_enc = app.encrypt_text(coalesce(new.personal_values, '[]'::jsonb)::text),
    priority_values_enc = app.encrypt_text(coalesce(new.priority_values, '[]'::jsonb)::text),
    created_at          = new.created_at
   where id = old.id   -- set_values_profile_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


create or replace function public.worry_entries_upd()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
as $function$
begin
  if char_length(new.worry_statement) > 4000 then
    raise exception 'worry entry worry_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.coping_statement) > 4000 then
    raise exception 'worry entry coping_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.worry_entries_data set
    worry_statement_enc  = app.encrypt_text(coalesce(new.worry_statement, '')),
    worry_category       = new.worry_category,
    probability_estimate = new.probability_estimate,
    evidence_for_enc     = app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    evidence_against_enc = app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    coping_statement_enc = app.encrypt_text(coalesce(new.coping_statement, '')),
    action_steps_enc     = app.encrypt_text(coalesce(new.action_steps, array[]::text[])::text),
    resolved             = new.resolved,
    created_at           = new.created_at
   where id = old.id   -- set_worry_entries_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $function$;


notify pgrst, 'reload schema';

-- ============================================================================
-- Full-audit (2026-06-10) — #63: RLS auth.uid() -> (select auth.uid()) initplan.
--
-- Every user-scoped RLS policy was written as `auth.uid() = user_id`. Supabase
-- perf lint 0003 (auth_rls_initplan): a bare STABLE function call in a policy qual
-- is re-executed once PER ROW SCANNED, whereas wrapping it in a scalar sub-select
-- lets the planner evaluate it ONCE as an InitPlan and reuse the result. auth.uid()
-- parses the request.jwt.claims GUC on each call, so on the decrypt-on-read views
-- (whose target-list forces all of a user's base rows through the scan) this ran
-- hundreds-to-thousands of times per request. The rewrite is purely a planner hint:
-- (select auth.uid()) returns the identical value, so policy semantics, roles and
-- commands are unchanged. Statements are idempotent (re-applying sets the qual to
-- the same value). Generated from pg_policies on the live schema (120 policies).
--
-- NOT LOCALLY VERIFIED (no local Postgres); validated + applied + advisor-checked
-- against the live project instead.
-- ============================================================================

alter policy "Users can manage their own action steps" on public.act_action_steps_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT bulls eye snapshots" on public.act_bulls_eye_snapshots using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT choice points" on public.act_choice_points_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own committed actions" on public.act_committed_actions_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT connection logs" on public.act_connection_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT defusion logs" on public.act_defusion_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT expansion logs" on public.act_expansion_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT observing self sessions" on public.act_observing_self_sessions_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT program state" on public.act_program_state_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT urge surf logs" on public.act_urge_surf_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own ACT value entries" on public.act_value_entries_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy activity_logs_delete_own on public.activity_logs_data using (((select auth.uid()) = user_id));
alter policy activity_logs_insert_own on public.activity_logs_data with check (((select auth.uid()) = user_id));
alter policy activity_logs_select_own on public.activity_logs_data using (((select auth.uid()) = user_id));
alter policy activity_logs_update_own on public.activity_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy anger_logs_delete_own on public.anger_logs_data using (((select auth.uid()) = user_id));
alter policy anger_logs_insert_own on public.anger_logs_data with check (((select auth.uid()) = user_id));
alter policy anger_logs_select_own on public.anger_logs_data using (((select auth.uid()) = user_id));
alter policy anger_logs_update_own on public.anger_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy breathing_exercises_delete_own on public.breathing_exercises_data using (((select auth.uid()) = user_id));
alter policy breathing_exercises_insert_own on public.breathing_exercises_data with check (((select auth.uid()) = user_id));
alter policy breathing_exercises_select_own on public.breathing_exercises_data using (((select auth.uid()) = user_id));
alter policy breathing_exercises_update_own on public.breathing_exercises_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy challenge_plans_delete_own on public.challenge_plans_data using (((select auth.uid()) = user_id));
alter policy challenge_plans_insert_own on public.challenge_plans_data with check (((select auth.uid()) = user_id));
alter policy challenge_plans_select_own on public.challenge_plans_data using (((select auth.uid()) = user_id));
alter policy challenge_plans_update_own on public.challenge_plans_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy core_beliefs_delete_own on public.core_beliefs_data using (((select auth.uid()) = user_id));
alter policy core_beliefs_insert_own on public.core_beliefs_data with check (((select auth.uid()) = user_id));
alter policy core_beliefs_select_own on public.core_beliefs_data using (((select auth.uid()) = user_id));
alter policy core_beliefs_update_own on public.core_beliefs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy device_push_tokens_delete_own on public.device_push_tokens using (((select auth.uid()) = user_id));
alter policy device_push_tokens_insert_own on public.device_push_tokens with check (((select auth.uid()) = user_id));
alter policy device_push_tokens_select_own on public.device_push_tokens using (((select auth.uid()) = user_id));
alter policy device_push_tokens_update_own on public.device_push_tokens using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users manage their own emotion preferences" on public.emotion_preferences_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy exposure_hierarchies_delete_own on public.exposure_hierarchies_data using (((select auth.uid()) = user_id));
alter policy exposure_hierarchies_insert_own on public.exposure_hierarchies_data with check (((select auth.uid()) = user_id));
alter policy exposure_hierarchies_select_own on public.exposure_hierarchies_data using (((select auth.uid()) = user_id));
alter policy exposure_hierarchies_update_own on public.exposure_hierarchies_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy exposure_items_delete_own on public.exposure_items_data using (((select auth.uid()) = user_id));
alter policy exposure_items_insert_own on public.exposure_items_data with check (((select auth.uid()) = user_id));
alter policy exposure_items_select_own on public.exposure_items_data using (((select auth.uid()) = user_id));
alter policy exposure_items_update_own on public.exposure_items_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy exposure_sessions_insert_own on public.exposure_sessions_data with check (((select auth.uid()) = user_id));
alter policy exposure_sessions_select_own on public.exposure_sessions_data using (((select auth.uid()) = user_id));
alter policy goals_delete_own on public.goals_data using (((select auth.uid()) = user_id));
alter policy goals_insert_own on public.goals_data with check (((select auth.uid()) = user_id));
alter policy goals_select_own on public.goals_data using (((select auth.uid()) = user_id));
alter policy goals_update_own on public.goals_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy gratitude_entries_delete_own on public.gratitude_entries_data using (((select auth.uid()) = user_id));
alter policy gratitude_entries_insert_own on public.gratitude_entries_data with check (((select auth.uid()) = user_id));
alter policy gratitude_entries_select_own on public.gratitude_entries_data using (((select auth.uid()) = user_id));
alter policy gratitude_entries_update_own on public.gratitude_entries_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy habit_logs_delete_own on public.habit_logs_data using (((select auth.uid()) = user_id));
alter policy habit_logs_insert_own on public.habit_logs_data with check (((select auth.uid()) = user_id));
alter policy habit_logs_select_own on public.habit_logs_data using (((select auth.uid()) = user_id));
alter policy habit_logs_update_own on public.habit_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy habits_delete_own on public.habits_data using (((select auth.uid()) = user_id));
alter policy habits_insert_own on public.habits_data with check (((select auth.uid()) = user_id));
alter policy habits_select_own on public.habits_data using (((select auth.uid()) = user_id));
alter policy habits_update_own on public.habits_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy journal_entries_delete_own on public.journal_entries_data using (((select auth.uid()) = user_id));
alter policy journal_entries_insert_own on public.journal_entries_data with check (((select auth.uid()) = user_id));
alter policy journal_entries_select_own on public.journal_entries_data using (((select auth.uid()) = user_id));
alter policy journal_entries_update_own on public.journal_entries_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own meditation program state" on public.meditation_program_state using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own meditation sessions" on public.meditation_sessions using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy milestones_delete_own on public.milestones_data using (((select auth.uid()) = user_id));
alter policy milestones_insert_own on public.milestones_data with check (((select auth.uid()) = user_id));
alter policy milestones_select_own on public.milestones_data using (((select auth.uid()) = user_id));
alter policy milestones_update_own on public.milestones_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy mindfulness_sessions_insert_own on public.mindfulness_sessions_data with check (((select auth.uid()) = user_id));
alter policy mindfulness_sessions_select_own on public.mindfulness_sessions_data using (((select auth.uid()) = user_id));
alter policy mood_logs_delete_own on public.mood_logs_data using (((select auth.uid()) = user_id));
alter policy mood_logs_insert_own on public.mood_logs_data with check (((select auth.uid()) = user_id));
alter policy mood_logs_select_own on public.mood_logs_data using (((select auth.uid()) = user_id));
alter policy mood_logs_update_own on public.mood_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users manage their own plan items" on public.plan_items using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy procrastination_tasks_delete_own on public.procrastination_tasks_data using (((select auth.uid()) = user_id));
alter policy procrastination_tasks_insert_own on public.procrastination_tasks_data with check (((select auth.uid()) = user_id));
alter policy procrastination_tasks_select_own on public.procrastination_tasks_data using (((select auth.uid()) = user_id));
alter policy procrastination_tasks_update_own on public.procrastination_tasks_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy profiles_insert_own on public.profiles_data with check (((select auth.uid()) = user_id));
alter policy profiles_select_own on public.profiles_data using (((select auth.uid()) = user_id));
alter policy profiles_update_own on public.profiles_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy recovery_plans_delete_own on public.recovery_plans_data using (((select auth.uid()) = user_id));
alter policy recovery_plans_insert_own on public.recovery_plans_data with check (((select auth.uid()) = user_id));
alter policy recovery_plans_select_own on public.recovery_plans_data using (((select auth.uid()) = user_id));
alter policy recovery_plans_update_own on public.recovery_plans_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy self_care_logs_insert_own on public.self_care_logs_data with check (((select auth.uid()) = user_id));
alter policy self_care_logs_select_own on public.self_care_logs_data using (((select auth.uid()) = user_id));
alter policy self_care_logs_update_own on public.self_care_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy sleep_logs_delete_own on public.sleep_logs_data using (((select auth.uid()) = user_id));
alter policy sleep_logs_insert_own on public.sleep_logs_data with check (((select auth.uid()) = user_id));
alter policy sleep_logs_select_own on public.sleep_logs_data using (((select auth.uid()) = user_id));
alter policy sleep_logs_update_own on public.sleep_logs_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can manage their own stage practice notes" on public.stage_practice_notes_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy task_steps_delete_own on public.task_steps_data using (((select auth.uid()) = user_id));
alter policy task_steps_insert_own on public.task_steps_data with check (((select auth.uid()) = user_id));
alter policy task_steps_select_own on public.task_steps_data using (((select auth.uid()) = user_id));
alter policy task_steps_update_own on public.task_steps_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy thought_records_insert_own on public.thought_records_data with check (((select auth.uid()) = user_id));
alter policy thought_records_select_own on public.thought_records_data using (((select auth.uid()) = user_id));
alter policy thought_records_update_own on public.thought_records_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy preferences_insert_own on public.user_preferences with check (((select auth.uid()) = user_id));
alter policy preferences_select_own on public.user_preferences using (((select auth.uid()) = user_id));
alter policy preferences_update_own on public.user_preferences using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy values_profile_insert_own on public.values_profile_data with check (((select auth.uid()) = user_id));
alter policy values_profile_select_own on public.values_profile_data using (((select auth.uid()) = user_id));
alter policy values_profile_update_own on public.values_profile_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy web_push_subscriptions_delete_own on public.web_push_subscriptions using (((select auth.uid()) = user_id));
alter policy web_push_subscriptions_insert_own on public.web_push_subscriptions with check (((select auth.uid()) = user_id));
alter policy web_push_subscriptions_select_own on public.web_push_subscriptions using (((select auth.uid()) = user_id));
alter policy web_push_subscriptions_update_own on public.web_push_subscriptions using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users manage their own widget preferences" on public.widget_preferences using (((select auth.uid()) = user_id));
alter policy worry_entries_delete_own on public.worry_entries_data using (((select auth.uid()) = user_id));
alter policy worry_entries_insert_own on public.worry_entries_data with check (((select auth.uid()) = user_id));
alter policy worry_entries_select_own on public.worry_entries_data using (((select auth.uid()) = user_id));
alter policy worry_entries_update_own on public.worry_entries_data using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

notify pgrst, 'reload schema';

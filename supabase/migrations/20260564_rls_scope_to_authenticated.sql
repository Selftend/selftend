-- Defense-in-depth: these FOR ALL policies were created without a TO clause, so they
-- apply to PUBLIC (incl. the anon role) rather than only authenticated users. They are
-- not currently exploitable - `auth.uid() = user_id` is NULL for anon, so the USING check
-- fails - but scoping them to `authenticated` matches intent and the rest of the schema.
-- ALTER POLICY ... TO changes only the role; the USING/WITH CHECK predicates are untouched.

alter policy "Users can manage their own meditation sessions" on public.meditation_sessions to authenticated;
alter policy "Users can manage their own meditation program state" on public.meditation_program_state to authenticated;
alter policy "Users can manage their own stage practice notes" on public.stage_practice_notes to authenticated;
alter policy "Users can manage their own ACT program state" on public.act_program_state to authenticated;
alter policy "Users can manage their own ACT defusion logs" on public.act_defusion_logs to authenticated;
alter policy "Users can manage their own ACT expansion logs" on public.act_expansion_logs to authenticated;
alter policy "Users can manage their own ACT urge surf logs" on public.act_urge_surf_logs to authenticated;
alter policy "Users can manage their own ACT connection logs" on public.act_connection_logs to authenticated;
alter policy "Users can manage their own ACT observing self sessions" on public.act_observing_self_sessions to authenticated;
alter policy "Users can manage their own ACT value entries" on public.act_value_entries to authenticated;
alter policy "Users can manage their own ACT bulls eye snapshots" on public.act_bulls_eye_snapshots to authenticated;
alter policy "Users can manage their own committed actions" on public.act_committed_actions to authenticated;
alter policy "Users can manage their own action steps" on public.act_action_steps to authenticated;
alter policy "Users can manage their own ACT choice points" on public.act_choice_points to authenticated;
alter policy "Users manage their own widget preferences" on public.widget_preferences to authenticated;

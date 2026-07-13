-- Lightweight completion data for Home programme widgets. This returns only task
-- keys and booleans; Home never downloads the user's module histories.
create or replace function public.program_widget_task_status(
  p_module text,
  p_day_start timestamptz,
  p_day_end timestamptz
)
returns table(task_key text, done boolean)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  phase_index integer;
  phase_started_at timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_module not in ('cbt', 'act') then
    raise exception 'Unsupported module';
  end if;
  if p_day_end <= p_day_start or p_day_end > p_day_start + interval '26 hours' then
    raise exception 'Invalid day range';
  end if;

  if p_module = 'cbt' then
    select cbt_program_phase_index,
           coalesce(cbt_program_phase_started_at, cbt_program_started_at)
      into phase_index, phase_started_at
      from public.user_preferences
     where user_id = uid and cbt_program_started_at is not null;

    if not found then return; end if;

    case greatest(0, least(coalesce(phase_index, 0), 4))
      when 0 then
        return query values
          ('dailyNoticing', exists(
            select 1 from public.mood_logs
             where user_id = uid and logged_at >= p_day_start and logged_at < p_day_end
               and (btrim(situation) <> '' or btrim(thoughts) <> '' or
                    btrim(behaviours) <> '' or btrim(bodily_sensations) <> '')
          )),
          ('setGoals', exists(
            select 1 from public.goals where user_id = uid and created_at >= phase_started_at
          )),
          ('clarifyValues', exists(
            select 1 from public.values_profile
             where user_id = uid and updated_at >= phase_started_at
               and jsonb_array_length(coalesce(priority_values, '[]'::jsonb)) > 0
          ));
      when 1 then
        return query values
          ('examineBelief', exists(
            select 1 from public.core_beliefs
             where user_id = uid and created_at >= phase_started_at
          ));
      when 2 then
        return query values
          ('thoughtRecordDaily', exists(
            select 1 from public.thought_records
             where user_id = uid and created_at >= p_day_start and created_at < p_day_end
          )),
          ('thoughtRecordOnce', exists(
            select 1 from public.thought_records
             where user_id = uid and created_at >= phase_started_at
          ));
      when 3 then
        return query values
          ('activityDaily', exists(
            select 1 from public.activity_logs
             where user_id = uid and completed_at >= p_day_start and completed_at < p_day_end
          )),
          ('activityOnce', exists(
            select 1 from public.activity_logs
             where user_id = uid and completed_at >= phase_started_at
          )),
          ('exposureLadder', exists(
            select 1 from public.exposure_hierarchies
             where user_id = uid and created_at >= phase_started_at
          ));
      when 4 then
        return query values
          ('calmingDaily', exists(
            select 1 from public.meditation_sessions
             where user_id = uid and completed_at >= p_day_start and completed_at < p_day_end
          )),
          ('resiliencePlan', exists(
            select 1 from public.recovery_plans
             where user_id = uid and updated_at >= phase_started_at and btrim(personal_slogan) <> ''
          )),
          ('calmingOnce', exists(
            select 1 from public.meditation_sessions
             where user_id = uid and completed_at >= phase_started_at
          ));
    end case;
  else
    select act_program_phase_index,
           coalesce(act_program_phase_started_at, act_program_started_at)
      into phase_index, phase_started_at
      from public.user_preferences
     where user_id = uid and act_program_started_at is not null;

    if not found then return; end if;

    case greatest(0, least(coalesce(phase_index, 0), 3))
      when 0 then
        return query values
          ('dropAnchorDaily', exists(
            select 1 from public.act_connection_logs
             where user_id = uid and technique = 'dropAnchor'
               and created_at >= p_day_start and created_at < p_day_end
          )),
          ('mapChoicePoint', exists(
            select 1 from public.act_choice_points
             where user_id = uid and created_at >= phase_started_at
          ));
      when 1 then
        return query values
          ('bePresentDaily', exists(
            select 1 from public.act_connection_logs
             where user_id = uid and technique <> 'dropAnchor'
               and created_at >= p_day_start and created_at < p_day_end
          )),
          ('observeSelfOnce', exists(
            select 1 from public.act_observing_self_sessions
             where user_id = uid and created_at >= phase_started_at
          ));
      when 2 then
        return query values
          ('unhookOrMakeRoomDaily',
            exists(select 1 from public.act_defusion_logs where user_id = uid and created_at >= p_day_start and created_at < p_day_end)
            or exists(select 1 from public.act_expansion_logs where user_id = uid and created_at >= p_day_start and created_at < p_day_end)
            or exists(select 1 from public.act_urge_surf_logs where user_id = uid and created_at >= p_day_start and created_at < p_day_end)
          ),
          ('unhookOnce', exists(
            select 1 from public.act_defusion_logs
             where user_id = uid and created_at >= phase_started_at
          )),
          ('makeRoomOnce',
            exists(select 1 from public.act_expansion_logs where user_id = uid and created_at >= phase_started_at)
            or exists(select 1 from public.act_urge_surf_logs where user_id = uid and created_at >= phase_started_at)
          );
      when 3 then
        return query values
          ('valuesStepDaily', exists(
            select 1 from public.act_action_steps
             where user_id = uid and completed_at >= p_day_start and completed_at < p_day_end
          )),
          ('clarifyValue', exists(
            select 1 from public.act_value_entries
             where user_id = uid and updated_at >= phase_started_at
          )),
          ('commitActionOnce', exists(
            select 1 from public.act_committed_actions
             where user_id = uid and created_at >= phase_started_at
          ));
    end case;
  end if;
end;
$$;

revoke all on function public.program_widget_task_status(text, timestamptz, timestamptz) from public;
grant execute on function public.program_widget_task_status(text, timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';

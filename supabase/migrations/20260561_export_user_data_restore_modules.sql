-- Bug-hunt fix: export_user_data() silently dropped gratitude, habits, and meditation.
-- Migrations 20260553 and 20260555 replaced the function with a fresh full body that no
-- longer called the prior export_user_data_before_* wrapper, breaking the rename-then-wrap
-- chain — so those previously-included modules vanished from the GDPR export with no error.
-- Restore them by wrapping the current function and re-appending the dropped module blocks
-- (copied verbatim from 20260527_meditation_export_coverage / 20260530_gratitude_phase4_5 /
-- 20260532_habits).

alter function public.export_user_data() rename to export_user_data_before_module_restore;
revoke execute on function public.export_user_data_before_module_restore() from public;
revoke execute on function public.export_user_data_before_module_restore() from authenticated;

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  result := public.export_user_data_before_module_restore()::jsonb;

  -- Meditation (TMI) tables
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
          technique_used
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

  -- Gratitude
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

  -- Habits
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

  return result::json;
end;
$$;

grant execute on function public.export_user_data() to authenticated;

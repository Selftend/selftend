-- GDPR completeness: export_user_data()'s 'preferences' block only carried CBT reminder
-- fields. It omitted meditation + ACT reminders (pre-existing gap) and, now that the
-- notification system is complete, the 7 tool reminders (mood, journal, gratitude,
-- grounding, breathing, sleep, habits). A Subject Access / portability export must include
-- every reminder the user has configured.
--
-- Same APPEND pattern as 20260568: rename the current fn to a shadow, wrap it, and MERGE the
-- missing reminder fields into the existing 'preferences' object via jsonb concatenation.
-- This can only ADD keys, never silently drop the ones the shadow already returns.

alter function public.export_user_data() rename to export_user_data_before_tool_reminders;
revoke execute on function public.export_user_data_before_tool_reminders() from public;
revoke execute on function public.export_user_data_before_tool_reminders() from authenticated;

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
  reminder_prefs jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  result := public.export_user_data_before_tool_reminders()::jsonb;

  -- The reminder fields the base 'preferences' block does not already include.
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

  -- Merge into the existing 'preferences' object (append-only). Only when the user has a
  -- preferences row; otherwise the base export already carries a null 'preferences'.
  if reminder_prefs is not null then
    result := jsonb_set(
      result,
      '{preferences}',
      coalesce(result -> 'preferences', '{}'::jsonb) || reminder_prefs
    );
  end if;

  return result::json;
end;
$$;

grant execute on function public.export_user_data() to authenticated;

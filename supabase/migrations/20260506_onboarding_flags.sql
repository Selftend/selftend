-- Migration: Store account-level onboarding completion flags.

alter table public.user_preferences
  add column if not exists app_onboarding_completed boolean not null default false,
  add column if not exists cbt_onboarding_completed boolean not null default false;

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
as $$
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
          cbt_reminders_enabled,
          cbt_reminder_hour,
          cbt_reminder_minute,
          app_onboarding_completed,
          cbt_onboarding_completed,
          privacy_policy_accepted_at,
          terms_accepted_at,
          policy_version_accepted,
          cookie_consent,
          language,
          created_at,
          updated_at
        from public.user_preferences
        where user_id = uid
      ) pr
    ),
    'thoughtRecords', (
      select coalesce(json_agg(row_to_json(tr)), '[]'::json)
      from (
        select
          id,
          situation,
          automatic_thought,
          emotions,
          distortions,
          balanced_thought,
          archived_at,
          created_at,
          updated_at
        from public.thought_records
        where user_id = uid
        order by created_at asc
      ) tr
    )
  ) into result;

  return result;
end;
$$;

-- Migration: Add GDPR consent tracking columns and self-service deletion support.
-- Adds privacy/terms acceptance timestamps, policy version tracking, and cookie consent.

alter table public.user_preferences
  add column if not exists privacy_policy_accepted_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists policy_version_accepted text,
  add column if not exists cookie_consent jsonb;

-- Function for authenticated users to export all their data as JSON.
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
          privacy_policy_accepted_at,
          terms_accepted_at,
          policy_version_accepted,
          cookie_consent,
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

-- Function for authenticated users to permanently delete their own account.
-- Deletes all user data then removes the auth user (cascade handles FK relations).
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete from tables that may not cascade from auth.users
  delete from public.thought_records where user_id = uid;
  delete from public.user_preferences where user_id = uid;
  delete from public.profiles where user_id = uid;

  -- Delete the auth user (requires service_role or superuser; security definer runs as owner)
  -- Note: This works because security definer functions run with the privileges of the function owner (postgres).
  delete from auth.users where id = uid;
end;
$$;

-- Grant execute to authenticated users only
grant execute on function public.export_user_data() to authenticated;
grant execute on function public.delete_user_account() to authenticated;

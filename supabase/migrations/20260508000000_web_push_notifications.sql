-- Migration: Add web push subscription infrastructure for browser reminders.

alter table public.user_preferences
  add column if not exists cbt_reminder_timezone text;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  time_zone text,
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  last_reminder_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_web_push_subscriptions_updated_at on public.web_push_subscriptions;
create trigger set_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "web_push_subscriptions_select_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_select_own"
on public.web_push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "web_push_subscriptions_insert_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_insert_own"
on public.web_push_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "web_push_subscriptions_update_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_update_own"
on public.web_push_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "web_push_subscriptions_delete_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_delete_own"
on public.web_push_subscriptions
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists web_push_subscriptions_user_id_idx
on public.web_push_subscriptions (user_id);

create index if not exists web_push_subscriptions_enabled_idx
on public.web_push_subscriptions (enabled)
where enabled = true;

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

  delete from public.web_push_subscriptions where user_id = uid;
  delete from public.thought_records where user_id = uid;
  delete from public.user_preferences where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.export_user_data() to authenticated;
grant execute on function public.delete_user_account() to authenticated;

create schema if not exists extensions;
create schema if not exists vault;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_send_web_reminders()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
declare
  cron_secret text;
  project_url text;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'selftend_supabase_url'
  limit 1;

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'selftend_web_push_cron_secret'
  limit 1;

  if project_url is null or cron_secret is null then
    raise exception 'Missing Vault secrets for web push cron.';
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/send-web-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-selftend-cron-secret', cron_secret
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
end;
$$;

create or replace function public.schedule_send_web_reminders_cron()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  begin
    perform cron.unschedule('selftend-send-web-reminders');
  exception
    when others then
      null;
  end;

  perform cron.schedule(
    'selftend-send-web-reminders',
    '*/5 * * * *',
    'select public.invoke_send_web_reminders();'
  );
end;
$$;

revoke all on function public.invoke_send_web_reminders() from public, anon, authenticated;
revoke all on function public.schedule_send_web_reminders_cron() from public, anon, authenticated;

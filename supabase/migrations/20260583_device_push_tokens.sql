-- Native (Expo) push tokens — the native sibling of web_push_subscriptions. One row per
-- device token; the send-web-reminders edge function delivers reminders to these via the
-- Expo Push API, reusing the same per-target daily dedup keys + suppression as web push.

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  time_zone text,
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  last_cbt_reminder_key text,
  last_meditation_reminder_key text,
  last_act_reminder_key text,
  last_mood_reminder_key text,
  last_journal_reminder_key text,
  last_gratitude_reminder_key text,
  last_grounding_reminder_key text,
  last_breathing_reminder_key text,
  last_sleep_reminder_key text,
  last_habits_reminder_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_device_push_tokens_updated_at on public.device_push_tokens;
create trigger set_device_push_tokens_updated_at
before update on public.device_push_tokens
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_select_own" on public.device_push_tokens;
create policy "device_push_tokens_select_own"
on public.device_push_tokens for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "device_push_tokens_insert_own" on public.device_push_tokens;
create policy "device_push_tokens_insert_own"
on public.device_push_tokens for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens_update_own" on public.device_push_tokens;
create policy "device_push_tokens_update_own"
on public.device_push_tokens for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "device_push_tokens_delete_own" on public.device_push_tokens;
create policy "device_push_tokens_delete_own"
on public.device_push_tokens for delete to authenticated
using (auth.uid() = user_id);

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens (user_id);

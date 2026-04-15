create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled_modules text[] not null default array['cbt']::text[],
  reminder_consent boolean not null default false,
  cbt_reminders_enabled boolean not null default false,
  cbt_reminder_hour integer not null default 19 check (cbt_reminder_hour between 0 and 23),
  cbt_reminder_minute integer not null default 0 check (cbt_reminder_minute between 0 and 59),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.thought_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  situation text not null,
  automatic_thought text not null,
  emotions text[] not null default array[]::text[],
  distortions text[] not null default array[]::text[],
  balanced_thought text not null,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_thought_records_updated_at on public.thought_records;
create trigger set_thought_records_updated_at
before update on public.thought_records
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.thought_records enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "preferences_select_own" on public.user_preferences;
create policy "preferences_select_own"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "preferences_insert_own" on public.user_preferences;
create policy "preferences_insert_own"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_update_own"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "thought_records_select_own" on public.thought_records;
create policy "thought_records_select_own"
on public.thought_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "thought_records_insert_own" on public.thought_records;
create policy "thought_records_insert_own"
on public.thought_records
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "thought_records_update_own" on public.thought_records;
create policy "thought_records_update_own"
on public.thought_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

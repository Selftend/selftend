-- Habits module (Phase 1 + 2): habit definitions and daily tick logs.
-- Backed by James Clear's Atomic Habits framework. See docs/modules/habits.md.
--
-- Two tables:
--   public.habits        — a habit definition with identity + four-law strategies.
--   public.habit_logs    — one row per (habit_id, logged_on) tick. Absence of a
--                          row means "not ticked"; we do not record misses.

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'build',
  identity text not null default '',
  cue_plan text not null default '',
  stack_after text not null default '',
  craving_pairing text not null default '',
  two_minute_version text not null default '',
  reward_note text not null default '',
  cadence text not null default 'daily',
  custom_days smallint[] not null default '{}',
  color text not null default 'primary',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint habits_name_not_blank check (length(btrim(name)) > 0),
  constraint habits_name_length check (length(name) <= 120),
  constraint habits_kind_valid check (kind in ('build', 'break')),
  constraint habits_identity_length check (length(identity) <= 200),
  constraint habits_cue_plan_length check (length(cue_plan) <= 240),
  constraint habits_stack_after_length check (length(stack_after) <= 120),
  constraint habits_craving_pairing_length check (length(craving_pairing) <= 240),
  constraint habits_two_minute_version_length check (length(two_minute_version) <= 200),
  constraint habits_reward_note_length check (length(reward_note) <= 200),
  constraint habits_cadence_valid check (cadence in ('daily', 'weekdays', 'custom')),
  constraint habits_custom_days_valid check (
    cadence <> 'custom'
    or (
      cardinality(custom_days) between 1 and 7
      and custom_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
  ),
  constraint habits_color_length check (length(color) between 1 and 32)
);

create index if not exists habits_user_active_created_idx
  on public.habits (user_id, archived_at, created_at desc);

create index if not exists habits_user_created_idx
  on public.habits (user_id, created_at desc);

drop trigger if exists set_habits_updated_at on public.habits;
create trigger set_habits_updated_at
before update on public.habits
for each row execute function public.set_current_timestamp_updated_at();

alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- habit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  logged_on date not null,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint habit_logs_note_length check (length(note) <= 500)
);

create unique index if not exists habit_logs_habit_day_unique_idx
  on public.habit_logs (habit_id, logged_on);

create index if not exists habit_logs_user_logged_idx
  on public.habit_logs (user_id, logged_on desc);

create index if not exists habit_logs_habit_logged_idx
  on public.habit_logs (habit_id, logged_on desc);

drop trigger if exists set_habit_logs_updated_at on public.habit_logs;
create trigger set_habit_logs_updated_at
before update on public.habit_logs
for each row execute function public.set_current_timestamp_updated_at();

alter table public.habit_logs enable row level security;

drop policy if exists "habit_logs_select_own" on public.habit_logs;
create policy "habit_logs_select_own" on public.habit_logs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "habit_logs_insert_own" on public.habit_logs;
create policy "habit_logs_insert_own" on public.habit_logs
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "habit_logs_update_own" on public.habit_logs;
create policy "habit_logs_update_own" on public.habit_logs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habit_logs_delete_own" on public.habit_logs;
create policy "habit_logs_delete_own" on public.habit_logs
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_preferences.habits_onboarding_completed
-- ---------------------------------------------------------------------------
alter table public.user_preferences
  add column if not exists habits_onboarding_completed boolean not null default false;

-- ---------------------------------------------------------------------------
-- Extend export_user_data() — rename-then-wrap pattern.
-- ---------------------------------------------------------------------------
alter function public.export_user_data() rename to export_user_data_before_habits;
revoke execute on function public.export_user_data_before_habits() from public;
revoke execute on function public.export_user_data_before_habits() from authenticated;

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

  result := public.export_user_data_before_habits()::jsonb;
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

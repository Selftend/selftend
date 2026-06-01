-- Custom breathing exercises: a user-authored single cycle (inhale/hold/exhale/hold-out,
-- decimals allowed, 0 = skip) repeated for `cycles`, with a list-card color. Built-in
-- patterns stay in code (src/constants/breathing.ts); only user-created ones live here.
-- Idempotent (create ... if not exists). Sessions continue to log into mindfulness_sessions
-- with exercise_name = this row's id.

create table if not exists public.breathing_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  inhale_seconds numeric not null default 0,
  hold_in_seconds numeric not null default 0,
  exhale_seconds numeric not null default 0,
  hold_out_seconds numeric not null default 0,
  cycles integer not null default 6,
  color text not null default 'aqua',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint breathing_exercises_name_not_blank check (length(btrim(name)) > 0),
  constraint breathing_exercises_name_length check (length(name) <= 80),
  constraint breathing_exercises_inhale_valid check (inhale_seconds >= 0 and inhale_seconds <= 60),
  constraint breathing_exercises_hold_in_valid check (hold_in_seconds >= 0 and hold_in_seconds <= 60),
  constraint breathing_exercises_exhale_valid check (exhale_seconds >= 0 and exhale_seconds <= 60),
  constraint breathing_exercises_hold_out_valid check (hold_out_seconds >= 0 and hold_out_seconds <= 60),
  constraint breathing_exercises_active_phase check (inhale_seconds > 0 or exhale_seconds > 0),
  constraint breathing_exercises_cycles_valid check (cycles between 1 and 999),
  constraint breathing_exercises_color_length check (length(color) between 1 and 32)
);

create index if not exists breathing_exercises_user_created_idx
  on public.breathing_exercises (user_id, created_at desc);

drop trigger if exists set_breathing_exercises_updated_at on public.breathing_exercises;
create trigger set_breathing_exercises_updated_at
before update on public.breathing_exercises
for each row execute function public.set_current_timestamp_updated_at();

alter table public.breathing_exercises enable row level security;

drop policy if exists "breathing_exercises_select_own" on public.breathing_exercises;
create policy "breathing_exercises_select_own" on public.breathing_exercises
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "breathing_exercises_insert_own" on public.breathing_exercises;
create policy "breathing_exercises_insert_own" on public.breathing_exercises
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "breathing_exercises_update_own" on public.breathing_exercises;
create policy "breathing_exercises_update_own" on public.breathing_exercises
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "breathing_exercises_delete_own" on public.breathing_exercises;
create policy "breathing_exercises_delete_own" on public.breathing_exercises
  for delete to authenticated using (auth.uid() = user_id);

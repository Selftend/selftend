-- Phase 1: Goal Setting (S1), Behavioral Activation (S2), Mood Logging (global)

-- Extend user_preferences with concern selection + strategy tracking
alter table public.user_preferences
  add column if not exists selected_concerns text[] not null default array[]::text[],
  add column if not exists active_strategies text[] not null default array[]::text[];

-- Strategy 1: Goal Setting
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  life_domain text not null,
  goal_type text not null,
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'abandoned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Strategy 2: Behavioral Activation
create table if not exists public.values_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  life_domain text not null,
  importance_rating integer not null check (importance_rating between 1 and 5),
  satisfaction_rating integer not null check (satisfaction_rating between 1 and 5),
  domain_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, life_domain)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_name text not null,
  category text not null check (category in ('pleasure', 'mastery')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  mood_before integer check (mood_before between 1 and 10),
  mood_after integer check (mood_after between 1 and 10),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Global: Mood Logging
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood_score integer not null check (mood_score between 1 and 10),
  emotions text[] not null default array[]::text[],
  notes text not null default '',
  linked_strategy text,
  logged_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- Triggers
drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
before update on public.goals
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_milestones_updated_at on public.milestones;
create trigger set_milestones_updated_at
before update on public.milestones
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_values_profile_updated_at on public.values_profile;
create trigger set_values_profile_updated_at
before update on public.values_profile
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_activity_logs_updated_at on public.activity_logs;
create trigger set_activity_logs_updated_at
before update on public.activity_logs
for each row execute function public.set_current_timestamp_updated_at();

-- RLS
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.values_profile enable row level security;
alter table public.activity_logs enable row level security;
alter table public.mood_logs enable row level security;

-- Goals
drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals for delete to authenticated using (auth.uid() = user_id);

-- Milestones
drop policy if exists "milestones_select_own" on public.milestones;
create policy "milestones_select_own" on public.milestones for select to authenticated using (auth.uid() = user_id);
drop policy if exists "milestones_insert_own" on public.milestones;
create policy "milestones_insert_own" on public.milestones for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "milestones_update_own" on public.milestones;
create policy "milestones_update_own" on public.milestones for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "milestones_delete_own" on public.milestones;
create policy "milestones_delete_own" on public.milestones for delete to authenticated using (auth.uid() = user_id);

-- Values profile
drop policy if exists "values_profile_select_own" on public.values_profile;
create policy "values_profile_select_own" on public.values_profile for select to authenticated using (auth.uid() = user_id);
drop policy if exists "values_profile_insert_own" on public.values_profile;
create policy "values_profile_insert_own" on public.values_profile for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "values_profile_update_own" on public.values_profile;
create policy "values_profile_update_own" on public.values_profile for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Activity logs
drop policy if exists "activity_logs_select_own" on public.activity_logs;
create policy "activity_logs_select_own" on public.activity_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "activity_logs_insert_own" on public.activity_logs;
create policy "activity_logs_insert_own" on public.activity_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "activity_logs_update_own" on public.activity_logs;
create policy "activity_logs_update_own" on public.activity_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "activity_logs_delete_own" on public.activity_logs;
create policy "activity_logs_delete_own" on public.activity_logs for delete to authenticated using (auth.uid() = user_id);

-- Mood logs
drop policy if exists "mood_logs_select_own" on public.mood_logs;
create policy "mood_logs_select_own" on public.mood_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "mood_logs_insert_own" on public.mood_logs;
create policy "mood_logs_insert_own" on public.mood_logs for insert to authenticated with check (auth.uid() = user_id);

-- Phase 4: Mindfulness (S5), Procrastination (S6), Anger Management (S8), Self-Care (S9)

-- Strategy 5: Mindfulness
create table if not exists public.mindfulness_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  duration_minutes integer not null check (duration_minutes >= 0),
  reflection text not null default '',
  mood_after integer check (mood_after between 1 and 10),
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- Strategy 6: Procrastination
create table if not exists public.procrastination_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_description text not null,
  avoidance_reason text not null default '',
  fear_thought text not null default '',
  challenged_thought text not null default '',
  deadline date,
  reward text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.procrastination_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  estimated_minutes integer check (estimated_minutes >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Strategy 8: Anger Management
create table if not exists public.anger_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trigger_text text not null,
  interpretation text not null default '',
  arousal_level integer not null check (arousal_level between 1 and 10),
  urge text not null default '',
  behavior_chosen text not null default '',
  consequence text not null default '',
  time_out_taken boolean not null default false,
  alternative_interpretation text not null default '',
  outcome_rating integer check (outcome_rating between 1 and 10),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Strategy 9: Self-Care
create table if not exists public.self_care_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  sleep_hours numeric(4, 2) check (sleep_hours >= 0 and sleep_hours <= 24),
  sleep_quality integer check (sleep_quality between 1 and 5),
  exercise_done boolean not null default false,
  exercise_minutes integer check (exercise_minutes >= 0),
  exercise_type text not null default '',
  meals_structured integer check (meals_structured between 1 and 5),
  emotional_eating boolean not null default false,
  social_connection_made boolean not null default false,
  social_notes text not null default '',
  meaningful_activity text not null default '',
  gratitude text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, log_date)
);

-- Triggers
drop trigger if exists set_procrastination_tasks_updated_at on public.procrastination_tasks;
create trigger set_procrastination_tasks_updated_at
before update on public.procrastination_tasks
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_task_steps_updated_at on public.task_steps;
create trigger set_task_steps_updated_at
before update on public.task_steps
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_anger_logs_updated_at on public.anger_logs;
create trigger set_anger_logs_updated_at
before update on public.anger_logs
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_self_care_logs_updated_at on public.self_care_logs;
create trigger set_self_care_logs_updated_at
before update on public.self_care_logs
for each row execute function public.set_current_timestamp_updated_at();

-- RLS
alter table public.mindfulness_sessions enable row level security;
alter table public.procrastination_tasks enable row level security;
alter table public.task_steps enable row level security;
alter table public.anger_logs enable row level security;
alter table public.self_care_logs enable row level security;

-- Mindfulness
drop policy if exists "mindfulness_sessions_select_own" on public.mindfulness_sessions;
create policy "mindfulness_sessions_select_own" on public.mindfulness_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "mindfulness_sessions_insert_own" on public.mindfulness_sessions;
create policy "mindfulness_sessions_insert_own" on public.mindfulness_sessions for insert to authenticated with check (auth.uid() = user_id);

-- Procrastination tasks
drop policy if exists "procrastination_tasks_select_own" on public.procrastination_tasks;
create policy "procrastination_tasks_select_own" on public.procrastination_tasks for select to authenticated using (auth.uid() = user_id);
drop policy if exists "procrastination_tasks_insert_own" on public.procrastination_tasks;
create policy "procrastination_tasks_insert_own" on public.procrastination_tasks for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "procrastination_tasks_update_own" on public.procrastination_tasks;
create policy "procrastination_tasks_update_own" on public.procrastination_tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "procrastination_tasks_delete_own" on public.procrastination_tasks;
create policy "procrastination_tasks_delete_own" on public.procrastination_tasks for delete to authenticated using (auth.uid() = user_id);

-- Task steps
drop policy if exists "task_steps_select_own" on public.task_steps;
create policy "task_steps_select_own" on public.task_steps for select to authenticated using (auth.uid() = user_id);
drop policy if exists "task_steps_insert_own" on public.task_steps;
create policy "task_steps_insert_own" on public.task_steps for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "task_steps_update_own" on public.task_steps;
create policy "task_steps_update_own" on public.task_steps for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "task_steps_delete_own" on public.task_steps;
create policy "task_steps_delete_own" on public.task_steps for delete to authenticated using (auth.uid() = user_id);

-- Anger logs
drop policy if exists "anger_logs_select_own" on public.anger_logs;
create policy "anger_logs_select_own" on public.anger_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "anger_logs_insert_own" on public.anger_logs;
create policy "anger_logs_insert_own" on public.anger_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "anger_logs_update_own" on public.anger_logs;
create policy "anger_logs_update_own" on public.anger_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "anger_logs_delete_own" on public.anger_logs;
create policy "anger_logs_delete_own" on public.anger_logs for delete to authenticated using (auth.uid() = user_id);

-- Self-care
drop policy if exists "self_care_logs_select_own" on public.self_care_logs;
create policy "self_care_logs_select_own" on public.self_care_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "self_care_logs_insert_own" on public.self_care_logs;
create policy "self_care_logs_insert_own" on public.self_care_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "self_care_logs_update_own" on public.self_care_logs;
create policy "self_care_logs_update_own" on public.self_care_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

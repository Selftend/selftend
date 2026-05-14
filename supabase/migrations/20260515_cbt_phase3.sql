-- Phase 3: Core Beliefs (S4), Anxiety & Exposure (S7), Worry Journal

-- Strategy 4: Core Beliefs
create table if not exists public.core_beliefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  belief_statement text not null,
  triggering_situations text[] not null default array[]::text[],
  evidence_for text[] not null default array[]::text[],
  evidence_against text[] not null default array[]::text[],
  alternative_belief text not null default '',
  original_belief_strength integer not null check (original_belief_strength between 0 and 100),
  alternative_belief_strength integer not null check (alternative_belief_strength between 0 and 100),
  reinforcement_plan text not null default '',
  next_review_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Strategy 7: Anxiety & Exposure
create table if not exists public.exposure_hierarchies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  anxiety_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exposure_items (
  id uuid primary key default gen_random_uuid(),
  hierarchy_id uuid not null references public.exposure_hierarchies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  suds_rating integer not null check (suds_rating between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exposure_sessions (
  id uuid primary key default gen_random_uuid(),
  exposure_item_id uuid not null references public.exposure_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  pre_suds integer not null check (pre_suds between 0 and 100),
  post_suds integer not null check (post_suds between 0 and 100),
  duration_minutes integer not null check (duration_minutes >= 0),
  safety_behaviors_used boolean not null default false,
  safety_behavior_description text not null default '',
  notes text not null default '',
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- Worry Journal (sub-strategy of S7)
create table if not exists public.worry_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  worry_statement text not null,
  worry_category text not null check (worry_category in ('hypothetical', 'real_problem')),
  probability_estimate integer check (probability_estimate between 0 and 100),
  evidence_for text[] not null default array[]::text[],
  evidence_against text[] not null default array[]::text[],
  coping_statement text not null default '',
  action_steps text[] not null default array[]::text[],
  resolved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Triggers
drop trigger if exists set_core_beliefs_updated_at on public.core_beliefs;
create trigger set_core_beliefs_updated_at
before update on public.core_beliefs
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_exposure_hierarchies_updated_at on public.exposure_hierarchies;
create trigger set_exposure_hierarchies_updated_at
before update on public.exposure_hierarchies
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_exposure_items_updated_at on public.exposure_items;
create trigger set_exposure_items_updated_at
before update on public.exposure_items
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_worry_entries_updated_at on public.worry_entries;
create trigger set_worry_entries_updated_at
before update on public.worry_entries
for each row execute function public.set_current_timestamp_updated_at();

-- RLS
alter table public.core_beliefs enable row level security;
alter table public.exposure_hierarchies enable row level security;
alter table public.exposure_items enable row level security;
alter table public.exposure_sessions enable row level security;
alter table public.worry_entries enable row level security;

-- Core beliefs
drop policy if exists "core_beliefs_select_own" on public.core_beliefs;
create policy "core_beliefs_select_own" on public.core_beliefs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "core_beliefs_insert_own" on public.core_beliefs;
create policy "core_beliefs_insert_own" on public.core_beliefs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "core_beliefs_update_own" on public.core_beliefs;
create policy "core_beliefs_update_own" on public.core_beliefs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "core_beliefs_delete_own" on public.core_beliefs;
create policy "core_beliefs_delete_own" on public.core_beliefs for delete to authenticated using (auth.uid() = user_id);

-- Exposure hierarchies
drop policy if exists "exposure_hierarchies_select_own" on public.exposure_hierarchies;
create policy "exposure_hierarchies_select_own" on public.exposure_hierarchies for select to authenticated using (auth.uid() = user_id);
drop policy if exists "exposure_hierarchies_insert_own" on public.exposure_hierarchies;
create policy "exposure_hierarchies_insert_own" on public.exposure_hierarchies for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "exposure_hierarchies_update_own" on public.exposure_hierarchies;
create policy "exposure_hierarchies_update_own" on public.exposure_hierarchies for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "exposure_hierarchies_delete_own" on public.exposure_hierarchies;
create policy "exposure_hierarchies_delete_own" on public.exposure_hierarchies for delete to authenticated using (auth.uid() = user_id);

-- Exposure items
drop policy if exists "exposure_items_select_own" on public.exposure_items;
create policy "exposure_items_select_own" on public.exposure_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists "exposure_items_insert_own" on public.exposure_items;
create policy "exposure_items_insert_own" on public.exposure_items for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "exposure_items_update_own" on public.exposure_items;
create policy "exposure_items_update_own" on public.exposure_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "exposure_items_delete_own" on public.exposure_items;
create policy "exposure_items_delete_own" on public.exposure_items for delete to authenticated using (auth.uid() = user_id);

-- Exposure sessions
drop policy if exists "exposure_sessions_select_own" on public.exposure_sessions;
create policy "exposure_sessions_select_own" on public.exposure_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "exposure_sessions_insert_own" on public.exposure_sessions;
create policy "exposure_sessions_insert_own" on public.exposure_sessions for insert to authenticated with check (auth.uid() = user_id);

-- Worry entries
drop policy if exists "worry_entries_select_own" on public.worry_entries;
create policy "worry_entries_select_own" on public.worry_entries for select to authenticated using (auth.uid() = user_id);
drop policy if exists "worry_entries_insert_own" on public.worry_entries;
create policy "worry_entries_insert_own" on public.worry_entries for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "worry_entries_update_own" on public.worry_entries;
create policy "worry_entries_update_own" on public.worry_entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "worry_entries_delete_own" on public.worry_entries;
create policy "worry_entries_delete_own" on public.worry_entries for delete to authenticated using (auth.uid() = user_id);

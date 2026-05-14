-- Phase 5: Synthesis & Integration (S10), Recovery Plan

-- Strategy 10: Recovery Plan
create table if not exists public.recovery_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recovery_keys text[] not null default array[]::text[],
  personal_slogan text not null default '',
  strategy_integration_notes jsonb not null default '{}'::jsonb,
  maintenance_commitments text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id),
  unique (id, user_id)
);

create table if not exists public.challenge_plans (
  id uuid primary key default gen_random_uuid(),
  recovery_plan_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_description text not null,
  coping_steps text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (recovery_plan_id, user_id)
    references public.recovery_plans (id, user_id)
    on delete cascade
);

-- Triggers
drop trigger if exists set_recovery_plans_updated_at on public.recovery_plans;
create trigger set_recovery_plans_updated_at
before update on public.recovery_plans
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_challenge_plans_updated_at on public.challenge_plans;
create trigger set_challenge_plans_updated_at
before update on public.challenge_plans
for each row execute function public.set_current_timestamp_updated_at();

-- RLS
alter table public.recovery_plans enable row level security;
alter table public.challenge_plans enable row level security;

-- Recovery plans
drop policy if exists "recovery_plans_select_own" on public.recovery_plans;
create policy "recovery_plans_select_own" on public.recovery_plans for select to authenticated using (auth.uid() = user_id);
drop policy if exists "recovery_plans_insert_own" on public.recovery_plans;
create policy "recovery_plans_insert_own" on public.recovery_plans for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "recovery_plans_update_own" on public.recovery_plans;
create policy "recovery_plans_update_own" on public.recovery_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "recovery_plans_delete_own" on public.recovery_plans;
create policy "recovery_plans_delete_own" on public.recovery_plans for delete to authenticated using (auth.uid() = user_id);

-- Challenge plans
drop policy if exists "challenge_plans_select_own" on public.challenge_plans;
create policy "challenge_plans_select_own" on public.challenge_plans for select to authenticated using (auth.uid() = user_id);
drop policy if exists "challenge_plans_insert_own" on public.challenge_plans;
create policy "challenge_plans_insert_own" on public.challenge_plans for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "challenge_plans_update_own" on public.challenge_plans;
create policy "challenge_plans_update_own" on public.challenge_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "challenge_plans_delete_own" on public.challenge_plans;
create policy "challenge_plans_delete_own" on public.challenge_plans for delete to authenticated using (auth.uid() = user_id);

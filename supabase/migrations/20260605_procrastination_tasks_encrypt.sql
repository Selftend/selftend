-- Encrypt procrastination_tasks free-text at rest:
--   task_description, avoidance_reason, fear_thought, challenged_thought, reward.
-- Same pattern as the journal pilot (20260587). Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL):
--   task_description   (cap 2000)
--   avoidance_reason   (no cap)
--   fear_thought       (cap 2000)
--   challenged_thought (cap 2000)
--   reward             (no cap)
-- PASS-THROUGH: id, user_id, deadline (date, nullable), status (text, enum CHECK stays on the
--   base table — fixed slug, not free-text), created_at, updated_at.
-- This is a PARENT table (task_steps.task_id FKs it) — encrypted before its children.
-- set_procrastination_tasks_updated_at BEFORE-UPDATE trigger travels with the rename; the inner
-- update fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.procrastination_tasks add column if not exists task_description_enc   bytea;
alter table public.procrastination_tasks add column if not exists avoidance_reason_enc   bytea;
alter table public.procrastination_tasks add column if not exists fear_thought_enc       bytea;
alter table public.procrastination_tasks add column if not exists challenged_thought_enc bytea;
alter table public.procrastination_tasks add column if not exists reward_enc             bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.procrastination_tasks
  set task_description_enc   = app.encrypt_text(task_description),
      avoidance_reason_enc   = app.encrypt_text(avoidance_reason),
      fear_thought_enc       = app.encrypt_text(fear_thought),
      challenged_thought_enc = app.encrypt_text(challenged_thought),
      reward_enc             = app.encrypt_text(reward)
  where task_description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.procrastination_tasks rename to procrastination_tasks_data;
alter table public.procrastination_tasks_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them).
alter table public.procrastination_tasks_data alter column task_description   drop not null;
alter table public.procrastination_tasks_data alter column avoidance_reason   drop not null;
alter table public.procrastination_tasks_data alter column fear_thought       drop not null;
alter table public.procrastination_tasks_data alter column challenged_thought drop not null;
alter table public.procrastination_tasks_data alter column reward             drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.procrastination_tasks with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(task_description_enc)   as task_description,
         app.decrypt_text(avoidance_reason_enc)   as avoidance_reason,
         app.decrypt_text(fear_thought_enc)       as fear_thought,
         app.decrypt_text(challenged_thought_enc) as challenged_thought,
         deadline,
         app.decrypt_text(reward_enc)             as reward,
         status,
         created_at,
         updated_at
  from public.procrastination_tasks_data;

create or replace function public.procrastination_tasks_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.task_description) > 2000 then
    raise exception 'procrastination task task_description exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.fear_thought) > 2000 then
    raise exception 'procrastination task fear_thought exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.challenged_thought) > 2000 then
    raise exception 'procrastination task challenged_thought exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  insert into public.procrastination_tasks_data (
    id, user_id, task_description_enc, avoidance_reason_enc, fear_thought_enc,
    challenged_thought_enc, deadline, reward_enc, status, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.task_description, '')),
    app.encrypt_text(coalesce(new.avoidance_reason, '')),
    app.encrypt_text(coalesce(new.fear_thought, '')),
    app.encrypt_text(coalesce(new.challenged_thought, '')),
    new.deadline,
    app.encrypt_text(coalesce(new.reward, '')),
    coalesce(new.status, 'active'),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists procrastination_tasks_ins on public.procrastination_tasks;
create trigger procrastination_tasks_ins instead of insert on public.procrastination_tasks
  for each row execute function public.procrastination_tasks_ins();

create or replace function public.procrastination_tasks_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.task_description) > 2000 then
    raise exception 'procrastination task task_description exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.fear_thought) > 2000 then
    raise exception 'procrastination task fear_thought exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.challenged_thought) > 2000 then
    raise exception 'procrastination task challenged_thought exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.procrastination_tasks_data set
    task_description_enc   = app.encrypt_text(coalesce(new.task_description, '')),
    avoidance_reason_enc   = app.encrypt_text(coalesce(new.avoidance_reason, '')),
    fear_thought_enc       = app.encrypt_text(coalesce(new.fear_thought, '')),
    challenged_thought_enc = app.encrypt_text(coalesce(new.challenged_thought, '')),
    deadline               = new.deadline,
    reward_enc             = app.encrypt_text(coalesce(new.reward, '')),
    status                 = new.status,
    created_at             = new.created_at
   where id = old.id;   -- set_procrastination_tasks_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists procrastination_tasks_upd on public.procrastination_tasks;
create trigger procrastination_tasks_upd instead of update on public.procrastination_tasks
  for each row execute function public.procrastination_tasks_upd();

create or replace function public.procrastination_tasks_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.procrastination_tasks_data where id = old.id;
  return old;
end; $$;
drop trigger if exists procrastination_tasks_del on public.procrastination_tasks;
create trigger procrastination_tasks_del instead of delete on public.procrastination_tasks
  for each row execute function public.procrastination_tasks_del();

grant select, insert, update, delete on public.procrastination_tasks to authenticated;
notify pgrst, 'reload schema';

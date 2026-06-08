-- Encrypt task_steps free-text at rest: description.
-- Same pattern as the journal pilot (20260587). Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- ENCRYPT:
--   description (text, NOT NULL, no cap)
-- PASS-THROUGH: id, task_id (FK -> procrastination_tasks_data), user_id, estimated_minutes
--   (int, nullable, CHECK >= 0 stays on the base table), completed_at, created_at, updated_at.
-- FK ordering: parent procrastination_tasks already encrypted (20260605); nothing FKs this table.
-- set_task_steps_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.task_steps add column if not exists description_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.task_steps
  set description_enc = app.encrypt_text(description)
  where description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.task_steps rename to task_steps_data;
alter table public.task_steps_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext column (triggers don't populate it).
alter table public.task_steps_data alter column description drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.task_steps with (security_invoker = true) as
  select id,
         task_id,
         user_id,
         app.decrypt_text(description_enc) as description,
         estimated_minutes,
         completed_at,
         created_at,
         updated_at
  from public.task_steps_data;

create or replace function public.task_steps_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.task_steps_data (
    id, task_id, user_id, description_enc, estimated_minutes, completed_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), new.task_id, coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.description, '')),
    new.estimated_minutes,
    new.completed_at,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists task_steps_ins on public.task_steps;
create trigger task_steps_ins instead of insert on public.task_steps
  for each row execute function public.task_steps_ins();

create or replace function public.task_steps_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.task_steps_data set
    task_id           = new.task_id,
    description_enc   = app.encrypt_text(coalesce(new.description, '')),
    estimated_minutes = new.estimated_minutes,
    completed_at      = new.completed_at,
    created_at        = new.created_at
   where id = old.id;   -- set_task_steps_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists task_steps_upd on public.task_steps;
create trigger task_steps_upd instead of update on public.task_steps
  for each row execute function public.task_steps_upd();

create or replace function public.task_steps_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.task_steps_data where id = old.id;
  return old;
end; $$;
drop trigger if exists task_steps_del on public.task_steps;
create trigger task_steps_del instead of delete on public.task_steps
  for each row execute function public.task_steps_del();

grant select, insert, update, delete on public.task_steps to authenticated;
notify pgrst, 'reload schema';

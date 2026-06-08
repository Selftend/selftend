-- Encrypt recovery_plans free-text at rest:
--   personal_slogan, strategy_integration_notes (jsonb), maintenance_commitments (text[]),
--   recovery_keys (text[]).
-- Same pattern as the journal pilot (20260587). Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- PREFLIGHT: this table has NO active_strategies / slug-array columns (the plan's reminder to keep
--   those plaintext does not apply here — they don't exist). Every non-key column is free-text.
-- ENCRYPT (all NOT NULL):
--   personal_slogan            (text,   cap 500)
--   strategy_integration_notes (jsonb)  -- whole-blob via ::text / ::jsonb
--   maintenance_commitments    (text[]) -- user-typed commitments, whole-array via ::text / ::text[]
--   recovery_keys              (text[]) -- user-typed phrases (Task 1), whole-array via ::text / ::text[]
-- PASS-THROUGH: id, user_id, created_at, updated_at.
-- FK note: challenge_plans has a COMPOSITE FK to recovery_plans(id, user_id). The UNIQUE(id, user_id)
--   constraint (recovery_plans_id_user_id_key) and that FK are by OID and follow the rename to
--   recovery_plans_data automatically — verified after.
-- set_recovery_plans_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.recovery_plans add column if not exists personal_slogan_enc            bytea;
alter table public.recovery_plans add column if not exists strategy_integration_notes_enc bytea;
alter table public.recovery_plans add column if not exists maintenance_commitments_enc    bytea;
alter table public.recovery_plans add column if not exists recovery_keys_enc              bytea;

-- Step B: backfill ciphertext from existing plaintext (cast jsonb / text[] to text first).
update public.recovery_plans
  set personal_slogan_enc            = app.encrypt_text(personal_slogan),
      strategy_integration_notes_enc = app.encrypt_text(strategy_integration_notes::text),
      maintenance_commitments_enc    = app.encrypt_text(maintenance_commitments::text),
      recovery_keys_enc              = app.encrypt_text(recovery_keys::text)
  where personal_slogan_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.recovery_plans rename to recovery_plans_data;
alter table public.recovery_plans_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them).
alter table public.recovery_plans_data alter column personal_slogan            drop not null;
alter table public.recovery_plans_data alter column strategy_integration_notes drop not null;
alter table public.recovery_plans_data alter column maintenance_commitments    drop not null;
alter table public.recovery_plans_data alter column recovery_keys              drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.recovery_plans with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(recovery_keys_enc)::text[]            as recovery_keys,
         app.decrypt_text(personal_slogan_enc)                  as personal_slogan,
         app.decrypt_text(strategy_integration_notes_enc)::jsonb as strategy_integration_notes,
         app.decrypt_text(maintenance_commitments_enc)::text[]  as maintenance_commitments,
         created_at,
         updated_at
  from public.recovery_plans_data;

create or replace function public.recovery_plans_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.personal_slogan) > 500 then
    raise exception 'recovery plan personal_slogan exceeds 500 characters' using errcode = 'check_violation';
  end if;
  insert into public.recovery_plans_data (
    id, user_id, recovery_keys_enc, personal_slogan_enc, strategy_integration_notes_enc,
    maintenance_commitments_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.recovery_keys, array[]::text[])::text),
    app.encrypt_text(coalesce(new.personal_slogan, '')),
    app.encrypt_text(coalesce(new.strategy_integration_notes, '{}'::jsonb)::text),
    app.encrypt_text(coalesce(new.maintenance_commitments, array[]::text[])::text),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists recovery_plans_ins on public.recovery_plans;
create trigger recovery_plans_ins instead of insert on public.recovery_plans
  for each row execute function public.recovery_plans_ins();

create or replace function public.recovery_plans_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.personal_slogan) > 500 then
    raise exception 'recovery plan personal_slogan exceeds 500 characters' using errcode = 'check_violation';
  end if;
  update public.recovery_plans_data set
    recovery_keys_enc              = app.encrypt_text(coalesce(new.recovery_keys, array[]::text[])::text),
    personal_slogan_enc            = app.encrypt_text(coalesce(new.personal_slogan, '')),
    strategy_integration_notes_enc = app.encrypt_text(coalesce(new.strategy_integration_notes, '{}'::jsonb)::text),
    maintenance_commitments_enc    = app.encrypt_text(coalesce(new.maintenance_commitments, array[]::text[])::text),
    created_at                     = new.created_at
   where id = old.id;   -- set_recovery_plans_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists recovery_plans_upd on public.recovery_plans;
create trigger recovery_plans_upd instead of update on public.recovery_plans
  for each row execute function public.recovery_plans_upd();

create or replace function public.recovery_plans_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.recovery_plans_data where id = old.id;
  return old;
end; $$;
drop trigger if exists recovery_plans_del on public.recovery_plans;
create trigger recovery_plans_del instead of delete on public.recovery_plans
  for each row execute function public.recovery_plans_del();

grant select, insert, update, delete on public.recovery_plans to authenticated;
notify pgrst, 'reload schema';

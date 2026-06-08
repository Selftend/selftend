-- Encrypt challenge_plans free-text at rest: challenge_description, coping_steps.
-- Same pattern as the journal pilot (20260587). Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- PREFLIGHT CORRECTION: coping_steps is text[] (udt _text), NOT plain text. Handle as a
--   whole-array via ::text on write / ::text[] on read (same shape as thought_records.evidence_for).
-- ENCRYPT:
--   challenge_description (text,   NOT NULL, no cap)
--   coping_steps          (text[], NOT NULL) -- user-typed coping phrases, whole-array
-- PASS-THROUGH: id, recovery_plan_id, user_id, created_at, updated_at.
-- FK note: challenge_plans has a COMPOSITE FK to recovery_plans(id, user_id). It is by OID and
--   follows recovery_plans' rename to recovery_plans_data automatically (encrypted next, 20260611).
-- set_challenge_plans_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.challenge_plans add column if not exists challenge_description_enc bytea;
alter table public.challenge_plans add column if not exists coping_steps_enc          bytea;

-- Step B: backfill ciphertext from existing plaintext (cast the text[] to text first).
update public.challenge_plans
  set challenge_description_enc = app.encrypt_text(challenge_description),
      coping_steps_enc          = app.encrypt_text(coping_steps::text)
  where challenge_description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.challenge_plans rename to challenge_plans_data;
alter table public.challenge_plans_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them).
alter table public.challenge_plans_data alter column challenge_description drop not null;
alter table public.challenge_plans_data alter column coping_steps         drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.challenge_plans with (security_invoker = true) as
  select id,
         recovery_plan_id,
         user_id,
         app.decrypt_text(challenge_description_enc)    as challenge_description,
         app.decrypt_text(coping_steps_enc)::text[]     as coping_steps,
         created_at,
         updated_at
  from public.challenge_plans_data;

create or replace function public.challenge_plans_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.challenge_plans_data (
    id, recovery_plan_id, user_id, challenge_description_enc, coping_steps_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), new.recovery_plan_id, coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.challenge_description, '')),
    app.encrypt_text(coalesce(new.coping_steps, array[]::text[])::text),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists challenge_plans_ins on public.challenge_plans;
create trigger challenge_plans_ins instead of insert on public.challenge_plans
  for each row execute function public.challenge_plans_ins();

create or replace function public.challenge_plans_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.challenge_plans_data set
    recovery_plan_id          = new.recovery_plan_id,
    challenge_description_enc  = app.encrypt_text(coalesce(new.challenge_description, '')),
    coping_steps_enc          = app.encrypt_text(coalesce(new.coping_steps, array[]::text[])::text),
    created_at                = new.created_at
   where id = old.id;   -- set_challenge_plans_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists challenge_plans_upd on public.challenge_plans;
create trigger challenge_plans_upd instead of update on public.challenge_plans
  for each row execute function public.challenge_plans_upd();

create or replace function public.challenge_plans_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.challenge_plans_data where id = old.id;
  return old;
end; $$;
drop trigger if exists challenge_plans_del on public.challenge_plans;
create trigger challenge_plans_del instead of delete on public.challenge_plans
  for each row execute function public.challenge_plans_del();

grant select, insert, update, delete on public.challenge_plans to authenticated;
notify pgrst, 'reload schema';

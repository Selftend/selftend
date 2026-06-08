-- Encrypt exposure_sessions free-text at rest: safety_behavior_description, notes.
-- Same pattern as the journal pilot (20260587). Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- ENCRYPT:
--   safety_behavior_description (text, NOT NULL, no cap)
--   notes                       (text, NOT NULL, no cap)
-- PASS-THROUGH: id, exposure_item_id (FK -> exposure_items_data), user_id, pre_suds, post_suds,
--   duration_minutes, safety_behaviors_used (bool), completed_at, created_at. The numeric CHECK
--   constraints (pre/post_suds 0..100, duration >= 0) stay on the base table.
-- NOTE: exposure_sessions has NO updated_at column and NO set_*_updated_at trigger.
-- NOTE: only INSERT + SELECT RLS policies exist for users (no UPDATE/DELETE policy) — user
--   UPDATE/DELETE are RLS no-ops; service-role flows through the INSTEAD OF triggers.
-- FK ordering: parent exposure_items already encrypted (20260601); nothing FKs this table.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.exposure_sessions add column if not exists safety_behavior_description_enc bytea;
alter table public.exposure_sessions add column if not exists notes_enc                       bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.exposure_sessions
  set safety_behavior_description_enc = app.encrypt_text(safety_behavior_description),
      notes_enc                       = app.encrypt_text(notes)
  where safety_behavior_description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.exposure_sessions rename to exposure_sessions_data;
alter table public.exposure_sessions_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them).
alter table public.exposure_sessions_data alter column safety_behavior_description drop not null;
alter table public.exposure_sessions_data alter column notes                       drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.exposure_sessions with (security_invoker = true) as
  select id,
         exposure_item_id,
         user_id,
         pre_suds,
         post_suds,
         duration_minutes,
         safety_behaviors_used,
         app.decrypt_text(safety_behavior_description_enc) as safety_behavior_description,
         app.decrypt_text(notes_enc)                       as notes,
         completed_at,
         created_at
  from public.exposure_sessions_data;

create or replace function public.exposure_sessions_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.exposure_sessions_data (
    id, exposure_item_id, user_id, pre_suds, post_suds, duration_minutes,
    safety_behaviors_used, safety_behavior_description_enc, notes_enc, completed_at, created_at)
  values (
    coalesce(new.id, gen_random_uuid()), new.exposure_item_id, coalesce(new.user_id, auth.uid()),
    new.pre_suds, new.post_suds, new.duration_minutes,
    coalesce(new.safety_behaviors_used, false),
    app.encrypt_text(coalesce(new.safety_behavior_description, '')),
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.completed_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())))
  returning id, user_id, completed_at, created_at into new.id, new.user_id, new.completed_at, new.created_at;
  return new;
end; $$;
drop trigger if exists exposure_sessions_ins on public.exposure_sessions;
create trigger exposure_sessions_ins instead of insert on public.exposure_sessions
  for each row execute function public.exposure_sessions_ins();

create or replace function public.exposure_sessions_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.exposure_sessions_data set
    exposure_item_id                = new.exposure_item_id,
    pre_suds                        = new.pre_suds,
    post_suds                       = new.post_suds,
    duration_minutes                = new.duration_minutes,
    safety_behaviors_used           = new.safety_behaviors_used,
    safety_behavior_description_enc = app.encrypt_text(coalesce(new.safety_behavior_description, '')),
    notes_enc                       = app.encrypt_text(coalesce(new.notes, '')),
    completed_at                    = new.completed_at,
    created_at                      = new.created_at
   where id = old.id;
  return new;
end; $$;
drop trigger if exists exposure_sessions_upd on public.exposure_sessions;
create trigger exposure_sessions_upd instead of update on public.exposure_sessions
  for each row execute function public.exposure_sessions_upd();

create or replace function public.exposure_sessions_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.exposure_sessions_data where id = old.id;
  return old;
end; $$;
drop trigger if exists exposure_sessions_del on public.exposure_sessions;
create trigger exposure_sessions_del instead of delete on public.exposure_sessions
  for each row execute function public.exposure_sessions_del();

grant select, insert, update, delete on public.exposure_sessions to authenticated;
notify pgrst, 'reload schema';

-- Encrypt act_expansion_logs free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   emotion, body_sensation, notes
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id, intensity_before,
--   struggle_switch_on, discomfort_type (enum CHECK), technique_used (enum CHECK),
--   intensity_after, created_at, updated_at.
-- NO set_act_expansion_logs_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_expansion_logs add column if not exists emotion_enc        bytea;
alter table public.act_expansion_logs add column if not exists body_sensation_enc bytea;
alter table public.act_expansion_logs add column if not exists notes_enc          bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_expansion_logs
  set emotion_enc        = app.encrypt_text(emotion),
      body_sensation_enc = app.encrypt_text(body_sensation),
      notes_enc          = app.encrypt_text(notes)
  where emotion_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_expansion_logs rename to act_expansion_logs_data;
alter table public.act_expansion_logs_data enable row level security;

alter table public.act_expansion_logs_data alter column emotion        drop not null;
alter table public.act_expansion_logs_data alter column body_sensation drop not null;
alter table public.act_expansion_logs_data alter column notes          drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_expansion_logs with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(emotion_enc)        as emotion,
         app.decrypt_text(body_sensation_enc) as body_sensation,
         intensity_before,
         struggle_switch_on,
         discomfort_type,
         technique_used,
         intensity_after,
         app.decrypt_text(notes_enc)          as notes,
         created_at,
         updated_at
  from public.act_expansion_logs_data;

create or replace function public.act_expansion_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_expansion_logs_data (
    id, user_id, emotion_enc, body_sensation_enc, intensity_before, struggle_switch_on,
    discomfort_type, technique_used, intensity_after, notes_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.emotion, '')),
    app.encrypt_text(coalesce(new.body_sensation, '')),
    new.intensity_before,
    new.struggle_switch_on,
    new.discomfort_type,
    coalesce(new.technique_used, 'fourStepExpansion'),
    new.intensity_after,
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, technique_used, created_at, updated_at
    into new.id, new.user_id, new.technique_used, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_expansion_logs_ins on public.act_expansion_logs;
create trigger act_expansion_logs_ins instead of insert on public.act_expansion_logs
  for each row execute function public.act_expansion_logs_ins();

create or replace function public.act_expansion_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_expansion_logs_data set
    emotion_enc        = app.encrypt_text(coalesce(new.emotion, '')),
    body_sensation_enc = app.encrypt_text(coalesce(new.body_sensation, '')),
    intensity_before   = new.intensity_before,
    struggle_switch_on = new.struggle_switch_on,
    discomfort_type    = new.discomfort_type,
    technique_used     = new.technique_used,
    intensity_after    = new.intensity_after,
    notes_enc          = app.encrypt_text(coalesce(new.notes, '')),
    created_at         = new.created_at,
    updated_at         = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_expansion_logs_upd on public.act_expansion_logs;
create trigger act_expansion_logs_upd instead of update on public.act_expansion_logs
  for each row execute function public.act_expansion_logs_upd();

create or replace function public.act_expansion_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_expansion_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_expansion_logs_del on public.act_expansion_logs;
create trigger act_expansion_logs_del instead of delete on public.act_expansion_logs
  for each row execute function public.act_expansion_logs_del();

grant select, insert, update, delete on public.act_expansion_logs to authenticated;
notify pgrst, 'reload schema';

-- Encrypt thought_records free-text at rest. Same pattern as the journal pilot (20260587).
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT:
--   situation         (text,   cap 4000)
--   balanced_thought  (text,   cap 4000)
--   outcome_notes     (text,   cap 4000)
--   evidence_for      (text[]) -- user-typed evidence phrases; whole-array via ::text / ::text[]
--   evidence_against  (text[]) -- same
--   nats              (jsonb)  -- whole-blob via ::text / ::jsonb
-- PASS-THROUGH: id, user_id, emotions[] + distortions[] (fixed ids), emotion_intensity_before,
--   emotion_intensity_after, archived_at, created_at, updated_at.
-- set_thought_records_updated_at BEFORE-UPDATE trigger travels with the rename; the inner
-- update fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.thought_records add column if not exists situation_enc        bytea;
alter table public.thought_records add column if not exists balanced_thought_enc bytea;
alter table public.thought_records add column if not exists outcome_notes_enc    bytea;
alter table public.thought_records add column if not exists evidence_for_enc     bytea;
alter table public.thought_records add column if not exists evidence_against_enc bytea;
alter table public.thought_records add column if not exists nats_enc             bytea;

-- Step B: backfill ciphertext from existing plaintext (cast arrays/jsonb to text first).
update public.thought_records
  set situation_enc        = app.encrypt_text(situation),
      balanced_thought_enc = app.encrypt_text(balanced_thought),
      outcome_notes_enc    = app.encrypt_text(outcome_notes),
      evidence_for_enc     = app.encrypt_text(evidence_for::text),
      evidence_against_enc = app.encrypt_text(evidence_against::text),
      nats_enc             = app.encrypt_text(nats::text)
  where situation_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.thought_records rename to thought_records_data;
alter table public.thought_records_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them).
alter table public.thought_records_data alter column situation        drop not null;
alter table public.thought_records_data alter column balanced_thought drop not null;
alter table public.thought_records_data alter column outcome_notes    drop not null;
alter table public.thought_records_data alter column evidence_for     drop not null;
alter table public.thought_records_data alter column evidence_against drop not null;
alter table public.thought_records_data alter column nats             drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.thought_records with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(situation_enc)                as situation,
         emotions,
         distortions,
         app.decrypt_text(balanced_thought_enc)         as balanced_thought,
         archived_at,
         created_at,
         updated_at,
         emotion_intensity_before,
         app.decrypt_text(evidence_for_enc)::text[]     as evidence_for,
         app.decrypt_text(evidence_against_enc)::text[] as evidence_against,
         emotion_intensity_after,
         app.decrypt_text(outcome_notes_enc)            as outcome_notes,
         app.decrypt_text(nats_enc)::jsonb              as nats
  from public.thought_records_data;

create or replace function public.thought_records_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.situation) > 4000 then
    raise exception 'thought record situation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.balanced_thought) > 4000 then
    raise exception 'thought record balanced_thought exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.outcome_notes) > 4000 then
    raise exception 'thought record outcome_notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.thought_records_data (
    id, user_id, situation_enc, emotions, distortions, balanced_thought_enc,
    archived_at, emotion_intensity_before, evidence_for_enc, evidence_against_enc,
    emotion_intensity_after, outcome_notes_enc, nats_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.situation, '')),
    coalesce(new.emotions, array[]::text[]),
    coalesce(new.distortions, array[]::text[]),
    app.encrypt_text(coalesce(new.balanced_thought, '')),
    new.archived_at,
    new.emotion_intensity_before,
    app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    new.emotion_intensity_after,
    app.encrypt_text(coalesce(new.outcome_notes, '')),
    app.encrypt_text(coalesce(new.nats, '[]'::jsonb)::text),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists thought_records_ins on public.thought_records;
create trigger thought_records_ins instead of insert on public.thought_records
  for each row execute function public.thought_records_ins();

create or replace function public.thought_records_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.situation) > 4000 then
    raise exception 'thought record situation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.balanced_thought) > 4000 then
    raise exception 'thought record balanced_thought exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.outcome_notes) > 4000 then
    raise exception 'thought record outcome_notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.thought_records_data set
    situation_enc            = app.encrypt_text(coalesce(new.situation, '')),
    emotions                 = coalesce(new.emotions, array[]::text[]),
    distortions              = coalesce(new.distortions, array[]::text[]),
    balanced_thought_enc     = app.encrypt_text(coalesce(new.balanced_thought, '')),
    archived_at              = new.archived_at,
    emotion_intensity_before = new.emotion_intensity_before,
    evidence_for_enc         = app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    evidence_against_enc     = app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    emotion_intensity_after  = new.emotion_intensity_after,
    outcome_notes_enc        = app.encrypt_text(coalesce(new.outcome_notes, '')),
    nats_enc                 = app.encrypt_text(coalesce(new.nats, '[]'::jsonb)::text),
    created_at               = new.created_at
   where id = old.id;   -- set_thought_records_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists thought_records_upd on public.thought_records;
create trigger thought_records_upd instead of update on public.thought_records
  for each row execute function public.thought_records_upd();

create or replace function public.thought_records_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.thought_records_data where id = old.id;
  return old;
end; $$;
drop trigger if exists thought_records_del on public.thought_records;
create trigger thought_records_del instead of delete on public.thought_records
  for each row execute function public.thought_records_del();

grant select, insert, update, delete on public.thought_records to authenticated;
notify pgrst, 'reload schema';

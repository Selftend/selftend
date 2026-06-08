-- Encrypt act_connection_logs free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   activity_context, notices_from_senses, notes
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id, technique (enum CHECK),
--   duration_minutes (CHECK > 0), mood_after (CHECK 1..10), created_at, updated_at.
-- NO set_act_connection_logs_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_connection_logs add column if not exists activity_context_enc    bytea;
alter table public.act_connection_logs add column if not exists notices_from_senses_enc bytea;
alter table public.act_connection_logs add column if not exists notes_enc                bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_connection_logs
  set activity_context_enc    = app.encrypt_text(activity_context),
      notices_from_senses_enc = app.encrypt_text(notices_from_senses),
      notes_enc               = app.encrypt_text(notes)
  where activity_context_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_connection_logs rename to act_connection_logs_data;
alter table public.act_connection_logs_data enable row level security;

alter table public.act_connection_logs_data alter column activity_context    drop not null;
alter table public.act_connection_logs_data alter column notices_from_senses drop not null;
alter table public.act_connection_logs_data alter column notes               drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_connection_logs with (security_invoker = true) as
  select id,
         user_id,
         technique,
         app.decrypt_text(activity_context_enc)    as activity_context,
         app.decrypt_text(notices_from_senses_enc) as notices_from_senses,
         duration_minutes,
         mood_after,
         app.decrypt_text(notes_enc)               as notes,
         created_at,
         updated_at
  from public.act_connection_logs_data;

create or replace function public.act_connection_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_connection_logs_data (
    id, user_id, technique, activity_context_enc, notices_from_senses_enc,
    duration_minutes, mood_after, notes_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    coalesce(new.technique, 'noticeFiveThings'),
    app.encrypt_text(coalesce(new.activity_context, '')),
    app.encrypt_text(coalesce(new.notices_from_senses, '')),
    new.duration_minutes,
    new.mood_after,
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, technique, created_at, updated_at
    into new.id, new.user_id, new.technique, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_connection_logs_ins on public.act_connection_logs;
create trigger act_connection_logs_ins instead of insert on public.act_connection_logs
  for each row execute function public.act_connection_logs_ins();

create or replace function public.act_connection_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_connection_logs_data set
    technique               = new.technique,
    activity_context_enc    = app.encrypt_text(coalesce(new.activity_context, '')),
    notices_from_senses_enc = app.encrypt_text(coalesce(new.notices_from_senses, '')),
    duration_minutes        = new.duration_minutes,
    mood_after              = new.mood_after,
    notes_enc               = app.encrypt_text(coalesce(new.notes, '')),
    created_at              = new.created_at,
    updated_at              = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_connection_logs_upd on public.act_connection_logs;
create trigger act_connection_logs_upd instead of update on public.act_connection_logs
  for each row execute function public.act_connection_logs_upd();

create or replace function public.act_connection_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_connection_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_connection_logs_del on public.act_connection_logs;
create trigger act_connection_logs_del instead of delete on public.act_connection_logs
  for each row execute function public.act_connection_logs_del();

grant select, insert, update, delete on public.act_connection_logs to authenticated;
notify pgrst, 'reload schema';

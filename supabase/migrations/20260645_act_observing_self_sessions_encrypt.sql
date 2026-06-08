-- Encrypt act_observing_self_sessions free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   what_was_observed, notes
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id,
--   technique_used (enum CHECK), duration_minutes (CHECK > 0), mood_after (CHECK 1..10),
--   created_at, updated_at.
-- NO set_act_observing_self_sessions_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_observing_self_sessions add column if not exists what_was_observed_enc bytea;
alter table public.act_observing_self_sessions add column if not exists notes_enc             bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_observing_self_sessions
  set what_was_observed_enc = app.encrypt_text(what_was_observed),
      notes_enc             = app.encrypt_text(notes)
  where what_was_observed_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_observing_self_sessions rename to act_observing_self_sessions_data;
alter table public.act_observing_self_sessions_data enable row level security;

alter table public.act_observing_self_sessions_data alter column what_was_observed drop not null;
alter table public.act_observing_self_sessions_data alter column notes             drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_observing_self_sessions with (security_invoker = true) as
  select id,
         user_id,
         technique_used,
         app.decrypt_text(what_was_observed_enc) as what_was_observed,
         duration_minutes,
         mood_after,
         app.decrypt_text(notes_enc)             as notes,
         created_at,
         updated_at
  from public.act_observing_self_sessions_data;

create or replace function public.act_observing_self_sessions_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_observing_self_sessions_data (
    id, user_id, technique_used, what_was_observed_enc, duration_minutes,
    mood_after, notes_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    coalesce(new.technique_used, 'tenDeepBreaths'),
    app.encrypt_text(coalesce(new.what_was_observed, '')),
    new.duration_minutes,
    new.mood_after,
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, technique_used, created_at, updated_at
    into new.id, new.user_id, new.technique_used, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_observing_self_sessions_ins on public.act_observing_self_sessions;
create trigger act_observing_self_sessions_ins instead of insert on public.act_observing_self_sessions
  for each row execute function public.act_observing_self_sessions_ins();

create or replace function public.act_observing_self_sessions_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_observing_self_sessions_data set
    technique_used        = new.technique_used,
    what_was_observed_enc = app.encrypt_text(coalesce(new.what_was_observed, '')),
    duration_minutes      = new.duration_minutes,
    mood_after            = new.mood_after,
    notes_enc             = app.encrypt_text(coalesce(new.notes, '')),
    created_at            = new.created_at,
    updated_at            = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_observing_self_sessions_upd on public.act_observing_self_sessions;
create trigger act_observing_self_sessions_upd instead of update on public.act_observing_self_sessions
  for each row execute function public.act_observing_self_sessions_upd();

create or replace function public.act_observing_self_sessions_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_observing_self_sessions_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_observing_self_sessions_del on public.act_observing_self_sessions;
create trigger act_observing_self_sessions_del instead of delete on public.act_observing_self_sessions
  for each row execute function public.act_observing_self_sessions_del();

grant select, insert, update, delete on public.act_observing_self_sessions to authenticated;
notify pgrst, 'reload schema';

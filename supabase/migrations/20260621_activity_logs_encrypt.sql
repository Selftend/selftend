-- Encrypt activity_logs free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL):
--   activity_name (cap 300)
--   notes         (cap 2000)
-- PASS-THROUGH: id, user_id, category ('pleasure'/'mastery'), scheduled_at, completed_at,
--   mood_before (1..5), mood_after (1..5), pace_category, created_at, updated_at.
-- The activity_name_len / notes_len CHECK constraints (NOT VALID) reference these columns and
--   die when plaintext drops -> caps moved into the triggers.
-- set_activity_logs_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
--   fires it.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.activity_logs add column if not exists activity_name_enc bytea;
alter table public.activity_logs add column if not exists notes_enc         bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.activity_logs
  set activity_name_enc = app.encrypt_text(activity_name),
      notes_enc         = app.encrypt_text(notes)
  where activity_name_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.activity_logs rename to activity_logs_data;
alter table public.activity_logs_data enable row level security;

alter table public.activity_logs_data alter column activity_name drop not null;
alter table public.activity_logs_data alter column notes         drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.activity_logs with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(activity_name_enc) as activity_name,
         category,
         scheduled_at,
         completed_at,
         mood_before,
         mood_after,
         app.decrypt_text(notes_enc) as notes,
         created_at,
         updated_at,
         pace_category
  from public.activity_logs_data;

create or replace function public.activity_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.activity_name) > 300 then
    raise exception 'activity_logs activity_name exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.notes) > 2000 then
    raise exception 'activity_logs notes exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  insert into public.activity_logs_data (
    id, user_id, activity_name_enc, category, scheduled_at, completed_at,
    mood_before, mood_after, notes_enc, pace_category, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.activity_name, '')),
    new.category, new.scheduled_at, new.completed_at,
    new.mood_before, new.mood_after,
    app.encrypt_text(coalesce(new.notes, '')),
    new.pace_category,
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists activity_logs_ins on public.activity_logs;
create trigger activity_logs_ins instead of insert on public.activity_logs
  for each row execute function public.activity_logs_ins();

create or replace function public.activity_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.activity_name) > 300 then
    raise exception 'activity_logs activity_name exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.notes) > 2000 then
    raise exception 'activity_logs notes exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.activity_logs_data set
    activity_name_enc = app.encrypt_text(coalesce(new.activity_name, '')),
    category          = new.category,
    scheduled_at      = new.scheduled_at,
    completed_at      = new.completed_at,
    mood_before       = new.mood_before,
    mood_after        = new.mood_after,
    notes_enc         = app.encrypt_text(coalesce(new.notes, '')),
    pace_category     = new.pace_category,
    created_at        = new.created_at
   where id = old.id;   -- set_activity_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists activity_logs_upd on public.activity_logs;
create trigger activity_logs_upd instead of update on public.activity_logs
  for each row execute function public.activity_logs_upd();

create or replace function public.activity_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.activity_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists activity_logs_del on public.activity_logs;
create trigger activity_logs_del instead of delete on public.activity_logs
  for each row execute function public.activity_logs_del();

grant select, insert, update, delete on public.activity_logs to authenticated;
notify pgrst, 'reload schema';

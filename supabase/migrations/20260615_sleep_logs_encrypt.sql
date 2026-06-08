-- Encrypt sleep_logs.notes at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT: notes (text, NOT NULL, no length cap).
-- PASS-THROUGH: id, user_id, duration_minutes, quality (1..5), logged_at, created_at, updated_at.
-- set_sleep_logs_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.sleep_logs add column if not exists notes_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.sleep_logs
  set notes_enc = app.encrypt_text(notes)
  where notes_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.sleep_logs rename to sleep_logs_data;
alter table public.sleep_logs_data enable row level security;

alter table public.sleep_logs_data alter column notes drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.sleep_logs with (security_invoker = true) as
  select id,
         user_id,
         duration_minutes,
         quality,
         app.decrypt_text(notes_enc) as notes,
         logged_at,
         created_at,
         updated_at
  from public.sleep_logs_data;

create or replace function public.sleep_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.sleep_logs_data (
    id, user_id, duration_minutes, quality, notes_enc, logged_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.duration_minutes, new.quality,
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.logged_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now()))
  returning id, user_id, logged_at, created_at, updated_at
    into new.id, new.user_id, new.logged_at, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists sleep_logs_ins on public.sleep_logs;
create trigger sleep_logs_ins instead of insert on public.sleep_logs
  for each row execute function public.sleep_logs_ins();

create or replace function public.sleep_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.sleep_logs_data set
    duration_minutes = new.duration_minutes,
    quality          = new.quality,
    notes_enc        = app.encrypt_text(coalesce(new.notes, '')),
    logged_at        = new.logged_at,
    created_at       = new.created_at
   where id = old.id;   -- set_sleep_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists sleep_logs_upd on public.sleep_logs;
create trigger sleep_logs_upd instead of update on public.sleep_logs
  for each row execute function public.sleep_logs_upd();

create or replace function public.sleep_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.sleep_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists sleep_logs_del on public.sleep_logs;
create trigger sleep_logs_del instead of delete on public.sleep_logs
  for each row execute function public.sleep_logs_del();

grant select, insert, update, delete on public.sleep_logs to authenticated;
notify pgrst, 'reload schema';

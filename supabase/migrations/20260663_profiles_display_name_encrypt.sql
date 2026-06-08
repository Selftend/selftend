-- Encrypt profiles.display_name at rest — the final encryption gap. Same pattern as the rest of
-- Phase 2 (bytea ciphertext column + transparent same-named decrypting view + INSTEAD OF triggers).
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) is global
-- from Phase 1.
--
-- ENCRYPT: display_name only (text, nullable, cap 100 via the profiles_display_name_len CHECK).
-- PASS-THROUGH (plaintext, stay on the base table): user_id (PK), email (synced from auth.users —
--   PLAINTEXT per Task 1), avatar_url, avatar_storage_path, avatar_source, avatar_updated_at,
--   created_at, updated_at.
-- PRIMARY KEY is user_id (NOT id) — this table has no `id` column. The INSTEAD OF upd/del triggers
--   key on old.user_id; the view exposes user_id as its identity.
-- UPSERT TABLE: profiles is a per-user singleton (PK user_id). The repository previously used
--   PostgREST upsert(onConflict:'user_id'); a view cannot be the target of INSERT ... ON CONFLICT,
--   so the (user_id) merge is resolved inside the INSTEAD OF INSERT trigger against the base table's
--   real primary key, and the repository now writes COMPLETE rows via .insert() (read-modify-write).
-- TRIGGER: set_profiles_updated_at (BEFORE UPDATE) travels with the rename onto profiles_data and
--   fires on the inner UPDATE; the INSTEAD OF UPDATE trigger captures the freshly-advanced
--   updated_at via RETURNING ... INTO (per 20260662). On INSERT the row's defaults set updated_at.
-- CHECK: profiles_avatar_source_check stays on the base table. profiles_display_name_len (cap 100)
--   moves into the triggers as a char_length guard (the plaintext column is dropped in 20260664).
-- RLS: profiles_select_own / profiles_insert_own / profiles_update_own travel with the rename.
-- export_user_data / delete_user_account reference public.profiles by name → keep working through
--   the same-named view (export reads email/created_at/updated_at; delete deletes via the view).

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.profiles add column if not exists display_name_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (NULL display_name -> NULL ciphertext,
-- which round-trips back to NULL on read, preserving the "no name set" state).
update public.profiles
   set display_name_enc = app.encrypt_text(display_name)
 where display_name_enc is null
   and display_name is not null;

-- Step C: swap to a transparent encrypted view (same name, so PostgREST callers are untouched).
alter table public.profiles rename to profiles_data;
alter table public.profiles_data enable row level security;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.profiles with (security_invoker = true) as
  select user_id,
         email,
         app.decrypt_text(display_name_enc) as display_name,
         avatar_url,
         avatar_storage_path,
         avatar_source,
         avatar_updated_at,
         created_at,
         updated_at
  from public.profiles_data;

create or replace function public.profiles_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.display_name) > 100 then
    raise exception 'profiles display_name exceeds 100 characters' using errcode = 'check_violation';
  end if;
  -- profiles is a per-user singleton (PK user_id). A view cannot be the target of
  -- INSERT ... ON CONFLICT (PostgREST upsert), so the client inserts a COMPLETE row and the
  -- per-user merge is resolved here against the real primary key. The repository now writes
  -- every mutable column explicitly (read-modify-write), so this DO UPDATE is unambiguous:
  -- a value is "preserved" by being re-sent and "cleared" by being sent as NULL — no coalesce.
  insert into public.profiles_data (
    user_id, email, display_name_enc, avatar_url, avatar_storage_path,
    avatar_source, avatar_updated_at, created_at, updated_at)
  values (
    coalesce(new.user_id, auth.uid()),
    new.email,
    app.encrypt_text(new.display_name),
    new.avatar_url,
    new.avatar_storage_path,
    new.avatar_source,
    new.avatar_updated_at,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  on conflict (user_id) do update set
    email               = excluded.email,
    display_name_enc    = excluded.display_name_enc,
    avatar_url          = excluded.avatar_url,
    avatar_storage_path = excluded.avatar_storage_path,
    avatar_source       = excluded.avatar_source,
    avatar_updated_at   = excluded.avatar_updated_at,
    updated_at          = timezone('utc', now())
  returning user_id, created_at, updated_at
    into new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists profiles_ins on public.profiles;
create trigger profiles_ins instead of insert on public.profiles
  for each row execute function public.profiles_ins();

create or replace function public.profiles_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.display_name) > 100 then
    raise exception 'profiles display_name exceeds 100 characters' using errcode = 'check_violation';
  end if;
  update public.profiles_data set
    email               = new.email,
    display_name_enc    = app.encrypt_text(new.display_name),
    avatar_url          = new.avatar_url,
    avatar_storage_path = new.avatar_storage_path,
    avatar_source       = new.avatar_source,
    avatar_updated_at   = new.avatar_updated_at,
    created_at          = new.created_at
   where user_id = old.user_id   -- set_profiles_updated_at BEFORE-UPDATE trigger refreshes updated_at
   returning updated_at, created_at into new.updated_at, new.created_at;
  return new;
end; $$;
drop trigger if exists profiles_upd on public.profiles;
create trigger profiles_upd instead of update on public.profiles
  for each row execute function public.profiles_upd();

create or replace function public.profiles_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.profiles_data where user_id = old.user_id;
  return old;
end; $$;
drop trigger if exists profiles_del on public.profiles;
create trigger profiles_del instead of delete on public.profiles
  for each row execute function public.profiles_del();

grant select, insert, update, delete on public.profiles to authenticated;
notify pgrst, 'reload schema';

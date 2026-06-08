-- Encrypt exposure_items free-text at rest: description.
-- Same pattern as the journal pilot (20260587). Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- ENCRYPT:
--   description (text, NOT NULL, cap 2000)
-- PASS-THROUGH: id, hierarchy_id (FK -> exposure_hierarchies_data), user_id, suds_rating
--   (int, CHECK 0..100 stays on the base table), completed_at, created_at, updated_at.
-- FK ordering: parent exposure_hierarchies already encrypted (20260599). exposure_sessions FKs
-- THIS table (child) and is encrypted next. FKs follow the rename to exposure_items_data by OID.
-- set_exposure_items_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.exposure_items add column if not exists description_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.exposure_items
  set description_enc = app.encrypt_text(description)
  where description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.exposure_items rename to exposure_items_data;
alter table public.exposure_items_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext column (triggers don't populate it).
alter table public.exposure_items_data alter column description drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.exposure_items with (security_invoker = true) as
  select id,
         hierarchy_id,
         user_id,
         app.decrypt_text(description_enc) as description,
         suds_rating,
         completed_at,
         created_at,
         updated_at
  from public.exposure_items_data;

create or replace function public.exposure_items_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.description) > 2000 then
    raise exception 'exposure item description exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  insert into public.exposure_items_data (
    id, hierarchy_id, user_id, description_enc, suds_rating, completed_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), new.hierarchy_id, coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.description, '')),
    new.suds_rating,
    new.completed_at,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists exposure_items_ins on public.exposure_items;
create trigger exposure_items_ins instead of insert on public.exposure_items
  for each row execute function public.exposure_items_ins();

create or replace function public.exposure_items_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.description) > 2000 then
    raise exception 'exposure item description exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.exposure_items_data set
    hierarchy_id    = new.hierarchy_id,
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    suds_rating     = new.suds_rating,
    completed_at    = new.completed_at,
    created_at      = new.created_at
   where id = old.id;   -- set_exposure_items_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists exposure_items_upd on public.exposure_items;
create trigger exposure_items_upd instead of update on public.exposure_items
  for each row execute function public.exposure_items_upd();

create or replace function public.exposure_items_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.exposure_items_data where id = old.id;
  return old;
end; $$;
drop trigger if exists exposure_items_del on public.exposure_items;
create trigger exposure_items_del instead of delete on public.exposure_items
  for each row execute function public.exposure_items_del();

grant select, insert, update, delete on public.exposure_items to authenticated;
notify pgrst, 'reload schema';

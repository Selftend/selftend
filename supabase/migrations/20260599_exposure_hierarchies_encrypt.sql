-- Encrypt exposure_hierarchies free-text at rest: title, anxiety_type.
-- Same pattern as the journal pilot (20260587): bytea ciphertext columns + a transparent
-- same-named decrypting view + INSTEAD OF triggers. Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- ENCRYPT:
--   title        (text, NOT NULL, cap 300)
--   anxiety_type (text, NOT NULL, no cap)
-- PASS-THROUGH: id, user_id, created_at, updated_at.
-- This is a PARENT table (exposure_items.hierarchy_id FKs it) — encrypted before its children.
-- The FK is by OID and follows the rename to exposure_hierarchies_data automatically.
-- set_exposure_hierarchies_updated_at BEFORE-UPDATE trigger travels with the rename; the inner
-- update fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.exposure_hierarchies add column if not exists title_enc        bytea;
alter table public.exposure_hierarchies add column if not exists anxiety_type_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.exposure_hierarchies
  set title_enc        = app.encrypt_text(title),
      anxiety_type_enc = app.encrypt_text(anxiety_type)
  where title_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.exposure_hierarchies rename to exposure_hierarchies_data;
alter table public.exposure_hierarchies_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them).
alter table public.exposure_hierarchies_data alter column title        drop not null;
alter table public.exposure_hierarchies_data alter column anxiety_type drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.exposure_hierarchies with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(title_enc)        as title,
         app.decrypt_text(anxiety_type_enc) as anxiety_type,
         created_at,
         updated_at
  from public.exposure_hierarchies_data;

create or replace function public.exposure_hierarchies_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.title) > 300 then
    raise exception 'exposure hierarchy title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  insert into public.exposure_hierarchies_data (
    id, user_id, title_enc, anxiety_type_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.title, '')),
    app.encrypt_text(coalesce(new.anxiety_type, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists exposure_hierarchies_ins on public.exposure_hierarchies;
create trigger exposure_hierarchies_ins instead of insert on public.exposure_hierarchies
  for each row execute function public.exposure_hierarchies_ins();

create or replace function public.exposure_hierarchies_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.title) > 300 then
    raise exception 'exposure hierarchy title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  update public.exposure_hierarchies_data set
    title_enc        = app.encrypt_text(coalesce(new.title, '')),
    anxiety_type_enc = app.encrypt_text(coalesce(new.anxiety_type, '')),
    created_at       = new.created_at
   where id = old.id;   -- set_exposure_hierarchies_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists exposure_hierarchies_upd on public.exposure_hierarchies;
create trigger exposure_hierarchies_upd instead of update on public.exposure_hierarchies
  for each row execute function public.exposure_hierarchies_upd();

create or replace function public.exposure_hierarchies_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.exposure_hierarchies_data where id = old.id;
  return old;
end; $$;
drop trigger if exists exposure_hierarchies_del on public.exposure_hierarchies;
create trigger exposure_hierarchies_del instead of delete on public.exposure_hierarchies
  for each row execute function public.exposure_hierarchies_del();

grant select, insert, update, delete on public.exposure_hierarchies to authenticated;
notify pgrst, 'reload schema';

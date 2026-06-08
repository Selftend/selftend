-- Encrypt values_profile free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (both jsonb, NOT NULL) — whole-blob via ::text on write / ::jsonb on read:
--   personal_values   (jsonb: [{key,tier}, ...])
--   priority_values   (jsonb: ["key", ...])
-- PASS-THROUGH: id, user_id, created_at, updated_at.
-- UPSERT TABLE: values_profile is a per-user singleton with UNIQUE (user_id). The client used
--   PostgREST upsert(onConflict:'user_id'). A view cannot be the target of INSERT ... ON CONFLICT,
--   so the (user_id) merge is resolved inside the INSTEAD OF INSERT trigger against the base
--   table's real unique constraint, and the repository switches .upsert() -> .insert()
--   (saveValuesProfile semantics preserved).
-- NO DELETE RLS policy: values_profile has only INSERT/SELECT/UPDATE policies (verified in
--   pg_policies). The client never deletes the profile. The INSTEAD OF delete trigger is still
--   created for the service-role cleanup path; a regular user DELETE through the view stays an
--   RLS no-op (pre-existing behavior, intentionally preserved).
-- set_values_profile_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
--   fires it.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.values_profile add column if not exists personal_values_enc bytea;
alter table public.values_profile add column if not exists priority_values_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (cast jsonb to text first).
update public.values_profile
  set personal_values_enc = app.encrypt_text(personal_values::text),
      priority_values_enc = app.encrypt_text(priority_values::text)
  where personal_values_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.values_profile rename to values_profile_data;
alter table public.values_profile_data enable row level security;

alter table public.values_profile_data alter column personal_values drop not null;
alter table public.values_profile_data alter column priority_values drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.values_profile with (security_invoker = true) as
  select id,
         user_id,
         created_at,
         updated_at,
         app.decrypt_text(priority_values_enc)::jsonb as priority_values,
         app.decrypt_text(personal_values_enc)::jsonb as personal_values
  from public.values_profile_data;

create or replace function public.values_profile_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- The base table keeps its UNIQUE (user_id). A view cannot be the target of
  -- INSERT ... ON CONFLICT (PostgREST upsert), so the client inserts plainly and the per-user
  -- merge is resolved here against the real constraint (saveValuesProfile semantics preserved).
  insert into public.values_profile_data (
    id, user_id, personal_values_enc, priority_values_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.personal_values, '[]'::jsonb)::text),
    app.encrypt_text(coalesce(new.priority_values, '[]'::jsonb)::text),
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  on conflict (user_id) do update set
    personal_values_enc = excluded.personal_values_enc,
    priority_values_enc = excluded.priority_values_enc,
    updated_at          = timezone('utc', now())
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists values_profile_ins on public.values_profile;
create trigger values_profile_ins instead of insert on public.values_profile
  for each row execute function public.values_profile_ins();

create or replace function public.values_profile_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.values_profile_data set
    personal_values_enc = app.encrypt_text(coalesce(new.personal_values, '[]'::jsonb)::text),
    priority_values_enc = app.encrypt_text(coalesce(new.priority_values, '[]'::jsonb)::text),
    created_at          = new.created_at
   where id = old.id;   -- set_values_profile_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists values_profile_upd on public.values_profile;
create trigger values_profile_upd instead of update on public.values_profile
  for each row execute function public.values_profile_upd();

create or replace function public.values_profile_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.values_profile_data where id = old.id;
  return old;
end; $$;
drop trigger if exists values_profile_del on public.values_profile;
create trigger values_profile_del instead of delete on public.values_profile
  for each row execute function public.values_profile_del();

grant select, insert, update, delete on public.values_profile to authenticated;
notify pgrst, 'reload schema';

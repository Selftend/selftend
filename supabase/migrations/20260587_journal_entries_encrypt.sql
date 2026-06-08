-- Prerequisite (discovered via spike): authenticated needs USAGE on schema app to call
-- the SECURITY DEFINER crypto helpers directly (the decrypting view runs as the invoker).
-- EXECUTE on the functions alone is insufficient without schema USAGE.
grant usage on schema app to authenticated;

-- service_role operates on the same `journal_entries` view (admin/support/cleanup paths, e.g.
-- the integration harness). Because the view is security_invoker, a service-role read runs
-- decrypt_text as service_role, and a write runs encrypt_text — so it needs the same access.
grant usage on schema app to service_role;
grant execute on function app.encrypt_text(text)  to service_role;
grant execute on function app.decrypt_text(bytea) to service_role;

-- Encrypt journal_entries.title and journal_entries.body at rest.
-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.journal_entries add column if not exists title_enc bytea;
alter table public.journal_entries add column if not exists body_enc  bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.journal_entries
  set title_enc = app.encrypt_text(title),
      body_enc  = app.encrypt_text(body)
  where title_enc is null and body_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.journal_entries rename to journal_entries_data;
alter table public.journal_entries_data enable row level security;

-- Plaintext columns are superseded by *_enc + the view; relax NOT NULL so the encrypt-only
-- INSTEAD OF triggers don't populate them. They are dropped entirely in Task 7.
alter table public.journal_entries_data alter column title drop not null;
alter table public.journal_entries_data alter column body  drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.journal_entries with (security_invoker = true) as
  select id, user_id,
         app.decrypt_text(title_enc) as title,
         app.decrypt_text(body_enc)  as body,
         created_at, updated_at
  from public.journal_entries_data;

create or replace function public.journal_entries_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- The body-not-blank guard moved off the (now-NULL) plaintext column onto the plaintext input.
  if new.body is null or length(btrim(new.body)) = 0 then
    raise exception 'journal entry body must not be blank'
      using errcode = 'check_violation';
  end if;
  if char_length(new.title) > 300 then
    raise exception 'journal entry title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.body) > 20000 then
    raise exception 'journal entry body exceeds 20000 characters' using errcode = 'check_violation';
  end if;
  insert into public.journal_entries_data (id, user_id, title_enc, body_enc, created_at, updated_at)
  values (coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
          app.encrypt_text(new.title), app.encrypt_text(new.body),
          coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists journal_entries_ins on public.journal_entries;
create trigger journal_entries_ins instead of insert on public.journal_entries
  for each row execute function public.journal_entries_ins();

create or replace function public.journal_entries_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if new.body is null or length(btrim(new.body)) = 0 then
    raise exception 'journal entry body must not be blank'
      using errcode = 'check_violation';
  end if;
  if char_length(new.title) > 300 then
    raise exception 'journal entry title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.body) > 20000 then
    raise exception 'journal entry body exceeds 20000 characters' using errcode = 'check_violation';
  end if;
  update public.journal_entries_data
     set title_enc = app.encrypt_text(new.title),
         body_enc  = app.encrypt_text(new.body),
         created_at = new.created_at
   where id = old.id;   -- set_journal_entries_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists journal_entries_upd on public.journal_entries;
create trigger journal_entries_upd instead of update on public.journal_entries
  for each row execute function public.journal_entries_upd();

create or replace function public.journal_entries_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.journal_entries_data where id = old.id;
  return old;
end; $$;
drop trigger if exists journal_entries_del on public.journal_entries;
create trigger journal_entries_del instead of delete on public.journal_entries
  for each row execute function public.journal_entries_del();

grant select, insert, update, delete on public.journal_entries to authenticated;
notify pgrst, 'reload schema';

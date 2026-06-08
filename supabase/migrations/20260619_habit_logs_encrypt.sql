-- Encrypt habit_logs.note at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT: note (text, NOT NULL, cap 500).
-- PASS-THROUGH: id, user_id, habit_id (FK -> habits_data.id, ON DELETE CASCADE), logged_on (date),
--   created_at, updated_at.
-- FK CHILD of habits: habits was encrypted first (20260617); habit_logs_habit_id_fkey already
--   points at habits_data and follows this rename onto habit_logs_data automatically.
-- habit_logs_note_length CHECK dies when plaintext drops -> cap moved into the triggers.
-- set_habit_logs_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update fires it.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.habit_logs add column if not exists note_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.habit_logs
  set note_enc = app.encrypt_text(note)
  where note_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.habit_logs rename to habit_logs_data;
alter table public.habit_logs_data enable row level security;

alter table public.habit_logs_data alter column note drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.habit_logs with (security_invoker = true) as
  select id,
         user_id,
         habit_id,
         logged_on,
         app.decrypt_text(note_enc) as note,
         created_at,
         updated_at
  from public.habit_logs_data;

create or replace function public.habit_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.note) > 500 then
    raise exception 'habit log note exceeds 500 characters' using errcode = 'check_violation';
  end if;
  -- The base table keeps its UNIQUE (habit_id, logged_on) index. A view cannot be the target of
  -- INSERT ... ON CONFLICT (PostgREST upsert), so the client inserts plainly and the merge is
  -- resolved here against the real constraint (upsertHabitLogNote semantics preserved).
  insert into public.habit_logs_data (
    id, user_id, habit_id, logged_on, note_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.habit_id, new.logged_on,
    app.encrypt_text(coalesce(new.note, '')),
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  on conflict (habit_id, logged_on) do update set
    note_enc   = excluded.note_enc,
    updated_at = timezone('utc', now())
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists habit_logs_ins on public.habit_logs;
create trigger habit_logs_ins instead of insert on public.habit_logs
  for each row execute function public.habit_logs_ins();

create or replace function public.habit_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.note) > 500 then
    raise exception 'habit log note exceeds 500 characters' using errcode = 'check_violation';
  end if;
  update public.habit_logs_data set
    habit_id   = new.habit_id,
    logged_on  = new.logged_on,
    note_enc   = app.encrypt_text(coalesce(new.note, '')),
    created_at = new.created_at
   where id = old.id;   -- set_habit_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists habit_logs_upd on public.habit_logs;
create trigger habit_logs_upd instead of update on public.habit_logs
  for each row execute function public.habit_logs_upd();

create or replace function public.habit_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.habit_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists habit_logs_del on public.habit_logs;
create trigger habit_logs_del instead of delete on public.habit_logs
  for each row execute function public.habit_logs_del();

grant select, insert, update, delete on public.habit_logs to authenticated;
notify pgrst, 'reload schema';

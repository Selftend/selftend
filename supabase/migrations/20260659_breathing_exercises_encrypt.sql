-- Encrypt breathing_exercises free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (text, NOT NULL):
--   name  (cap 80, not-blank — the only user-typed free-text column)
-- PASS-THROUGH: id, user_id, inhale_seconds, hold_in_seconds, exhale_seconds, hold_out_seconds,
--   cycles, color, created_at, updated_at. (color is a short palette slug, not free text.)
-- NO UPSERT: the repository uses plain .insert()/.update()/.delete() keyed on (user_id, id);
--   there is no UNIQUE beyond the id PK, so the INSTEAD OF INSERT trigger inserts plainly.
-- The breathing_exercises_name_length / _name_not_blank CHECK constraints reference name and die
--   when plaintext drops, so they are reproduced in the INSTEAD OF triggers. The numeric/cycle/
--   active-phase/color CHECKs are on pass-through columns and stay on the base table.
-- set_breathing_exercises_updated_at BEFORE-UPDATE trigger travels with the rename; the inner
--   update fires it.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.breathing_exercises add column if not exists name_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.breathing_exercises
  set name_enc = app.encrypt_text(name)
  where name_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.breathing_exercises rename to breathing_exercises_data;
alter table public.breathing_exercises_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext column (triggers don't populate it).
alter table public.breathing_exercises_data alter column name drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.breathing_exercises with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(name_enc) as name,
         inhale_seconds,
         hold_in_seconds,
         exhale_seconds,
         hold_out_seconds,
         cycles,
         color,
         created_at,
         updated_at
  from public.breathing_exercises_data;

create or replace function public.breathing_exercises_guard(p_name text) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'breathing exercise name must not be blank' using errcode='check_violation';
  end if;
  if length(p_name) > 80 then
    raise exception 'breathing exercise name exceeds 80 characters' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.breathing_exercises_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.breathing_exercises_guard(new.name);
  insert into public.breathing_exercises_data (
    id, user_id, name_enc, inhale_seconds, hold_in_seconds, exhale_seconds, hold_out_seconds,
    cycles, color, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.name),
    coalesce(new.inhale_seconds, 0), coalesce(new.hold_in_seconds, 0),
    coalesce(new.exhale_seconds, 0), coalesce(new.hold_out_seconds, 0),
    coalesce(new.cycles, 6), coalesce(new.color, 'aqua'),
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists breathing_exercises_ins on public.breathing_exercises;
create trigger breathing_exercises_ins instead of insert on public.breathing_exercises
  for each row execute function public.breathing_exercises_ins();

create or replace function public.breathing_exercises_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.breathing_exercises_guard(new.name);
  update public.breathing_exercises_data set
    name_enc         = app.encrypt_text(new.name),
    inhale_seconds   = new.inhale_seconds,
    hold_in_seconds  = new.hold_in_seconds,
    exhale_seconds   = new.exhale_seconds,
    hold_out_seconds = new.hold_out_seconds,
    cycles           = new.cycles,
    color            = new.color,
    created_at       = new.created_at
   where id = old.id;   -- set_breathing_exercises_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists breathing_exercises_upd on public.breathing_exercises;
create trigger breathing_exercises_upd instead of update on public.breathing_exercises
  for each row execute function public.breathing_exercises_upd();

create or replace function public.breathing_exercises_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.breathing_exercises_data where id = old.id;
  return old;
end; $$;
drop trigger if exists breathing_exercises_del on public.breathing_exercises;
create trigger breathing_exercises_del instead of delete on public.breathing_exercises
  for each row execute function public.breathing_exercises_del();

grant select, insert, update, delete on public.breathing_exercises to authenticated;
notify pgrst, 'reload schema';

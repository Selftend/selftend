-- Encrypt habits free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text):
--   name               (cap 120, not-blank)
--   identity           (cap 200)
--   cue_plan           (cap 240)
--   stack_after        (cap 120)
--   craving_pairing    (cap 240)
--   two_minute_version (cap 200)
--   reward_note        (cap 200)
-- PASS-THROUGH: id, user_id, kind ('build'/'break'), cadence, custom_days (smallint[]),
--   color, archived_at, created_at, updated_at.
-- FK PARENT of habit_logs (habit_logs_habit_id_fkey) — encrypt habits BEFORE habit_logs; the FK
--   is by OID and follows the rename onto habits_data automatically (verify after).
-- The *_length / name_not_blank CHECK constraints reference these columns and die when plaintext
--   drops, so they are reproduced in the INSTEAD OF triggers. Constraints on pass-through columns
--   (kind, cadence, custom_days, color) stay on the base table.
-- set_habits_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update fires it.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.habits add column if not exists name_enc               bytea;
alter table public.habits add column if not exists identity_enc           bytea;
alter table public.habits add column if not exists cue_plan_enc           bytea;
alter table public.habits add column if not exists stack_after_enc        bytea;
alter table public.habits add column if not exists craving_pairing_enc    bytea;
alter table public.habits add column if not exists two_minute_version_enc bytea;
alter table public.habits add column if not exists reward_note_enc        bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.habits
  set name_enc               = app.encrypt_text(name),
      identity_enc           = app.encrypt_text(identity),
      cue_plan_enc           = app.encrypt_text(cue_plan),
      stack_after_enc        = app.encrypt_text(stack_after),
      craving_pairing_enc    = app.encrypt_text(craving_pairing),
      two_minute_version_enc = app.encrypt_text(two_minute_version),
      reward_note_enc        = app.encrypt_text(reward_note)
  where name_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.habits rename to habits_data;
alter table public.habits_data enable row level security;

alter table public.habits_data alter column name               drop not null;
alter table public.habits_data alter column identity           drop not null;
alter table public.habits_data alter column cue_plan           drop not null;
alter table public.habits_data alter column stack_after        drop not null;
alter table public.habits_data alter column craving_pairing    drop not null;
alter table public.habits_data alter column two_minute_version drop not null;
alter table public.habits_data alter column reward_note        drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.habits with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(name_enc)               as name,
         kind,
         app.decrypt_text(identity_enc)           as identity,
         app.decrypt_text(cue_plan_enc)           as cue_plan,
         app.decrypt_text(stack_after_enc)        as stack_after,
         app.decrypt_text(craving_pairing_enc)    as craving_pairing,
         app.decrypt_text(two_minute_version_enc) as two_minute_version,
         app.decrypt_text(reward_note_enc)        as reward_note,
         cadence,
         custom_days,
         color,
         archived_at,
         created_at,
         updated_at
  from public.habits_data;

create or replace function public.habits_guard(
  p_name text, p_identity text, p_cue_plan text, p_stack_after text,
  p_craving_pairing text, p_two_minute_version text, p_reward_note text
) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'habit name must not be blank' using errcode='check_violation';
  end if;
  if char_length(p_name) > 120 then raise exception 'habit name exceeds 120 characters' using errcode='check_violation'; end if;
  if char_length(p_identity) > 200 then raise exception 'habit identity exceeds 200 characters' using errcode='check_violation'; end if;
  if char_length(p_cue_plan) > 240 then raise exception 'habit cue_plan exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_stack_after) > 120 then raise exception 'habit stack_after exceeds 120 characters' using errcode='check_violation'; end if;
  if char_length(p_craving_pairing) > 240 then raise exception 'habit craving_pairing exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_two_minute_version) > 200 then raise exception 'habit two_minute_version exceeds 200 characters' using errcode='check_violation'; end if;
  if char_length(p_reward_note) > 200 then raise exception 'habit reward_note exceeds 200 characters' using errcode='check_violation'; end if;
end; $$;

create or replace function public.habits_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.habits_guard(new.name, new.identity, new.cue_plan, new.stack_after,
                              new.craving_pairing, new.two_minute_version, new.reward_note);
  insert into public.habits_data (
    id, user_id, name_enc, kind, identity_enc, cue_plan_enc, stack_after_enc,
    craving_pairing_enc, two_minute_version_enc, reward_note_enc,
    cadence, custom_days, color, archived_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.name), coalesce(new.kind, 'build'),
    app.encrypt_text(coalesce(new.identity, '')),
    app.encrypt_text(coalesce(new.cue_plan, '')),
    app.encrypt_text(coalesce(new.stack_after, '')),
    app.encrypt_text(coalesce(new.craving_pairing, '')),
    app.encrypt_text(coalesce(new.two_minute_version, '')),
    app.encrypt_text(coalesce(new.reward_note, '')),
    coalesce(new.cadence, 'daily'), coalesce(new.custom_days, array[]::smallint[]),
    coalesce(new.color, 'primary'), new.archived_at,
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists habits_ins on public.habits;
create trigger habits_ins instead of insert on public.habits
  for each row execute function public.habits_ins();

create or replace function public.habits_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.habits_guard(new.name, new.identity, new.cue_plan, new.stack_after,
                              new.craving_pairing, new.two_minute_version, new.reward_note);
  update public.habits_data set
    name_enc               = app.encrypt_text(new.name),
    kind                   = new.kind,
    identity_enc           = app.encrypt_text(coalesce(new.identity, '')),
    cue_plan_enc           = app.encrypt_text(coalesce(new.cue_plan, '')),
    stack_after_enc        = app.encrypt_text(coalesce(new.stack_after, '')),
    craving_pairing_enc    = app.encrypt_text(coalesce(new.craving_pairing, '')),
    two_minute_version_enc = app.encrypt_text(coalesce(new.two_minute_version, '')),
    reward_note_enc        = app.encrypt_text(coalesce(new.reward_note, '')),
    cadence                = new.cadence,
    custom_days            = coalesce(new.custom_days, array[]::smallint[]),
    color                  = new.color,
    archived_at            = new.archived_at,
    created_at             = new.created_at
   where id = old.id;   -- set_habits_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists habits_upd on public.habits;
create trigger habits_upd instead of update on public.habits
  for each row execute function public.habits_upd();

create or replace function public.habits_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.habits_data where id = old.id;
  return old;
end; $$;
drop trigger if exists habits_del on public.habits;
create trigger habits_del instead of delete on public.habits
  for each row execute function public.habits_del();

grant select, insert, update, delete on public.habits to authenticated;
notify pgrst, 'reload schema';

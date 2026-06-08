-- Encrypt self_care_logs free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL):
--   exercise_type
--   social_notes        (cap 2000)
--   meaningful_activity
-- PASS-THROUGH: id, user_id, log_date (date), exercise_done (bool), exercise_minutes,
--   meals_structured (1..5), emotional_eating (bool), social_connection_made (bool),
--   created_at, updated_at.
-- NOTE (preflight deviation): self_care_logs has only INSERT/SELECT/UPDATE RLS policies and NO
--   DELETE policy (verified in pg_policies). The client never deletes self_care_logs. The
--   INSTEAD OF delete trigger is still created for consistency + the service-role cleanup path,
--   but a regular authenticated user's DELETE through the view remains a no-op (RLS-blocked) —
--   pre-existing behavior, intentionally preserved.
-- The social_notes_len CHECK (NOT VALID) references social_notes and dies when plaintext drops
--   -> cap moved into the triggers.
-- set_self_care_logs_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
--   fires it.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.self_care_logs add column if not exists exercise_type_enc       bytea;
alter table public.self_care_logs add column if not exists social_notes_enc        bytea;
alter table public.self_care_logs add column if not exists meaningful_activity_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.self_care_logs
  set exercise_type_enc       = app.encrypt_text(exercise_type),
      social_notes_enc        = app.encrypt_text(social_notes),
      meaningful_activity_enc = app.encrypt_text(meaningful_activity)
  where exercise_type_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.self_care_logs rename to self_care_logs_data;
alter table public.self_care_logs_data enable row level security;

alter table public.self_care_logs_data alter column exercise_type       drop not null;
alter table public.self_care_logs_data alter column social_notes        drop not null;
alter table public.self_care_logs_data alter column meaningful_activity drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.self_care_logs with (security_invoker = true) as
  select id,
         user_id,
         log_date,
         exercise_done,
         exercise_minutes,
         app.decrypt_text(exercise_type_enc)       as exercise_type,
         meals_structured,
         emotional_eating,
         social_connection_made,
         app.decrypt_text(social_notes_enc)        as social_notes,
         app.decrypt_text(meaningful_activity_enc) as meaningful_activity,
         created_at,
         updated_at
  from public.self_care_logs_data;

create or replace function public.self_care_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.social_notes) > 2000 then
    raise exception 'self_care_logs social_notes exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  -- The base table keeps its UNIQUE (user_id, log_date). A view cannot be the target of
  -- INSERT ... ON CONFLICT (PostgREST upsert), so the client inserts plainly and the merge is
  -- resolved here against the real constraint (upsertSelfCareLog semantics preserved).
  insert into public.self_care_logs_data (
    id, user_id, log_date, exercise_done, exercise_minutes, exercise_type_enc,
    meals_structured, emotional_eating, social_connection_made,
    social_notes_enc, meaningful_activity_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.log_date, coalesce(new.exercise_done, false), new.exercise_minutes,
    app.encrypt_text(coalesce(new.exercise_type, '')),
    new.meals_structured, coalesce(new.emotional_eating, false), coalesce(new.social_connection_made, false),
    app.encrypt_text(coalesce(new.social_notes, '')),
    app.encrypt_text(coalesce(new.meaningful_activity, '')),
    coalesce(new.created_at, timezone('utc', now())), timezone('utc', now()))
  on conflict (user_id, log_date) do update set
    exercise_done           = excluded.exercise_done,
    exercise_minutes        = excluded.exercise_minutes,
    exercise_type_enc       = excluded.exercise_type_enc,
    meals_structured        = excluded.meals_structured,
    emotional_eating        = excluded.emotional_eating,
    social_connection_made  = excluded.social_connection_made,
    social_notes_enc        = excluded.social_notes_enc,
    meaningful_activity_enc = excluded.meaningful_activity_enc,
    updated_at              = timezone('utc', now())
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists self_care_logs_ins on public.self_care_logs;
create trigger self_care_logs_ins instead of insert on public.self_care_logs
  for each row execute function public.self_care_logs_ins();

create or replace function public.self_care_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.social_notes) > 2000 then
    raise exception 'self_care_logs social_notes exceeds 2000 characters' using errcode = 'check_violation';
  end if;
  update public.self_care_logs_data set
    log_date                = new.log_date,
    exercise_done           = new.exercise_done,
    exercise_minutes        = new.exercise_minutes,
    exercise_type_enc       = app.encrypt_text(coalesce(new.exercise_type, '')),
    meals_structured        = new.meals_structured,
    emotional_eating        = new.emotional_eating,
    social_connection_made  = new.social_connection_made,
    social_notes_enc        = app.encrypt_text(coalesce(new.social_notes, '')),
    meaningful_activity_enc = app.encrypt_text(coalesce(new.meaningful_activity, '')),
    created_at              = new.created_at
   where id = old.id;   -- set_self_care_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists self_care_logs_upd on public.self_care_logs;
create trigger self_care_logs_upd instead of update on public.self_care_logs
  for each row execute function public.self_care_logs_upd();

create or replace function public.self_care_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.self_care_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists self_care_logs_del on public.self_care_logs;
create trigger self_care_logs_del instead of delete on public.self_care_logs
  for each row execute function public.self_care_logs_del();

grant select, insert, update, delete on public.self_care_logs to authenticated;
notify pgrst, 'reload schema';

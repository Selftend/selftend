-- Encrypt mood_logs free-text at rest: notes, situation, thoughts, behaviours, bodily_sensations.
-- Same pattern as the journal pilot (20260587): bytea ciphertext columns + a transparent
-- same-named decrypting view + INSTEAD OF triggers. Infra (Vault key, app.encrypt_text/
-- app.decrypt_text, schema-USAGE + EXECUTE grants) already exists globally from Phase 1.
--
-- Pass-through (plaintext, stay on the base table): id, user_id, mood_score, emotions[]
-- (fixed ids, not user text), linked_strategy, logged_at, created_at. mood_logs has NO
-- updated_at column and NO set_*_updated_at trigger.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.mood_logs add column if not exists notes_enc             bytea;
alter table public.mood_logs add column if not exists situation_enc         bytea;
alter table public.mood_logs add column if not exists thoughts_enc          bytea;
alter table public.mood_logs add column if not exists behaviours_enc        bytea;
alter table public.mood_logs add column if not exists bodily_sensations_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent: only rows not yet done).
update public.mood_logs
  set notes_enc             = app.encrypt_text(notes),
      situation_enc         = app.encrypt_text(situation),
      thoughts_enc          = app.encrypt_text(thoughts),
      behaviours_enc        = app.encrypt_text(behaviours),
      bodily_sensations_enc = app.encrypt_text(bodily_sensations)
  where notes_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.mood_logs rename to mood_logs_data;
alter table public.mood_logs_data enable row level security;

-- Plaintext columns are superseded by *_enc + the view; relax NOT NULL so the encrypt-only
-- INSTEAD OF triggers don't populate them. They are dropped entirely in 20260590.
alter table public.mood_logs_data alter column notes             drop not null;
alter table public.mood_logs_data alter column situation         drop not null;
alter table public.mood_logs_data alter column thoughts          drop not null;
alter table public.mood_logs_data alter column behaviours        drop not null;
alter table public.mood_logs_data alter column bodily_sensations drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.mood_logs with (security_invoker = true) as
  select id,
         user_id,
         mood_score,
         emotions,
         app.decrypt_text(notes_enc)             as notes,
         linked_strategy,
         logged_at,
         created_at,
         app.decrypt_text(situation_enc)         as situation,
         app.decrypt_text(thoughts_enc)          as thoughts,
         app.decrypt_text(behaviours_enc)        as behaviours,
         app.decrypt_text(bodily_sensations_enc) as bodily_sensations
  from public.mood_logs_data;

create or replace function public.mood_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.notes) > 4000 then
    raise exception 'mood log notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.situation) > 4000 then
    raise exception 'mood log situation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.thoughts) > 4000 then
    raise exception 'mood log thoughts exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.behaviours) > 4000 then
    raise exception 'mood log behaviours exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.bodily_sensations) > 4000 then
    raise exception 'mood log bodily_sensations exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.mood_logs_data (
    id, user_id, mood_score, emotions,
    notes_enc, situation_enc, thoughts_enc, behaviours_enc, bodily_sensations_enc,
    linked_strategy, logged_at, created_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.mood_score, coalesce(new.emotions, array[]::text[]),
    app.encrypt_text(coalesce(new.notes, '')),
    app.encrypt_text(coalesce(new.situation, '')),
    app.encrypt_text(coalesce(new.thoughts, '')),
    app.encrypt_text(coalesce(new.behaviours, '')),
    app.encrypt_text(coalesce(new.bodily_sensations, '')),
    new.linked_strategy,
    coalesce(new.logged_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())))
  returning id, user_id, logged_at, created_at into new.id, new.user_id, new.logged_at, new.created_at;
  return new;
end; $$;
drop trigger if exists mood_logs_ins on public.mood_logs;
create trigger mood_logs_ins instead of insert on public.mood_logs
  for each row execute function public.mood_logs_ins();

create or replace function public.mood_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.notes) > 4000 then
    raise exception 'mood log notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.situation) > 4000 then
    raise exception 'mood log situation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.thoughts) > 4000 then
    raise exception 'mood log thoughts exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.behaviours) > 4000 then
    raise exception 'mood log behaviours exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.bodily_sensations) > 4000 then
    raise exception 'mood log bodily_sensations exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.mood_logs_data set
    mood_score            = new.mood_score,
    emotions              = coalesce(new.emotions, array[]::text[]),
    notes_enc             = app.encrypt_text(coalesce(new.notes, '')),
    situation_enc         = app.encrypt_text(coalesce(new.situation, '')),
    thoughts_enc          = app.encrypt_text(coalesce(new.thoughts, '')),
    behaviours_enc        = app.encrypt_text(coalesce(new.behaviours, '')),
    bodily_sensations_enc = app.encrypt_text(coalesce(new.bodily_sensations, '')),
    linked_strategy       = new.linked_strategy,
    logged_at             = new.logged_at,
    created_at            = new.created_at
   where id = old.id;
  return new;
end; $$;
drop trigger if exists mood_logs_upd on public.mood_logs;
create trigger mood_logs_upd instead of update on public.mood_logs
  for each row execute function public.mood_logs_upd();

create or replace function public.mood_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.mood_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists mood_logs_del on public.mood_logs;
create trigger mood_logs_del instead of delete on public.mood_logs
  for each row execute function public.mood_logs_del();

grant select, insert, update, delete on public.mood_logs to authenticated;
notify pgrst, 'reload schema';

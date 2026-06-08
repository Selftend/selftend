-- Encrypt anger_logs free-text at rest. Same pattern as the journal pilot (20260587).
-- Infra (Vault key, app crypto helpers, schema-USAGE + EXECUTE grants) already exists globally.
--
-- ENCRYPT (all text):
--   trigger_text               (cap 4000)
--   interpretation             (cap 4000)
--   alternative_interpretation (cap 4000)
--   notes                      (cap 4000)
--   urge, behavior_chosen, consequence  (no length cap in 20260570)
-- PASS-THROUGH: id, user_id, arousal_level (1-10 CHECK stays on base), time_out_taken,
--   outcome_rating (1-10 CHECK stays on base), created_at, updated_at.
-- set_anger_logs_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns.
alter table public.anger_logs add column if not exists trigger_text_enc               bytea;
alter table public.anger_logs add column if not exists interpretation_enc             bytea;
alter table public.anger_logs add column if not exists urge_enc                       bytea;
alter table public.anger_logs add column if not exists behavior_chosen_enc            bytea;
alter table public.anger_logs add column if not exists consequence_enc                bytea;
alter table public.anger_logs add column if not exists alternative_interpretation_enc bytea;
alter table public.anger_logs add column if not exists notes_enc                      bytea;

-- Step B: backfill.
update public.anger_logs
  set trigger_text_enc               = app.encrypt_text(trigger_text),
      interpretation_enc             = app.encrypt_text(interpretation),
      urge_enc                       = app.encrypt_text(urge),
      behavior_chosen_enc            = app.encrypt_text(behavior_chosen),
      consequence_enc                = app.encrypt_text(consequence),
      alternative_interpretation_enc = app.encrypt_text(alternative_interpretation),
      notes_enc                      = app.encrypt_text(notes)
  where trigger_text_enc is null;

-- Step C: swap to a transparent encrypted view.
alter table public.anger_logs rename to anger_logs_data;
alter table public.anger_logs_data enable row level security;

alter table public.anger_logs_data alter column trigger_text               drop not null;
alter table public.anger_logs_data alter column interpretation             drop not null;
alter table public.anger_logs_data alter column urge                       drop not null;
alter table public.anger_logs_data alter column behavior_chosen            drop not null;
alter table public.anger_logs_data alter column consequence                drop not null;
alter table public.anger_logs_data alter column alternative_interpretation drop not null;
alter table public.anger_logs_data alter column notes                      drop not null;

create or replace view public.anger_logs with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(trigger_text_enc)               as trigger_text,
         app.decrypt_text(interpretation_enc)             as interpretation,
         arousal_level,
         app.decrypt_text(urge_enc)                       as urge,
         app.decrypt_text(behavior_chosen_enc)            as behavior_chosen,
         app.decrypt_text(consequence_enc)                as consequence,
         time_out_taken,
         app.decrypt_text(alternative_interpretation_enc) as alternative_interpretation,
         outcome_rating,
         app.decrypt_text(notes_enc)                      as notes,
         created_at,
         updated_at
  from public.anger_logs_data;

create or replace function public.anger_logs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.trigger_text) > 4000 then
    raise exception 'anger log trigger_text exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.interpretation) > 4000 then
    raise exception 'anger log interpretation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.alternative_interpretation) > 4000 then
    raise exception 'anger log alternative_interpretation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.notes) > 4000 then
    raise exception 'anger log notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.anger_logs_data (
    id, user_id, trigger_text_enc, interpretation_enc, arousal_level, urge_enc,
    behavior_chosen_enc, consequence_enc, time_out_taken, alternative_interpretation_enc,
    outcome_rating, notes_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.trigger_text, '')),
    app.encrypt_text(coalesce(new.interpretation, '')),
    new.arousal_level,
    app.encrypt_text(coalesce(new.urge, '')),
    app.encrypt_text(coalesce(new.behavior_chosen, '')),
    app.encrypt_text(coalesce(new.consequence, '')),
    coalesce(new.time_out_taken, false),
    app.encrypt_text(coalesce(new.alternative_interpretation, '')),
    new.outcome_rating,
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists anger_logs_ins on public.anger_logs;
create trigger anger_logs_ins instead of insert on public.anger_logs
  for each row execute function public.anger_logs_ins();

create or replace function public.anger_logs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.trigger_text) > 4000 then
    raise exception 'anger log trigger_text exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.interpretation) > 4000 then
    raise exception 'anger log interpretation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.alternative_interpretation) > 4000 then
    raise exception 'anger log alternative_interpretation exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.notes) > 4000 then
    raise exception 'anger log notes exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.anger_logs_data set
    trigger_text_enc               = app.encrypt_text(coalesce(new.trigger_text, '')),
    interpretation_enc             = app.encrypt_text(coalesce(new.interpretation, '')),
    arousal_level                  = new.arousal_level,
    urge_enc                       = app.encrypt_text(coalesce(new.urge, '')),
    behavior_chosen_enc            = app.encrypt_text(coalesce(new.behavior_chosen, '')),
    consequence_enc                = app.encrypt_text(coalesce(new.consequence, '')),
    time_out_taken                 = new.time_out_taken,
    alternative_interpretation_enc = app.encrypt_text(coalesce(new.alternative_interpretation, '')),
    outcome_rating                 = new.outcome_rating,
    notes_enc                      = app.encrypt_text(coalesce(new.notes, '')),
    created_at                     = new.created_at
   where id = old.id;   -- set_anger_logs_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists anger_logs_upd on public.anger_logs;
create trigger anger_logs_upd instead of update on public.anger_logs
  for each row execute function public.anger_logs_upd();

create or replace function public.anger_logs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.anger_logs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists anger_logs_del on public.anger_logs;
create trigger anger_logs_del instead of delete on public.anger_logs
  for each row execute function public.anger_logs_del();

grant select, insert, update, delete on public.anger_logs to authenticated;
notify pgrst, 'reload schema';

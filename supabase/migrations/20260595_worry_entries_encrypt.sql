-- Encrypt worry_entries free-text at rest. Same pattern as the journal pilot (20260587).
-- Infra (Vault key, app crypto helpers, schema-USAGE + EXECUTE grants) already exists globally.
--
-- ENCRYPT:
--   worry_statement  (text,   cap 4000)
--   coping_statement (text,   cap 4000)
--   evidence_for     (text[]) -- user-typed phrases; whole-array via ::text / ::text[]
--   evidence_against (text[]) -- same
--   action_steps     (text[]) -- same
-- PASS-THROUGH: id, user_id, worry_category (fixed enum hypothetical/real_problem, CHECK stays
--   on the base table), probability_estimate, resolved, created_at, updated_at.
-- set_worry_entries_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns.
alter table public.worry_entries add column if not exists worry_statement_enc  bytea;
alter table public.worry_entries add column if not exists coping_statement_enc bytea;
alter table public.worry_entries add column if not exists evidence_for_enc     bytea;
alter table public.worry_entries add column if not exists evidence_against_enc bytea;
alter table public.worry_entries add column if not exists action_steps_enc     bytea;

-- Step B: backfill (cast text[] to text first).
update public.worry_entries
  set worry_statement_enc  = app.encrypt_text(worry_statement),
      coping_statement_enc = app.encrypt_text(coping_statement),
      evidence_for_enc     = app.encrypt_text(evidence_for::text),
      evidence_against_enc = app.encrypt_text(evidence_against::text),
      action_steps_enc     = app.encrypt_text(action_steps::text)
  where worry_statement_enc is null;

-- Step C: swap to a transparent encrypted view.
alter table public.worry_entries rename to worry_entries_data;
alter table public.worry_entries_data enable row level security;

alter table public.worry_entries_data alter column worry_statement  drop not null;
alter table public.worry_entries_data alter column coping_statement drop not null;
alter table public.worry_entries_data alter column evidence_for     drop not null;
alter table public.worry_entries_data alter column evidence_against drop not null;
alter table public.worry_entries_data alter column action_steps     drop not null;

create or replace view public.worry_entries with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(worry_statement_enc)          as worry_statement,
         worry_category,
         probability_estimate,
         app.decrypt_text(evidence_for_enc)::text[]     as evidence_for,
         app.decrypt_text(evidence_against_enc)::text[] as evidence_against,
         app.decrypt_text(coping_statement_enc)         as coping_statement,
         app.decrypt_text(action_steps_enc)::text[]     as action_steps,
         resolved,
         created_at,
         updated_at
  from public.worry_entries_data;

create or replace function public.worry_entries_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.worry_statement) > 4000 then
    raise exception 'worry entry worry_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.coping_statement) > 4000 then
    raise exception 'worry entry coping_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.worry_entries_data (
    id, user_id, worry_statement_enc, worry_category, probability_estimate,
    evidence_for_enc, evidence_against_enc, coping_statement_enc, action_steps_enc,
    resolved, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.worry_statement, '')),
    new.worry_category,
    new.probability_estimate,
    app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    app.encrypt_text(coalesce(new.coping_statement, '')),
    app.encrypt_text(coalesce(new.action_steps, array[]::text[])::text),
    coalesce(new.resolved, false),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists worry_entries_ins on public.worry_entries;
create trigger worry_entries_ins instead of insert on public.worry_entries
  for each row execute function public.worry_entries_ins();

create or replace function public.worry_entries_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.worry_statement) > 4000 then
    raise exception 'worry entry worry_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.coping_statement) > 4000 then
    raise exception 'worry entry coping_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.worry_entries_data set
    worry_statement_enc  = app.encrypt_text(coalesce(new.worry_statement, '')),
    worry_category       = new.worry_category,
    probability_estimate = new.probability_estimate,
    evidence_for_enc     = app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    evidence_against_enc = app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    coping_statement_enc = app.encrypt_text(coalesce(new.coping_statement, '')),
    action_steps_enc     = app.encrypt_text(coalesce(new.action_steps, array[]::text[])::text),
    resolved             = new.resolved,
    created_at           = new.created_at
   where id = old.id;   -- set_worry_entries_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists worry_entries_upd on public.worry_entries;
create trigger worry_entries_upd instead of update on public.worry_entries
  for each row execute function public.worry_entries_upd();

create or replace function public.worry_entries_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.worry_entries_data where id = old.id;
  return old;
end; $$;
drop trigger if exists worry_entries_del on public.worry_entries;
create trigger worry_entries_del instead of delete on public.worry_entries
  for each row execute function public.worry_entries_del();

grant select, insert, update, delete on public.worry_entries to authenticated;
notify pgrst, 'reload schema';

-- Encrypt core_beliefs free-text at rest. Same pattern as the journal pilot (20260587).
-- Infra (Vault key, app crypto helpers, schema-USAGE + EXECUTE grants) already exists globally.
--
-- ENCRYPT:
--   belief_statement      (text,   cap 4000)
--   alternative_belief    (text,   cap 4000)
--   reinforcement_plan    (text,   cap 4000)
--   triggering_situations (text[]) -- user-typed phrases; whole-array via ::text / ::text[]
--   evidence_for          (text[]) -- same
--   evidence_against      (text[]) -- same
-- PASS-THROUGH: id, user_id, original_belief_strength, alternative_belief_strength,
--   next_review_date, created_at, updated_at.
-- set_core_beliefs_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update
-- fires it, so the INSTEAD OF update does NOT set updated_at.

-- Step A: add bytea ciphertext columns.
alter table public.core_beliefs add column if not exists belief_statement_enc      bytea;
alter table public.core_beliefs add column if not exists alternative_belief_enc    bytea;
alter table public.core_beliefs add column if not exists reinforcement_plan_enc    bytea;
alter table public.core_beliefs add column if not exists triggering_situations_enc bytea;
alter table public.core_beliefs add column if not exists evidence_for_enc          bytea;
alter table public.core_beliefs add column if not exists evidence_against_enc      bytea;

-- Step B: backfill (cast text[] to text first).
update public.core_beliefs
  set belief_statement_enc      = app.encrypt_text(belief_statement),
      alternative_belief_enc    = app.encrypt_text(alternative_belief),
      reinforcement_plan_enc    = app.encrypt_text(reinforcement_plan),
      triggering_situations_enc = app.encrypt_text(triggering_situations::text),
      evidence_for_enc          = app.encrypt_text(evidence_for::text),
      evidence_against_enc      = app.encrypt_text(evidence_against::text)
  where belief_statement_enc is null;

-- Step C: swap to a transparent encrypted view.
alter table public.core_beliefs rename to core_beliefs_data;
alter table public.core_beliefs_data enable row level security;

alter table public.core_beliefs_data alter column belief_statement      drop not null;
alter table public.core_beliefs_data alter column alternative_belief    drop not null;
alter table public.core_beliefs_data alter column reinforcement_plan    drop not null;
alter table public.core_beliefs_data alter column triggering_situations drop not null;
alter table public.core_beliefs_data alter column evidence_for          drop not null;
alter table public.core_beliefs_data alter column evidence_against      drop not null;

create or replace view public.core_beliefs with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(belief_statement_enc)            as belief_statement,
         app.decrypt_text(triggering_situations_enc)::text[] as triggering_situations,
         app.decrypt_text(evidence_for_enc)::text[]        as evidence_for,
         app.decrypt_text(evidence_against_enc)::text[]    as evidence_against,
         app.decrypt_text(alternative_belief_enc)          as alternative_belief,
         original_belief_strength,
         alternative_belief_strength,
         app.decrypt_text(reinforcement_plan_enc)          as reinforcement_plan,
         next_review_date,
         created_at,
         updated_at
  from public.core_beliefs_data;

create or replace function public.core_beliefs_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.belief_statement) > 4000 then
    raise exception 'core belief belief_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.alternative_belief) > 4000 then
    raise exception 'core belief alternative_belief exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.reinforcement_plan) > 4000 then
    raise exception 'core belief reinforcement_plan exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.core_beliefs_data (
    id, user_id, belief_statement_enc, triggering_situations_enc, evidence_for_enc,
    evidence_against_enc, alternative_belief_enc, original_belief_strength,
    alternative_belief_strength, reinforcement_plan_enc, next_review_date, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.belief_statement, '')),
    app.encrypt_text(coalesce(new.triggering_situations, array[]::text[])::text),
    app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    app.encrypt_text(coalesce(new.alternative_belief, '')),
    new.original_belief_strength,
    new.alternative_belief_strength,
    app.encrypt_text(coalesce(new.reinforcement_plan, '')),
    new.next_review_date,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists core_beliefs_ins on public.core_beliefs;
create trigger core_beliefs_ins instead of insert on public.core_beliefs
  for each row execute function public.core_beliefs_ins();

create or replace function public.core_beliefs_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.belief_statement) > 4000 then
    raise exception 'core belief belief_statement exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.alternative_belief) > 4000 then
    raise exception 'core belief alternative_belief exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.reinforcement_plan) > 4000 then
    raise exception 'core belief reinforcement_plan exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.core_beliefs_data set
    belief_statement_enc        = app.encrypt_text(coalesce(new.belief_statement, '')),
    triggering_situations_enc   = app.encrypt_text(coalesce(new.triggering_situations, array[]::text[])::text),
    evidence_for_enc            = app.encrypt_text(coalesce(new.evidence_for, array[]::text[])::text),
    evidence_against_enc        = app.encrypt_text(coalesce(new.evidence_against, array[]::text[])::text),
    alternative_belief_enc      = app.encrypt_text(coalesce(new.alternative_belief, '')),
    original_belief_strength    = new.original_belief_strength,
    alternative_belief_strength = new.alternative_belief_strength,
    reinforcement_plan_enc      = app.encrypt_text(coalesce(new.reinforcement_plan, '')),
    next_review_date            = new.next_review_date,
    created_at                  = new.created_at
   where id = old.id;   -- set_core_beliefs_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists core_beliefs_upd on public.core_beliefs;
create trigger core_beliefs_upd instead of update on public.core_beliefs
  for each row execute function public.core_beliefs_upd();

create or replace function public.core_beliefs_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.core_beliefs_data where id = old.id;
  return old;
end; $$;
drop trigger if exists core_beliefs_del on public.core_beliefs;
create trigger core_beliefs_del instead of delete on public.core_beliefs
  for each row execute function public.core_beliefs_del();

grant select, insert, update, delete on public.core_beliefs to authenticated;
notify pgrst, 'reload schema';

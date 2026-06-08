-- Encrypt act_program_state free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (text[], NOT NULL, default '{}') — whole-array via ::text on write / ::text[] on read:
--   primary_concerns  (text[]: user-selected concern ids; treated as user-entered per Task 1)
-- PASS-THROUGH (plaintext, stay on the base table): user_id (PK), active_principles (text[]),
--   myths_acknowledged, onboarding_completed_at, last_check_in_at,
--   preferred_check_in_time (structured HH:mm preference — PLAINTEXT per Task 1),
--   created_at, updated_at.
-- PRIMARY KEY is user_id (NOT id) — this table has no `id` column. The INSTEAD OF upd/del
--   triggers key on old.user_id; the view exposes user_id as its identity.
-- UPSERT TABLE: act_program_state is a per-user singleton (PK user_id). The client used
--   PostgREST upsert(onConflict:'user_id'). A view cannot be the target of INSERT ... ON CONFLICT,
--   so the (user_id) merge is resolved inside the INSTEAD OF INSERT trigger against the base
--   table's real primary key, and the repository switches .upsert() -> .insert()
--   (upsertACTProgramState semantics preserved).
-- NO set_act_program_state_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.act_program_state add column if not exists primary_concerns_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (cast text[] to text first).
update public.act_program_state
  set primary_concerns_enc = app.encrypt_text(primary_concerns::text)
  where primary_concerns_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_program_state rename to act_program_state_data;
alter table public.act_program_state_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext column (triggers don't populate it).
alter table public.act_program_state_data alter column primary_concerns drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_program_state with (security_invoker = true) as
  select user_id,
         active_principles,
         app.decrypt_text(primary_concerns_enc)::text[] as primary_concerns,
         myths_acknowledged,
         onboarding_completed_at,
         last_check_in_at,
         preferred_check_in_time,
         created_at,
         updated_at
  from public.act_program_state_data;

create or replace function public.act_program_state_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- act_program_state is a per-user singleton (PK user_id). A view cannot be the target of
  -- INSERT ... ON CONFLICT (PostgREST upsert), so the client inserts plainly and the per-user
  -- merge is resolved here against the real primary key (upsertACTProgramState semantics preserved).
  insert into public.act_program_state_data (
    user_id, active_principles, primary_concerns_enc, myths_acknowledged,
    onboarding_completed_at, last_check_in_at, preferred_check_in_time, created_at, updated_at)
  values (
    coalesce(new.user_id, auth.uid()),
    coalesce(new.active_principles, array[]::text[]),
    app.encrypt_text(coalesce(new.primary_concerns, array[]::text[])::text),
    coalesce(new.myths_acknowledged, false),
    new.onboarding_completed_at,
    new.last_check_in_at,
    new.preferred_check_in_time,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  on conflict (user_id) do update set
    active_principles       = excluded.active_principles,
    primary_concerns_enc    = excluded.primary_concerns_enc,
    myths_acknowledged      = excluded.myths_acknowledged,
    onboarding_completed_at = excluded.onboarding_completed_at,
    last_check_in_at        = excluded.last_check_in_at,
    preferred_check_in_time = excluded.preferred_check_in_time,
    updated_at              = timezone('utc', now())
  returning user_id, myths_acknowledged, created_at, updated_at
    into new.user_id, new.myths_acknowledged, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_program_state_ins on public.act_program_state;
create trigger act_program_state_ins instead of insert on public.act_program_state
  for each row execute function public.act_program_state_ins();

create or replace function public.act_program_state_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_program_state_data set
    active_principles       = coalesce(new.active_principles, array[]::text[]),
    primary_concerns_enc    = app.encrypt_text(coalesce(new.primary_concerns, array[]::text[])::text),
    myths_acknowledged      = new.myths_acknowledged,
    onboarding_completed_at = new.onboarding_completed_at,
    last_check_in_at        = new.last_check_in_at,
    preferred_check_in_time = new.preferred_check_in_time,
    created_at              = new.created_at,
    updated_at              = timezone('utc', now())
   where user_id = old.user_id;
  return new;
end; $$;
drop trigger if exists act_program_state_upd on public.act_program_state;
create trigger act_program_state_upd instead of update on public.act_program_state
  for each row execute function public.act_program_state_upd();

create or replace function public.act_program_state_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_program_state_data where user_id = old.user_id;
  return old;
end; $$;
drop trigger if exists act_program_state_del on public.act_program_state;
create trigger act_program_state_del instead of delete on public.act_program_state
  for each row execute function public.act_program_state_del();

grant select, insert, update, delete on public.act_program_state to authenticated;
notify pgrst, 'reload schema';

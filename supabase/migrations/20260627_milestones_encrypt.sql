-- Encrypt milestones free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT: description (text, NOT NULL, no length cap in the schema).
-- PASS-THROUGH: id, goal_id (FK -> goals_data.id ON DELETE CASCADE), user_id, target_date (date),
--   completed_at (timestamptz), created_at, updated_at.
-- FK CHILD of goals: goals was encrypted first (20260625); milestones_goal_id_fkey already points
--   at goals_data and follows this rename onto milestones_data automatically (FK is by OID).
-- set_milestones_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update fires it.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.milestones add column if not exists description_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.milestones
  set description_enc = app.encrypt_text(description)
  where description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.milestones rename to milestones_data;
alter table public.milestones_data enable row level security;

alter table public.milestones_data alter column description drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.milestones with (security_invoker = true) as
  select id,
         goal_id,
         user_id,
         app.decrypt_text(description_enc) as description,
         target_date,
         completed_at,
         created_at,
         updated_at
  from public.milestones_data;

create or replace function public.milestones_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.milestones_data (
    id, goal_id, user_id, description_enc, target_date, completed_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), new.goal_id, coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.description, '')),
    new.target_date, new.completed_at,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists milestones_ins on public.milestones;
create trigger milestones_ins instead of insert on public.milestones
  for each row execute function public.milestones_ins();

create or replace function public.milestones_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.milestones_data set
    goal_id         = new.goal_id,
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    target_date     = new.target_date,
    completed_at    = new.completed_at,
    created_at      = new.created_at
   where id = old.id;   -- set_milestones_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists milestones_upd on public.milestones;
create trigger milestones_upd instead of update on public.milestones
  for each row execute function public.milestones_upd();

create or replace function public.milestones_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.milestones_data where id = old.id;
  return old;
end; $$;
drop trigger if exists milestones_del on public.milestones;
create trigger milestones_del instead of delete on public.milestones
  for each row execute function public.milestones_del();

grant select, insert, update, delete on public.milestones to authenticated;
notify pgrst, 'reload schema';

-- Encrypt act_action_steps free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   description
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id,
--   action_id (FK -> act_committed_actions_data(id) ON DELETE CASCADE — parent encrypted in 20260649),
--   is_completed (bool), completed_at, created_at, updated_at.
-- NO set_act_action_steps_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.act_action_steps add column if not exists description_enc bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_action_steps
  set description_enc = app.encrypt_text(description)
  where description_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_action_steps rename to act_action_steps_data;
alter table public.act_action_steps_data enable row level security;

alter table public.act_action_steps_data alter column description drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_action_steps with (security_invoker = true) as
  select id,
         user_id,
         action_id,
         app.decrypt_text(description_enc) as description,
         is_completed,
         completed_at,
         created_at,
         updated_at
  from public.act_action_steps_data;

create or replace function public.act_action_steps_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_action_steps_data (
    id, user_id, action_id, description_enc, is_completed, completed_at, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.action_id,
    app.encrypt_text(coalesce(new.description, '')),
    coalesce(new.is_completed, false),
    new.completed_at,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, is_completed, created_at, updated_at
    into new.id, new.user_id, new.is_completed, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_action_steps_ins on public.act_action_steps;
create trigger act_action_steps_ins instead of insert on public.act_action_steps
  for each row execute function public.act_action_steps_ins();

create or replace function public.act_action_steps_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_action_steps_data set
    action_id       = new.action_id,
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    is_completed    = new.is_completed,
    completed_at    = new.completed_at,
    created_at      = new.created_at,
    updated_at      = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_action_steps_upd on public.act_action_steps;
create trigger act_action_steps_upd instead of update on public.act_action_steps
  for each row execute function public.act_action_steps_upd();

create or replace function public.act_action_steps_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_action_steps_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_action_steps_del on public.act_action_steps;
create trigger act_action_steps_del instead of delete on public.act_action_steps
  for each row execute function public.act_action_steps_del();

grant select, insert, update, delete on public.act_action_steps to authenticated;
notify pgrst, 'reload schema';

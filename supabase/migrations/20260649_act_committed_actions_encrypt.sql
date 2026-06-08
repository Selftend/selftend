-- Encrypt act_committed_actions free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   title, description, obstacles
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id,
--   life_domain (enum CHECK), status (enum CHECK), target_date (date), created_at, updated_at.
-- FK CHILD: act_action_steps.action_id -> act_committed_actions(id) ON DELETE CASCADE. The FK is by
--   OID, so it follows this rename onto act_committed_actions_data automatically (verified post-swap).
--   This parent table is encrypted BEFORE act_action_steps.
-- NO set_act_committed_actions_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_committed_actions add column if not exists title_enc       bytea;
alter table public.act_committed_actions add column if not exists description_enc bytea;
alter table public.act_committed_actions add column if not exists obstacles_enc   bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_committed_actions
  set title_enc       = app.encrypt_text(title),
      description_enc = app.encrypt_text(description),
      obstacles_enc   = app.encrypt_text(obstacles)
  where title_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_committed_actions rename to act_committed_actions_data;
alter table public.act_committed_actions_data enable row level security;

alter table public.act_committed_actions_data alter column title       drop not null;
alter table public.act_committed_actions_data alter column description drop not null;
alter table public.act_committed_actions_data alter column obstacles   drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_committed_actions with (security_invoker = true) as
  select id,
         user_id,
         life_domain,
         app.decrypt_text(title_enc)       as title,
         app.decrypt_text(description_enc) as description,
         status,
         target_date,
         app.decrypt_text(obstacles_enc)   as obstacles,
         created_at,
         updated_at
  from public.act_committed_actions_data;

create or replace function public.act_committed_actions_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_committed_actions_data (
    id, user_id, life_domain, title_enc, description_enc, status,
    target_date, obstacles_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.life_domain,
    app.encrypt_text(coalesce(new.title, '')),
    app.encrypt_text(coalesce(new.description, '')),
    coalesce(new.status, 'active'),
    new.target_date,
    app.encrypt_text(coalesce(new.obstacles, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, status, created_at, updated_at
    into new.id, new.user_id, new.status, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_committed_actions_ins on public.act_committed_actions;
create trigger act_committed_actions_ins instead of insert on public.act_committed_actions
  for each row execute function public.act_committed_actions_ins();

create or replace function public.act_committed_actions_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_committed_actions_data set
    life_domain     = new.life_domain,
    title_enc       = app.encrypt_text(coalesce(new.title, '')),
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    status          = new.status,
    target_date     = new.target_date,
    obstacles_enc   = app.encrypt_text(coalesce(new.obstacles, '')),
    created_at      = new.created_at,
    updated_at      = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_committed_actions_upd on public.act_committed_actions;
create trigger act_committed_actions_upd instead of update on public.act_committed_actions
  for each row execute function public.act_committed_actions_upd();

create or replace function public.act_committed_actions_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_committed_actions_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_committed_actions_del on public.act_committed_actions;
create trigger act_committed_actions_del instead of delete on public.act_committed_actions
  for each row execute function public.act_committed_actions_del();

grant select, insert, update, delete on public.act_committed_actions to authenticated;
notify pgrst, 'reload schema';

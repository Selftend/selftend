-- Encrypt goals free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (both text, NOT NULL):
--   title        (cap 300)
--   description  (cap 4000)
-- PASS-THROUGH: id, user_id, life_domain (text), goal_type (text), target_date (date),
--   status (text, CHECK enum), created_at, updated_at.
-- FK PARENT of milestones: milestones_goal_id_fkey points at goals(id) and follows this rename
--   onto goals_data automatically (FK is by OID). milestones is encrypted next (20260627).
-- goals_title_len / goals_description_len CHECKs (NOT VALID) reference the plaintext and die when
--   it drops -> caps moved into the triggers.
-- set_goals_updated_at BEFORE-UPDATE trigger travels with the rename; the inner update fires it.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.goals add column if not exists title_enc       bytea;
alter table public.goals add column if not exists description_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.goals
  set title_enc       = app.encrypt_text(title),
      description_enc = app.encrypt_text(description)
  where title_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.goals rename to goals_data;
alter table public.goals_data enable row level security;

alter table public.goals_data alter column title       drop not null;
alter table public.goals_data alter column description drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.goals with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(title_enc)       as title,
         app.decrypt_text(description_enc) as description,
         life_domain,
         goal_type,
         target_date,
         status,
         created_at,
         updated_at
  from public.goals_data;

create or replace function public.goals_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.title) > 300 then
    raise exception 'goals title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.description) > 4000 then
    raise exception 'goals description exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  insert into public.goals_data (
    id, user_id, title_enc, description_enc, life_domain, goal_type,
    target_date, status, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.title, '')),
    app.encrypt_text(coalesce(new.description, '')),
    new.life_domain, new.goal_type, new.target_date,
    coalesce(new.status, 'active'),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists goals_ins on public.goals;
create trigger goals_ins instead of insert on public.goals
  for each row execute function public.goals_ins();

create or replace function public.goals_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.title) > 300 then
    raise exception 'goals title exceeds 300 characters' using errcode = 'check_violation';
  end if;
  if char_length(new.description) > 4000 then
    raise exception 'goals description exceeds 4000 characters' using errcode = 'check_violation';
  end if;
  update public.goals_data set
    title_enc       = app.encrypt_text(coalesce(new.title, '')),
    description_enc = app.encrypt_text(coalesce(new.description, '')),
    life_domain     = new.life_domain,
    goal_type       = new.goal_type,
    target_date     = new.target_date,
    status          = new.status,
    created_at      = new.created_at
   where id = old.id;   -- set_goals_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists goals_upd on public.goals;
create trigger goals_upd instead of update on public.goals
  for each row execute function public.goals_upd();

create or replace function public.goals_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.goals_data where id = old.id;
  return old;
end; $$;
drop trigger if exists goals_del on public.goals;
create trigger goals_del instead of delete on public.goals
  for each row execute function public.goals_del();

grant select, insert, update, delete on public.goals to authenticated;
notify pgrst, 'reload schema';

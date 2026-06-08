-- Encrypt act_choice_points free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT:
--   hooks         (text[], NOT NULL, default '{}') -- whole-array via ::text on write / ::text[] on read
--   away_moves    (text[], NOT NULL, default '{}') -- same
--   toward_moves  (text[], NOT NULL, default '{}') -- same
--   notes         (text,   NOT NULL, default '')   -- user-entered free text
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id, created_at, updated_at.
-- NO enum/length CHECK constraints. NO set_act_choice_points_updated_at trigger exists; the
-- triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_choice_points add column if not exists hooks_enc        bytea;
alter table public.act_choice_points add column if not exists away_moves_enc   bytea;
alter table public.act_choice_points add column if not exists toward_moves_enc bytea;
alter table public.act_choice_points add column if not exists notes_enc        bytea;

-- Step B: backfill ciphertext from existing plaintext (cast text[] to text first).
update public.act_choice_points
  set hooks_enc        = app.encrypt_text(hooks::text),
      away_moves_enc   = app.encrypt_text(away_moves::text),
      toward_moves_enc = app.encrypt_text(toward_moves::text),
      notes_enc        = app.encrypt_text(notes)
  where hooks_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_choice_points rename to act_choice_points_data;
alter table public.act_choice_points_data enable row level security;

alter table public.act_choice_points_data alter column hooks        drop not null;
alter table public.act_choice_points_data alter column away_moves   drop not null;
alter table public.act_choice_points_data alter column toward_moves drop not null;
alter table public.act_choice_points_data alter column notes        drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_choice_points with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(hooks_enc)::text[]        as hooks,
         app.decrypt_text(away_moves_enc)::text[]   as away_moves,
         app.decrypt_text(toward_moves_enc)::text[] as toward_moves,
         app.decrypt_text(notes_enc)                as notes,
         created_at,
         updated_at
  from public.act_choice_points_data;

create or replace function public.act_choice_points_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.act_choice_points_data (
    id, user_id, hooks_enc, away_moves_enc, toward_moves_enc, notes_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.hooks, array[]::text[])::text),
    app.encrypt_text(coalesce(new.away_moves, array[]::text[])::text),
    app.encrypt_text(coalesce(new.toward_moves, array[]::text[])::text),
    app.encrypt_text(coalesce(new.notes, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at
    into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_choice_points_ins on public.act_choice_points;
create trigger act_choice_points_ins instead of insert on public.act_choice_points
  for each row execute function public.act_choice_points_ins();

create or replace function public.act_choice_points_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_choice_points_data set
    hooks_enc        = app.encrypt_text(coalesce(new.hooks, array[]::text[])::text),
    away_moves_enc   = app.encrypt_text(coalesce(new.away_moves, array[]::text[])::text),
    toward_moves_enc = app.encrypt_text(coalesce(new.toward_moves, array[]::text[])::text),
    notes_enc        = app.encrypt_text(coalesce(new.notes, '')),
    created_at       = new.created_at,
    updated_at       = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_choice_points_upd on public.act_choice_points;
create trigger act_choice_points_upd instead of update on public.act_choice_points
  for each row execute function public.act_choice_points_upd();

create or replace function public.act_choice_points_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_choice_points_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_choice_points_del on public.act_choice_points;
create trigger act_choice_points_del instead of delete on public.act_choice_points
  for each row execute function public.act_choice_points_del();

grant select, insert, update, delete on public.act_choice_points to authenticated;
notify pgrst, 'reload schema';

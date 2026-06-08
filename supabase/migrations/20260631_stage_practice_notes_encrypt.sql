-- Encrypt stage_practice_notes free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT: note (text, NOT NULL, no length cap in the schema).
-- PASS-THROUGH: id, user_id, stage (int, CHECK 1..10), created_at, updated_at.
-- NO set_stage_practice_notes_updated_at trigger exists (verified in pg_trigger) even though the
--   table HAS an updated_at column -> the INSTEAD OF UPDATE trigger sets updated_at itself.
-- RLS: a single ALL policy ("Users can manage their own stage practice notes") covers
--   SELECT/INSERT/UPDATE/DELETE, so the user DELETE path through the view works directly.

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.stage_practice_notes add column if not exists note_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (idempotent).
update public.stage_practice_notes
  set note_enc = app.encrypt_text(note)
  where note_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.stage_practice_notes rename to stage_practice_notes_data;
alter table public.stage_practice_notes_data enable row level security;

alter table public.stage_practice_notes_data alter column note drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.stage_practice_notes with (security_invoker = true) as
  select id,
         user_id,
         stage,
         app.decrypt_text(note_enc) as note,
         created_at,
         updated_at
  from public.stage_practice_notes_data;

create or replace function public.stage_practice_notes_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  insert into public.stage_practice_notes_data (
    id, user_id, stage, note_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.stage,
    app.encrypt_text(coalesce(new.note, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists stage_practice_notes_ins on public.stage_practice_notes;
create trigger stage_practice_notes_ins instead of insert on public.stage_practice_notes
  for each row execute function public.stage_practice_notes_ins();

create or replace function public.stage_practice_notes_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- No BEFORE-UPDATE updated_at trigger on this table, so refresh updated_at here.
  update public.stage_practice_notes_data set
    stage      = new.stage,
    note_enc   = app.encrypt_text(coalesce(new.note, '')),
    created_at = new.created_at,
    updated_at = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists stage_practice_notes_upd on public.stage_practice_notes;
create trigger stage_practice_notes_upd instead of update on public.stage_practice_notes
  for each row execute function public.stage_practice_notes_upd();

create or replace function public.stage_practice_notes_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.stage_practice_notes_data where id = old.id;
  return old;
end; $$;
drop trigger if exists stage_practice_notes_del on public.stage_practice_notes;
create trigger stage_practice_notes_del instead of delete on public.stage_practice_notes
  for each row execute function public.stage_practice_notes_del();

grant select, insert, update, delete on public.stage_practice_notes to authenticated;
notify pgrst, 'reload schema';

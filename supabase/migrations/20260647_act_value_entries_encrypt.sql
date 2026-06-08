-- Encrypt act_value_entries free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):
--   value_statement, current_actions_note, desired_actions_note, barriers
-- PASS-THROUGH (plaintext, stay on the base table): id, user_id,
--   life_domain (enum CHECK), importance_rating (CHECK 1..10), current_alignment_rating (CHECK 1..10),
--   created_at, updated_at.
-- UPSERT TABLE: UNIQUE (user_id, life_domain). The client used PostgREST upsert(onConflict:
--   'user_id,life_domain'). A view cannot be the target of INSERT ... ON CONFLICT, so the (user_id,
--   life_domain) merge is resolved inside the INSTEAD OF INSERT trigger against the base table's
--   real unique key, and the repository switches .upsert() -> .insert() (upsertValueEntry semantics
--   preserved). The sole UI call site always sends the full field set (pre-loaded from existing),
--   so the blind excluded.* merge does not drop fields in practice.
-- NO set_act_value_entries_updated_at trigger exists; the triggers set updated_at explicitly.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.act_value_entries add column if not exists value_statement_enc      bytea;
alter table public.act_value_entries add column if not exists current_actions_note_enc bytea;
alter table public.act_value_entries add column if not exists desired_actions_note_enc bytea;
alter table public.act_value_entries add column if not exists barriers_enc             bytea;

-- Step B: backfill ciphertext from existing plaintext.
update public.act_value_entries
  set value_statement_enc      = app.encrypt_text(value_statement),
      current_actions_note_enc = app.encrypt_text(current_actions_note),
      desired_actions_note_enc = app.encrypt_text(desired_actions_note),
      barriers_enc             = app.encrypt_text(barriers)
  where value_statement_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.act_value_entries rename to act_value_entries_data;
alter table public.act_value_entries_data enable row level security;

alter table public.act_value_entries_data alter column value_statement      drop not null;
alter table public.act_value_entries_data alter column current_actions_note drop not null;
alter table public.act_value_entries_data alter column desired_actions_note drop not null;
alter table public.act_value_entries_data alter column barriers             drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.act_value_entries with (security_invoker = true) as
  select id,
         user_id,
         life_domain,
         app.decrypt_text(value_statement_enc)      as value_statement,
         importance_rating,
         current_alignment_rating,
         app.decrypt_text(current_actions_note_enc) as current_actions_note,
         app.decrypt_text(desired_actions_note_enc) as desired_actions_note,
         app.decrypt_text(barriers_enc)             as barriers,
         created_at,
         updated_at
  from public.act_value_entries_data;

create or replace function public.act_value_entries_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  -- act_value_entries is unique on (user_id, life_domain). A view cannot be the target of
  -- INSERT ... ON CONFLICT (PostgREST upsert), so the per-domain merge is resolved here against
  -- the real unique key (upsertValueEntry semantics preserved).
  insert into public.act_value_entries_data (
    id, user_id, life_domain, value_statement_enc, importance_rating,
    current_alignment_rating, current_actions_note_enc, desired_actions_note_enc,
    barriers_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    new.life_domain,
    app.encrypt_text(coalesce(new.value_statement, '')),
    new.importance_rating,
    new.current_alignment_rating,
    app.encrypt_text(coalesce(new.current_actions_note, '')),
    app.encrypt_text(coalesce(new.desired_actions_note, '')),
    app.encrypt_text(coalesce(new.barriers, '')),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  on conflict (user_id, life_domain) do update set
    value_statement_enc      = excluded.value_statement_enc,
    importance_rating        = excluded.importance_rating,
    current_alignment_rating = excluded.current_alignment_rating,
    current_actions_note_enc = excluded.current_actions_note_enc,
    desired_actions_note_enc = excluded.desired_actions_note_enc,
    barriers_enc             = excluded.barriers_enc,
    updated_at               = timezone('utc', now())
  returning id, user_id, created_at, updated_at
    into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists act_value_entries_ins on public.act_value_entries;
create trigger act_value_entries_ins instead of insert on public.act_value_entries
  for each row execute function public.act_value_entries_ins();

create or replace function public.act_value_entries_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.act_value_entries_data set
    life_domain              = new.life_domain,
    value_statement_enc      = app.encrypt_text(coalesce(new.value_statement, '')),
    importance_rating        = new.importance_rating,
    current_alignment_rating = new.current_alignment_rating,
    current_actions_note_enc = app.encrypt_text(coalesce(new.current_actions_note, '')),
    desired_actions_note_enc = app.encrypt_text(coalesce(new.desired_actions_note, '')),
    barriers_enc             = app.encrypt_text(coalesce(new.barriers, '')),
    created_at               = new.created_at,
    updated_at               = timezone('utc', now())
   where id = old.id;
  return new;
end; $$;
drop trigger if exists act_value_entries_upd on public.act_value_entries;
create trigger act_value_entries_upd instead of update on public.act_value_entries
  for each row execute function public.act_value_entries_upd();

create or replace function public.act_value_entries_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.act_value_entries_data where id = old.id;
  return old;
end; $$;
drop trigger if exists act_value_entries_del on public.act_value_entries;
create trigger act_value_entries_del instead of delete on public.act_value_entries
  for each row execute function public.act_value_entries_del();

grant select, insert, update, delete on public.act_value_entries to authenticated;
notify pgrst, 'reload schema';

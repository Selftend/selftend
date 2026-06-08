-- Encrypt gratitude_entries free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext columns + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (all text):
--   item_1..item_5        (cap 240 each; positional slots — NULL semantics are load-bearing)
--   events  -> NOT encrypted: it is text[] but stays plaintext (free-typed but kept plaintext
--             only if listed; per dispatch events IS encrypted) -- see below.
--   good_moment, miss_if_gone, hidden_good, life_item_1..3 (cap 240 each)
--   note                  (cap 2000)
--
-- CRITICAL — positional NULL semantics: each item_N maps to a fixed question. An empty slot is
-- NULL and MUST stay NULL (never coalesce to '' or blank-fill). Because app.encrypt_text(NULL)
-- returns NULL and the view's app.decrypt_text(NULL) returns NULL, a NULL slot round-trips to
-- NULL automatically PROVIDED the triggers do NOT coalesce. So: app.encrypt_text(new.item_1::text)
-- with NO coalesce. An empty-string slot ('') likewise round-trips to ''.
--
-- events IS encrypted per the Batch-C dispatch (text[] whole-array via ::text / ::text[]).
-- PASS-THROUGH: id, user_id, logged_at, level (smallint 1..3), starred (bool), created_at,
--   updated_at.
-- CHECK constraints that referenced the now-encrypted columns (per-item length, per-item
--   not_blank_if_set, note length, at_least_one_item, events cardinality) die when plaintext is
--   dropped, so they are reproduced in the INSTEAD OF triggers.
-- set_gratitude_entries_updated_at BEFORE-UPDATE trigger travels with the rename and refreshes
--   updated_at on the inner update.

-- Step A: add bytea ciphertext columns alongside the existing plaintext (additive).
alter table public.gratitude_entries add column if not exists item_1_enc       bytea;
alter table public.gratitude_entries add column if not exists item_2_enc       bytea;
alter table public.gratitude_entries add column if not exists item_3_enc       bytea;
alter table public.gratitude_entries add column if not exists item_4_enc       bytea;
alter table public.gratitude_entries add column if not exists item_5_enc       bytea;
alter table public.gratitude_entries add column if not exists events_enc       bytea;
alter table public.gratitude_entries add column if not exists good_moment_enc  bytea;
alter table public.gratitude_entries add column if not exists miss_if_gone_enc bytea;
alter table public.gratitude_entries add column if not exists hidden_good_enc  bytea;
alter table public.gratitude_entries add column if not exists life_item_1_enc  bytea;
alter table public.gratitude_entries add column if not exists life_item_2_enc  bytea;
alter table public.gratitude_entries add column if not exists life_item_3_enc  bytea;
alter table public.gratitude_entries add column if not exists note_enc         bytea;

-- Step B: backfill ciphertext from existing plaintext. NO coalesce -> NULL slots stay NULL.
-- events is text[] -> cast ::text before encrypting.
update public.gratitude_entries
  set item_1_enc       = app.encrypt_text(item_1),
      item_2_enc       = app.encrypt_text(item_2),
      item_3_enc       = app.encrypt_text(item_3),
      item_4_enc       = app.encrypt_text(item_4),
      item_5_enc       = app.encrypt_text(item_5),
      events_enc       = app.encrypt_text(events::text),
      good_moment_enc  = app.encrypt_text(good_moment),
      miss_if_gone_enc = app.encrypt_text(miss_if_gone),
      hidden_good_enc  = app.encrypt_text(hidden_good),
      life_item_1_enc  = app.encrypt_text(life_item_1),
      life_item_2_enc  = app.encrypt_text(life_item_2),
      life_item_3_enc  = app.encrypt_text(life_item_3),
      note_enc         = app.encrypt_text(note)
  where item_1_enc is null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.gratitude_entries rename to gratitude_entries_data;
alter table public.gratitude_entries_data enable row level security;

-- Relax NOT NULL on the encrypted plaintext columns (triggers don't populate them, and dropping
-- them later requires NULLs in between). Preserves positional NULL semantics for item_N.
alter table public.gratitude_entries_data alter column item_1       drop not null;
alter table public.gratitude_entries_data alter column item_2       drop not null;
alter table public.gratitude_entries_data alter column item_3       drop not null;
alter table public.gratitude_entries_data alter column item_4       drop not null;
alter table public.gratitude_entries_data alter column item_5       drop not null;
alter table public.gratitude_entries_data alter column events       drop not null;
alter table public.gratitude_entries_data alter column good_moment  drop not null;
alter table public.gratitude_entries_data alter column miss_if_gone drop not null;
alter table public.gratitude_entries_data alter column hidden_good  drop not null;
alter table public.gratitude_entries_data alter column life_item_1  drop not null;
alter table public.gratitude_entries_data alter column life_item_2  drop not null;
alter table public.gratitude_entries_data alter column life_item_3  drop not null;
alter table public.gratitude_entries_data alter column note         drop not null;

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
-- decrypt_text(NULL) = NULL, so NULL item slots surface as NULL (load-bearing).
create or replace view public.gratitude_entries with (security_invoker = true) as
  select id,
         user_id,
         app.decrypt_text(item_1_enc)              as item_1,
         app.decrypt_text(item_2_enc)              as item_2,
         app.decrypt_text(item_3_enc)              as item_3,
         app.decrypt_text(item_4_enc)              as item_4,
         app.decrypt_text(item_5_enc)              as item_5,
         app.decrypt_text(events_enc)::text[]      as events,
         app.decrypt_text(good_moment_enc)         as good_moment,
         app.decrypt_text(miss_if_gone_enc)        as miss_if_gone,
         app.decrypt_text(hidden_good_enc)         as hidden_good,
         app.decrypt_text(life_item_1_enc)         as life_item_1,
         app.decrypt_text(life_item_2_enc)         as life_item_2,
         app.decrypt_text(life_item_3_enc)         as life_item_3,
         app.decrypt_text(note_enc)                as note,
         logged_at,
         level,
         starred,
         created_at,
         updated_at
  from public.gratitude_entries_data;

create or replace function public.gratitude_entries_guard(
  p_item_1 text, p_item_2 text, p_item_3 text, p_item_4 text, p_item_5 text,
  p_good_moment text, p_miss_if_gone text, p_hidden_good text,
  p_life_item_1 text, p_life_item_2 text, p_life_item_3 text,
  p_note text, p_events text[]
) returns void
language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  -- Per-item length caps (240). NULL slots are skipped (char_length(NULL) is NULL).
  if char_length(p_item_1) > 240 then raise exception 'gratitude item_1 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_item_2) > 240 then raise exception 'gratitude item_2 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_item_3) > 240 then raise exception 'gratitude item_3 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_item_4) > 240 then raise exception 'gratitude item_4 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_item_5) > 240 then raise exception 'gratitude item_5 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_good_moment)  > 240 then raise exception 'gratitude good_moment exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_miss_if_gone) > 240 then raise exception 'gratitude miss_if_gone exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_hidden_good)  > 240 then raise exception 'gratitude hidden_good exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_life_item_1)  > 240 then raise exception 'gratitude life_item_1 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_life_item_2)  > 240 then raise exception 'gratitude life_item_2 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_life_item_3)  > 240 then raise exception 'gratitude life_item_3 exceeds 240 characters' using errcode='check_violation'; end if;
  if char_length(p_note) > 2000 then raise exception 'gratitude note exceeds 2000 characters' using errcode='check_violation'; end if;
  -- Per-item "not blank if set": a set slot must be '' or non-blank (reject all-whitespace).
  -- Mirrors gratitude_entries_item_N_not_blank_if_set (item_2..5 originally).
  if p_item_2 is not null and not (p_item_2 = '' or length(btrim(p_item_2)) > 0) then raise exception 'gratitude item_2 must not be blank if set' using errcode='check_violation'; end if;
  if p_item_3 is not null and not (p_item_3 = '' or length(btrim(p_item_3)) > 0) then raise exception 'gratitude item_3 must not be blank if set' using errcode='check_violation'; end if;
  if p_item_4 is not null and not (p_item_4 = '' or length(btrim(p_item_4)) > 0) then raise exception 'gratitude item_4 must not be blank if set' using errcode='check_violation'; end if;
  if p_item_5 is not null and not (p_item_5 = '' or length(btrim(p_item_5)) > 0) then raise exception 'gratitude item_5 must not be blank if set' using errcode='check_violation'; end if;
  -- At least one item must be non-blank (mirrors gratitude_entries_at_least_one_item).
  -- NULL slots count as blank here (coalesce for the *check only*; storage keeps NULL).
  if not (length(btrim(coalesce(p_item_1, ''))) > 0 or length(btrim(coalesce(p_item_2, ''))) > 0
          or length(btrim(coalesce(p_item_3, ''))) > 0 or length(btrim(coalesce(p_item_4, ''))) > 0
          or length(btrim(coalesce(p_item_5, ''))) > 0) then
    raise exception 'gratitude entry must have at least one item' using errcode='check_violation';
  end if;
  -- events cardinality cap (<= 3); mirrors gratitude_entries_events_count.
  if p_events is not null and cardinality(p_events) > 3 then
    raise exception 'gratitude events exceeds 3 entries' using errcode='check_violation';
  end if;
end; $$;

create or replace function public.gratitude_entries_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.gratitude_entries_guard(
    new.item_1, new.item_2, new.item_3, new.item_4, new.item_5,
    new.good_moment, new.miss_if_gone, new.hidden_good,
    new.life_item_1, new.life_item_2, new.life_item_3, new.note, new.events);
  insert into public.gratitude_entries_data (
    id, user_id,
    item_1_enc, item_2_enc, item_3_enc, item_4_enc, item_5_enc, events_enc,
    good_moment_enc, miss_if_gone_enc, hidden_good_enc,
    life_item_1_enc, life_item_2_enc, life_item_3_enc, note_enc,
    logged_at, level, starred, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(new.item_1),  -- NO coalesce: NULL slot stays NULL
    app.encrypt_text(new.item_2),
    app.encrypt_text(new.item_3),
    app.encrypt_text(new.item_4),
    app.encrypt_text(new.item_5),
    app.encrypt_text(new.events::text),
    app.encrypt_text(new.good_moment),
    app.encrypt_text(new.miss_if_gone),
    app.encrypt_text(new.hidden_good),
    app.encrypt_text(new.life_item_1),
    app.encrypt_text(new.life_item_2),
    app.encrypt_text(new.life_item_3),
    app.encrypt_text(new.note),
    coalesce(new.logged_at, timezone('utc', now())),
    coalesce(new.level, 3),
    coalesce(new.starred, false),
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now()))
  returning id, user_id, logged_at, level, starred, created_at, updated_at
    into new.id, new.user_id, new.logged_at, new.level, new.starred, new.created_at, new.updated_at;
  return new;
end; $$;
drop trigger if exists gratitude_entries_ins on public.gratitude_entries;
create trigger gratitude_entries_ins instead of insert on public.gratitude_entries
  for each row execute function public.gratitude_entries_ins();

create or replace function public.gratitude_entries_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  perform public.gratitude_entries_guard(
    new.item_1, new.item_2, new.item_3, new.item_4, new.item_5,
    new.good_moment, new.miss_if_gone, new.hidden_good,
    new.life_item_1, new.life_item_2, new.life_item_3, new.note, new.events);
  update public.gratitude_entries_data set
    item_1_enc       = app.encrypt_text(new.item_1),  -- NO coalesce: NULL slot stays NULL
    item_2_enc       = app.encrypt_text(new.item_2),
    item_3_enc       = app.encrypt_text(new.item_3),
    item_4_enc       = app.encrypt_text(new.item_4),
    item_5_enc       = app.encrypt_text(new.item_5),
    events_enc       = app.encrypt_text(new.events::text),
    good_moment_enc  = app.encrypt_text(new.good_moment),
    miss_if_gone_enc = app.encrypt_text(new.miss_if_gone),
    hidden_good_enc  = app.encrypt_text(new.hidden_good),
    life_item_1_enc  = app.encrypt_text(new.life_item_1),
    life_item_2_enc  = app.encrypt_text(new.life_item_2),
    life_item_3_enc  = app.encrypt_text(new.life_item_3),
    note_enc         = app.encrypt_text(new.note),
    logged_at        = new.logged_at,
    level            = new.level,
    starred          = new.starred,
    created_at       = new.created_at
   where id = old.id;   -- set_gratitude_entries_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists gratitude_entries_upd on public.gratitude_entries;
create trigger gratitude_entries_upd instead of update on public.gratitude_entries
  for each row execute function public.gratitude_entries_upd();

create or replace function public.gratitude_entries_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.gratitude_entries_data where id = old.id;
  return old;
end; $$;
drop trigger if exists gratitude_entries_del on public.gratitude_entries;
create trigger gratitude_entries_del instead of delete on public.gratitude_entries
  for each row execute function public.gratitude_entries_del();

grant select, insert, update, delete on public.gratitude_entries to authenticated;
notify pgrst, 'reload schema';

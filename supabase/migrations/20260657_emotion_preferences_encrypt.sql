-- Encrypt emotion_preferences free-text at rest. Same pattern as the journal pilot (20260587):
-- bytea ciphertext column + a transparent same-named decrypting view + INSTEAD OF triggers.
-- Infra (Vault key, app.encrypt_text/app.decrypt_text, schema-USAGE + EXECUTE grants) already
-- exists globally from Phase 1.
--
-- ENCRYPT (text, NULLABLE — default/built-in emotions carry NULL name, which MUST round-trip to
--   NULL, so no coalesce-to-'' anywhere):
--   name  (the user's custom display name for an emotion)
-- PASS-THROUGH: id (PK), user_id, emotion_id, emoji (a short glyph, not free text), position,
--   removed, is_custom, created_at, updated_at.
-- UPSERT TABLE: UNIQUE (user_id, emotion_id); the client .upsert(onConflict:'user_id,emotion_id').
--   A view cannot be the target of INSERT ... ON CONFLICT (PostgREST upsert), so the merge is
--   resolved inside the INSTEAD OF INSERT trigger against the base table's real unique constraint,
--   and the repository switches .upsert() -> .insert().
-- PARTIAL-UPDATE SEMANTICS (critical): the repo issues PARTIAL upserts — setEmotionOrder writes
--   only {position}; useRemoveEmotion writes only {removed}; the add/edit flows write {name,emoji,
--   position,...}. A row trigger over a view cannot see column-presence, so an omitted column
--   arrives as NULL. To preserve PostgREST's "ON CONFLICT DO UPDATE SET <provided columns only>"
--   behaviour, the conflict branch uses coalesce(excluded.col, base.col) for every optionally-
--   omitted column. This is SAFE here because NO client flow ever sets name/emoji to NULL to
--   *clear* them (custom emotions are added with a name+emoji or hard-deleted; the edit flow
--   always supplies non-empty name+emoji) and `removed`/`position`/`is_custom` are never set to a
--   NULL "clear" — NULL only ever means "omitted, preserve". A brand-new row created through the
--   partial path takes its column defaults via the INSERT branch's coalesce(...,default).
-- set_emotion_preferences_updated_at BEFORE-UPDATE trigger travels with the rename; the inner
--   update fires it. (The INSERT trigger sets updated_at explicitly on the conflict branch.)

-- Step A: add bytea ciphertext column alongside the existing plaintext (additive).
alter table public.emotion_preferences add column if not exists name_enc bytea;

-- Step B: backfill ciphertext from existing plaintext (NULL name -> NULL ciphertext; idempotent).
update public.emotion_preferences
  set name_enc = app.encrypt_text(name)
  where name_enc is null and name is not null;

-- Step C: swap to a transparent encrypted view (same name, so the client is untouched).
alter table public.emotion_preferences rename to emotion_preferences_data;
alter table public.emotion_preferences_data enable row level security;
-- name is already NULLABLE; no NOT NULL to relax.

-- Decrypt-on-read view (security_invoker => base-table RLS applies to the caller).
create or replace view public.emotion_preferences with (security_invoker = true) as
  select id,
         user_id,
         emotion_id,
         app.decrypt_text(name_enc) as name,
         emoji,
         position,
         removed,
         is_custom,
         created_at,
         updated_at
  from public.emotion_preferences_data;

create or replace function public.emotion_preferences_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare merged_name_enc bytea;
begin
  insert into public.emotion_preferences_data (
    id, user_id, emotion_id, name_enc, emoji, position, removed, is_custom, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()), new.emotion_id,
    app.encrypt_text(new.name),               -- NULL name -> NULL ciphertext (round-trips)
    new.emoji,
    coalesce(new.position, 0),
    coalesce(new.removed, false),
    coalesce(new.is_custom, false),
    coalesce(new.created_at, now()), now())
  on conflict (user_id, emotion_id) do update set
    -- Preserve omitted columns (NULL arriving from a partial upsert) by coalescing to the existing
    -- base-row value; only explicitly-supplied (non-NULL) values overwrite. We reference NEW.*
    -- (raw, where NULL means "omitted") rather than excluded.* because the INSERT VALUES above
    -- coalesced the NOT NULL columns (position/removed/is_custom) to their defaults, which would
    -- otherwise mask an omission as a real value and clobber the preserved row.
    name_enc   = coalesce(app.encrypt_text(new.name), emotion_preferences_data.name_enc),
    emoji      = coalesce(new.emoji,     emotion_preferences_data.emoji),
    position   = coalesce(new.position,  emotion_preferences_data.position),
    removed    = coalesce(new.removed,   emotion_preferences_data.removed),
    is_custom  = coalesce(new.is_custom, emotion_preferences_data.is_custom),
    updated_at = now()
  -- Return the MERGED row back into NEW so PostgREST's .insert().select() reflects the coalesced
  -- values (a partial upsert preserves the prior name/emoji/position rather than returning NULLs).
  returning id, user_id, name_enc, emoji, position, removed, is_custom, created_at, updated_at
    into new.id, new.user_id, merged_name_enc, new.emoji, new.position, new.removed,
         new.is_custom, new.created_at, new.updated_at;
  new.name := app.decrypt_text(merged_name_enc);
  return new;
end; $$;
drop trigger if exists emotion_preferences_ins on public.emotion_preferences;
create trigger emotion_preferences_ins instead of insert on public.emotion_preferences
  for each row execute function public.emotion_preferences_ins();

create or replace function public.emotion_preferences_upd() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.emotion_preferences_data set
    emotion_id = new.emotion_id,
    name_enc   = app.encrypt_text(new.name),  -- NULL name -> NULL ciphertext (round-trips)
    emoji      = new.emoji,
    position   = new.position,
    removed    = new.removed,
    is_custom  = new.is_custom,
    created_at = new.created_at
   where id = old.id;   -- set_emotion_preferences_updated_at BEFORE-UPDATE trigger refreshes updated_at
  return new;
end; $$;
drop trigger if exists emotion_preferences_upd on public.emotion_preferences;
create trigger emotion_preferences_upd instead of update on public.emotion_preferences
  for each row execute function public.emotion_preferences_upd();

create or replace function public.emotion_preferences_del() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  delete from public.emotion_preferences_data where id = old.id;
  return old;
end; $$;
drop trigger if exists emotion_preferences_del on public.emotion_preferences;
create trigger emotion_preferences_del instead of delete on public.emotion_preferences
  for each row execute function public.emotion_preferences_del();

grant select, insert, update, delete on public.emotion_preferences to authenticated;
notify pgrst, 'reload schema';

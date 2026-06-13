-- ============================================================================
-- Full-audit (2026-06-10) — phase 2 DB-layer fixes.
--
-- NOT LOCALLY VERIFIED: supabase/** is excluded from the local gate (tsc / eslint
-- / jest) and there is no local Postgres in this workspace, so this migration was
-- authored from the schema but must be validated against a real Supabase instance
-- before deploy. It is additive and idempotent-friendly (ALTER / CREATE OR REPLACE
-- / CREATE INDEX IF NOT EXISTS / policy drop+recreate).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- #15 / #16 — Field-crypto helpers defaulted to VOLATILE.
-- A volatile function in a decrypt-on-read view's target list blocks the planner
-- from pulling the subquery up (is_simple_subquery) and from pruning unused output
-- columns (remove_unused_subquery_outputs). Net effect: `.order().limit(N)` stayed
-- OUTSIDE the view, so every list query decrypted a user's ENTIRE history before
-- the LIMIT, and count(*) decrypted every row. encryption_key() and decrypt_text()
-- are semantically STABLE (same input -> same output within a statement, no side
-- effects); only encrypt_text() is genuinely VOLATILE (pgp_sym_encrypt salts each
-- call). Marking them STABLE lets the view flatten so decrypt cost scales with the
-- LIMIT, not the user's lifetime row count. Decrypted output is byte-identical.
--
-- #89 — encrypt_text/decrypt_text called pgcrypto UNQUALIFIED with `public` ahead
-- of `extensions` in search_path (a function-shadowing vector). Schema-qualify the
-- pgcrypto calls as extensions.* and drop `public` from these helpers' search_path
-- (they reference only extensions.* and the fully-qualified app.encryption_key()).
-- ----------------------------------------------------------------------------

alter function app.encryption_key() stable;

create or replace function app.encrypt_text(plaintext text)
returns bytea
language sql
security definer
set search_path = pg_catalog, extensions
as $$
  select case when plaintext is null then null
              else extensions.pgp_sym_encrypt(plaintext, app.encryption_key()) end;
$$;
revoke execute on function app.encrypt_text(text) from public;
grant execute on function app.encrypt_text(text) to authenticated;

create or replace function app.decrypt_text(ciphertext bytea)
returns text
language sql
security definer
stable
set search_path = pg_catalog, extensions
as $$
  select case when ciphertext is null then null
              else extensions.pgp_sym_decrypt(ciphertext, app.encryption_key()) end;
$$;
revoke execute on function app.decrypt_text(bytea) from public;
grant execute on function app.decrypt_text(bytea) to authenticated;

-- ----------------------------------------------------------------------------
-- #17 — mindfulness_sessions had no composite index for its hot read path
-- (user_id + newest-first by completed_at), so every breathing/grounding/Tools
-- read sequentially scanned the whole table.
-- ----------------------------------------------------------------------------
create index if not exists mindfulness_sessions_user_completed_idx
  on public.mindfulness_sessions (user_id, completed_at desc);

-- ----------------------------------------------------------------------------
-- #86 — plan_items RLS applied to PUBLIC (incl. the anon role); the 20260564
-- "scope to authenticated" hardening pass missed this table. Re-create the policy
-- restricted to `authenticated` and add the WITH CHECK the FOR ALL policy lacked.
-- ----------------------------------------------------------------------------
drop policy if exists "Users manage their own plan items" on public.plan_items;
create policy "Users manage their own plan items"
  on public.plan_items for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- #2 — Recovery plan could never be saved. recovery_plans is now a decrypting
-- VIEW with an INSTEAD OF INSERT trigger; the client upsert emits
-- INSERT ... ON CONFLICT (user_id) against the view, which has no unique
-- constraint -> 42P10. Mirror every other singleton encrypted table (values_profile,
-- act_program_state, profiles): give the trigger's base-table INSERT an
-- ON CONFLICT (user_id) DO UPDATE merge (recovery_plans_data has UNIQUE(user_id)),
-- and switch the client to a plain .insert() (see repository.ts in this change).
-- ----------------------------------------------------------------------------
create or replace function public.recovery_plans_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if char_length(new.personal_slogan) > 500 then
    raise exception 'recovery plan personal_slogan exceeds 500 characters' using errcode = 'check_violation';
  end if;
  insert into public.recovery_plans_data (
    id, user_id, recovery_keys_enc, personal_slogan_enc, strategy_integration_notes_enc,
    maintenance_commitments_enc, created_at, updated_at)
  values (
    coalesce(new.id, gen_random_uuid()), coalesce(new.user_id, auth.uid()),
    app.encrypt_text(coalesce(new.recovery_keys, array[]::text[])::text),
    app.encrypt_text(coalesce(new.personal_slogan, '')),
    app.encrypt_text(coalesce(new.strategy_integration_notes, '{}'::jsonb)::text),
    app.encrypt_text(coalesce(new.maintenance_commitments, array[]::text[])::text),
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  on conflict (user_id) do update set
    recovery_keys_enc              = excluded.recovery_keys_enc,
    personal_slogan_enc            = excluded.personal_slogan_enc,
    strategy_integration_notes_enc = excluded.strategy_integration_notes_enc,
    maintenance_commitments_enc    = excluded.maintenance_commitments_enc,
    updated_at                     = timezone('utc', now())
  returning id, user_id, created_at, updated_at into new.id, new.user_id, new.created_at, new.updated_at;
  return new;
end; $$;

-- ----------------------------------------------------------------------------
-- #3 — Device push-token upsert collided across accounts. expo_push_token is
-- GLOBALLY unique (one per device, not per account); the client upsert with
-- onConflict:"expo_push_token" hit a prior owner's row, which the new user's RLS
-- UPDATE policy made invisible -> 42501. The new user could never register (so got
-- no reminders), and the prior owner's row kept delivering THEIR reminders to a
-- device the new user now holds. Provide a SECURITY DEFINER claim function that
-- takes the token over atomically (delete any prior row for this token, regardless
-- of owner, then insert fresh for the caller — also resetting the per-reminder
-- dedup keys so the new owner isn't suppressed). The client calls this instead of
-- upserting directly (see repository.ts). NOTE: releasing the token on sign-out
-- (deleteDevicePushToken in signOut) is a separate hardening step not included here.
-- ----------------------------------------------------------------------------
create or replace function public.claim_device_push_token(
  p_token text,
  p_platform text,
  p_time_zone text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- Take the device token over from any prior owner (per-device, not per-account).
  delete from public.device_push_tokens where expo_push_token = p_token;
  insert into public.device_push_tokens (user_id, expo_push_token, platform, time_zone, enabled)
  values (auth.uid(), p_token, p_platform, p_time_zone, true);
end;
$$;
revoke execute on function public.claim_device_push_token(text, text, text) from public, anon;
grant execute on function public.claim_device_push_token(text, text, text) to authenticated;

notify pgrst, 'reload schema';

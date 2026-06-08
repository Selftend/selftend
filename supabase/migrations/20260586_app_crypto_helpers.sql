-- Field-encryption helpers. Live in the `app` schema, which is NOT exposed to the
-- Data API, so these are not directly reachable by anon/authenticated via PostgREST.
--
-- SECURITY INVARIANT: The `app` schema MUST NEVER be added to the PostgREST exposed
-- schemas (PGRST_DB_SCHEMAS / [api] schemas in supabase/config.toml). Exposing it
-- would make app.decrypt_text() callable directly by clients, turning it into a
-- decryption oracle — any authenticated user could decrypt arbitrary ciphertext,
-- bypassing the RLS boundary entirely. Keep `app` out of the API surface at all times.
create schema if not exists app;

-- Reads the Vault key. SECURITY DEFINER so callers never see the key. Callable only
-- by the other definer helpers (postgres owns all three), not by app roles.
create or replace function app.encryption_key()
returns text
language sql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'app_field_encryption_key' limit 1;
$$;
revoke execute on function app.encryption_key() from public;

create or replace function app.encrypt_text(plaintext text)
returns bytea
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  select case when plaintext is null then null
              else pgp_sym_encrypt(plaintext, app.encryption_key()) end;
$$;
revoke execute on function app.encrypt_text(text) from public;
grant execute on function app.encrypt_text(text) to authenticated;

create or replace function app.decrypt_text(ciphertext bytea)
returns text
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  select case when ciphertext is null then null
              else pgp_sym_decrypt(ciphertext, app.encryption_key()) end;
$$;
revoke execute on function app.decrypt_text(bytea) from public;
grant execute on function app.decrypt_text(bytea) to authenticated;

-- Test-only probe so the integration suite can exercise the round trip via RPC.
create or replace function public.app_crypto_roundtrip_probe(sample text)
returns text
language sql
security definer
set search_path = pg_catalog, public
as $$
  select app.decrypt_text(app.encrypt_text(sample));
$$;
revoke execute on function public.app_crypto_roundtrip_probe(text) from public, anon;
grant execute on function public.app_crypto_roundtrip_probe(text) to authenticated, service_role;

notify pgrst, 'reload schema';

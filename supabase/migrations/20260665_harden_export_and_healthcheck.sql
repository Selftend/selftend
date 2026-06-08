-- Harden the export function chain and replace the test probe with a real health-check.
--
-- Fix 1 (LOW-2): Revoke anon/public EXECUTE on the entire export_user_data chain.
-- The chain links (export_user_data_before_*) are called only internally by the chain
-- runner (SECURITY DEFINER, owned by postgres), so they do not need an authenticated
-- grant. The head function export_user_data() keeps its authenticated grant so users
-- can invoke it via PostgREST to download their own data.
--
-- Fix 2 (INFO-2): Drop the test-artifact app_crypto_roundtrip_probe(text) that echoed
-- arbitrary caller-supplied input through encrypt/decrypt, and replace it with a real
-- production health-check that uses a fixed known-good string.

-- ---------------------------------------------------------------------------
-- LOW-2: Revoke anon / public EXECUTE on the export chain
-- ---------------------------------------------------------------------------

revoke execute on function public.export_user_data() from public, anon;
revoke execute on function public.export_user_data_before_act_plan_widget() from public, anon;
revoke execute on function public.export_user_data_before_emotion_prefs() from public, anon;
revoke execute on function public.export_user_data_before_gratitude_entries() from public, anon;
revoke execute on function public.export_user_data_before_gratitude_phase4_5() from public, anon;
revoke execute on function public.export_user_data_before_habits() from public, anon;
revoke execute on function public.export_user_data_before_meditation_tmi() from public, anon;
revoke execute on function public.export_user_data_before_module_restore() from public, anon;
revoke execute on function public.export_user_data_before_push_tokens() from public, anon;
revoke execute on function public.export_user_data_before_tool_reminders() from public, anon;

-- The head function remains callable by authenticated users (their export right).
grant execute on function public.export_user_data() to authenticated;

-- ---------------------------------------------------------------------------
-- INFO-2: Replace test probe with a production-safe health-check
-- ---------------------------------------------------------------------------

drop function if exists public.app_crypto_roundtrip_probe(text);

-- Returns true when the crypto stack (Vault key + pgp helpers) round-trips
-- a fixed constant successfully; false or an exception if the stack is broken.
create or replace function public.app_encryption_healthcheck()
returns boolean
language sql
security definer
set search_path = pg_catalog, public
as $$
  select app.decrypt_text(app.encrypt_text('healthcheck')) = 'healthcheck';
$$;

revoke execute on function public.app_encryption_healthcheck() from public, anon;
grant execute on function public.app_encryption_healthcheck() to authenticated, service_role;

notify pgrst, 'reload schema';

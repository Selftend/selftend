-- ============================================================================
-- Make role privileges EXPLICIT so a fresh `supabase db reset` matches production.
--
-- Older Supabase Postgres images applied broad default privileges granting
-- anon/authenticated/service_role full DML on objects created in `public`, and the
-- schema's migrations quietly relied on that: the security_invoker decrypt views
-- require the INVOKING role to hold privileges on the underlying `*_data` base tables,
-- and the reminder-cron entrypoints are called by service_role. Newer images (PG 17.x)
-- no longer apply those broad grants, so on a clean reset (CI integration + e2e) every
-- encrypted-view read/write and the cron RPCs fail with 42501 permission denied — even
-- though production (provisioned on an older image) already has the grants.
--
-- This migration restores the grants explicitly, so the schema is correct on ANY image.
-- It is idempotent on production (those grants are already present). RLS stays enabled on
-- every table, so anon/authenticated still only reach their own rows; service_role bypasses
-- RLS exactly as before. NOT a behavior change — it makes an implicit dependency explicit.
-- ============================================================================

-- Table + view DML for the API roles (RLS does the per-user gating for anon/authenticated).
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

-- Cover tables added by future migrations too (mirrors the historical Supabase default).
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- The reminder-cron entrypoints are invoked with the service-role key. 20260508 revoked them
-- from public/anon/authenticated and relied on service_role's implicit execute grant, which the
-- newer image no longer provides — grant it explicitly (intent: service_role only).
grant execute on function public.invoke_send_web_reminders() to service_role;
grant execute on function public.schedule_send_web_reminders_cron() to service_role;

notify pgrst, 'reload schema';

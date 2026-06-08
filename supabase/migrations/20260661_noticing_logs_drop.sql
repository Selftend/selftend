-- Batch F cleanup: noticing_logs.
--
-- Preflight finding (2026-06-08): public.noticing_logs DOES NOT EXIST in the schema (it was never
-- created locally / already removed), and the live export_user_data() does NOT reference it
-- (`select pg_get_functiondef('public.export_user_data()'::regprocedure) ~ 'noticing_logs'` => f).
-- A grep of src/ finds no client references either (only unrelated "noticing" prose in i18n/CBT
-- copy). There is therefore nothing to encrypt and nothing in the export chain to break.
--
-- This DROP is a safe no-op when the table is already absent; it is kept (idempotent) so the
-- intent is recorded and the version sequence stays uniform. No export-chain edit is required
-- because the export does not select this table.

drop table if exists public.noticing_logs cascade;

notify pgrst, 'reload schema';

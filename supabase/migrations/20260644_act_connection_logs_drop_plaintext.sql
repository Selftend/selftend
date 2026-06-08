-- Drop the now-superseded plaintext columns on act_connection_logs_data (encrypted in 20260643).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_connection_logs_data drop column if exists activity_context;
alter table public.act_connection_logs_data drop column if exists notices_from_senses;
alter table public.act_connection_logs_data drop column if exists notes;
notify pgrst, 'reload schema';

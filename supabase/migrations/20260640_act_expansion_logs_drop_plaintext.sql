-- Drop the now-superseded plaintext columns on act_expansion_logs_data (encrypted in 20260639).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_expansion_logs_data drop column if exists emotion;
alter table public.act_expansion_logs_data drop column if exists body_sensation;
alter table public.act_expansion_logs_data drop column if exists notes;
notify pgrst, 'reload schema';

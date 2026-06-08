-- Drop the now-superseded plaintext columns on act_defusion_logs_data (encrypted in 20260637).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_defusion_logs_data drop column if exists fused_thought;
alter table public.act_defusion_logs_data drop column if exists defused_version;
alter table public.act_defusion_logs_data drop column if exists notes;
notify pgrst, 'reload schema';

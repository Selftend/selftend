-- Drop the now-superseded plaintext column on act_program_state_data (encrypted in 20260635).
-- The transparent view + INSTEAD OF triggers have fully replaced it; the integration test is green.
alter table public.act_program_state_data drop column if exists primary_concerns;
notify pgrst, 'reload schema';

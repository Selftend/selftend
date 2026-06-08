-- Drop the now-superseded plaintext column on act_action_steps_data (encrypted in 20260651).
-- The transparent view + INSTEAD OF triggers have fully replaced it; the integration test is green.
alter table public.act_action_steps_data drop column if exists description;
notify pgrst, 'reload schema';

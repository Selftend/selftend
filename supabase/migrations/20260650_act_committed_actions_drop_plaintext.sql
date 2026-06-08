-- Drop the now-superseded plaintext columns on act_committed_actions_data (encrypted in 20260649).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_committed_actions_data drop column if exists title;
alter table public.act_committed_actions_data drop column if exists description;
alter table public.act_committed_actions_data drop column if exists obstacles;
notify pgrst, 'reload schema';

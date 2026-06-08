-- Drop the now-superseded plaintext columns on act_value_entries_data (encrypted in 20260647).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_value_entries_data drop column if exists value_statement;
alter table public.act_value_entries_data drop column if exists current_actions_note;
alter table public.act_value_entries_data drop column if exists desired_actions_note;
alter table public.act_value_entries_data drop column if exists barriers;
notify pgrst, 'reload schema';

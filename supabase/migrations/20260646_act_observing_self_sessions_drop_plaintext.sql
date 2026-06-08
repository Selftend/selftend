-- Drop the now-superseded plaintext columns on act_observing_self_sessions_data (encrypted in 20260645).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_observing_self_sessions_data drop column if exists what_was_observed;
alter table public.act_observing_self_sessions_data drop column if exists notes;
notify pgrst, 'reload schema';

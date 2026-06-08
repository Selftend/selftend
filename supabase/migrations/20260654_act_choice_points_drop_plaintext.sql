-- Drop the now-superseded plaintext columns on act_choice_points_data (encrypted in 20260653).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
alter table public.act_choice_points_data drop column if exists hooks;
alter table public.act_choice_points_data drop column if exists away_moves;
alter table public.act_choice_points_data drop column if exists toward_moves;
alter table public.act_choice_points_data drop column if exists notes;
notify pgrst, 'reload schema';

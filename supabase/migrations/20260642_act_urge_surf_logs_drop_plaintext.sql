-- Drop the now-superseded plaintext columns on act_urge_surf_logs_data (encrypted in 20260641).
-- The transparent view + INSTEAD OF triggers have fully replaced them; the integration test is green.
-- "trigger" is a reserved word — quoted.
alter table public.act_urge_surf_logs_data drop column if exists urge_description;
alter table public.act_urge_surf_logs_data drop column if exists "trigger";
alter table public.act_urge_surf_logs_data drop column if exists surfing_notes;
notify pgrst, 'reload schema';

-- Drop the now-redundant plaintext column on breathing_exercises_data after the encrypted view
-- (20260659) was verified by the per-table integration test. The bytea name_enc column is the
-- sole at-rest copy from here on. Plain DROP (no CASCADE): the view/triggers reference name_enc,
-- not the plaintext column.

alter table public.breathing_exercises_data drop column if exists name;

notify pgrst, 'reload schema';

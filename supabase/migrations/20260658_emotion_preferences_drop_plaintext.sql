-- Drop the now-redundant plaintext column on emotion_preferences_data after the encrypted view
-- (20260657) was verified by the per-table integration test (including the NULL-name round-trip
-- and the partial-update preservation paths). The bytea name_enc column is the sole at-rest copy
-- from here on. Plain DROP (no CASCADE): the view/triggers reference name_enc, not the plaintext.

alter table public.emotion_preferences_data drop column if exists name;

notify pgrst, 'reload schema';

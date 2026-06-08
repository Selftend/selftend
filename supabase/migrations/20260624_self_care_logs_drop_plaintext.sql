-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- self-care free-text remains at rest. Plain DROP (no CASCADE): fails loudly if anything
-- unexpected still depends on these columns. The social_notes_len CHECK references social_notes
-- and is dropped with it; the cap now lives in the self_care_logs_ins/upd INSTEAD OF triggers.
alter table public.self_care_logs_data drop column if exists exercise_type;
alter table public.self_care_logs_data drop column if exists social_notes;
alter table public.self_care_logs_data drop column if exists meaningful_activity;
notify pgrst, 'reload schema';

-- Plaintext is fully superseded by note_enc + the decrypting view. Remove it so no cleartext
-- habit-log note remains at rest. Plain DROP (no CASCADE): fails loudly if anything unexpected
-- still depends on it. The habit_logs_note_length CHECK references this column and is dropped
-- with it; the cap now lives in the habit_logs_ins/upd INSTEAD OF triggers.
alter table public.habit_logs_data drop column if exists note;
notify pgrst, 'reload schema';

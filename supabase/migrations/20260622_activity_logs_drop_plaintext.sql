-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- activity-log free-text remains at rest. Plain DROP (no CASCADE): fails loudly if anything
-- unexpected still depends on these columns. The activity_name_len / notes_len CHECK constraints
-- reference these columns and are dropped with them; the caps now live in the
-- activity_logs_ins/upd INSTEAD OF triggers.
alter table public.activity_logs_data drop column if exists activity_name;
alter table public.activity_logs_data drop column if exists notes;
notify pgrst, 'reload schema';

-- Plaintext is fully superseded by notes_enc + the decrypting view. Remove it so no cleartext
-- sleep-log notes remain at rest. Plain DROP (no CASCADE): fails loudly if anything unexpected
-- still depends on it.
alter table public.sleep_logs_data drop column if exists notes;
notify pgrst, 'reload schema';

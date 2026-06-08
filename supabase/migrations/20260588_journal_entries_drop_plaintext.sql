-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- journal content remains at rest. Plain DROP (no CASCADE): if anything unexpected still
-- depends on these columns, this fails loudly rather than silently destroying it.
alter table public.journal_entries_data drop column if exists title;
alter table public.journal_entries_data drop column if exists body;
notify pgrst, 'reload schema';

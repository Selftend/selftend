-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- mood-log free-text remains at rest. Plain DROP (no CASCADE): if anything unexpected still
-- depends on these columns, this fails loudly rather than silently destroying it.
-- The *_len CHECK constraints reference these columns and are dropped with them; the caps now
-- live in the mood_logs_ins/upd INSTEAD OF triggers.
alter table public.mood_logs_data drop column if exists notes;
alter table public.mood_logs_data drop column if exists situation;
alter table public.mood_logs_data drop column if exists thoughts;
alter table public.mood_logs_data drop column if exists behaviours;
alter table public.mood_logs_data drop column if exists bodily_sensations;
notify pgrst, 'reload schema';

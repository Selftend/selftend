-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- thought-record content remains at rest. Plain DROP (no CASCADE): fails loudly if anything
-- unexpected still depends on these columns. The *_len CHECK constraints reference these columns
-- and drop with them; the caps now live in the thought_records_ins/upd INSTEAD OF triggers.
alter table public.thought_records_data drop column if exists situation;
alter table public.thought_records_data drop column if exists balanced_thought;
alter table public.thought_records_data drop column if exists outcome_notes;
alter table public.thought_records_data drop column if exists evidence_for;
alter table public.thought_records_data drop column if exists evidence_against;
alter table public.thought_records_data drop column if exists nats;
notify pgrst, 'reload schema';

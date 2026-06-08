-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- worry-entry content remains at rest. Plain DROP (no CASCADE). The *_len CHECK constraints
-- reference these columns and drop with them; the caps now live in the INSTEAD OF triggers.
alter table public.worry_entries_data drop column if exists worry_statement;
alter table public.worry_entries_data drop column if exists coping_statement;
alter table public.worry_entries_data drop column if exists evidence_for;
alter table public.worry_entries_data drop column if exists evidence_against;
alter table public.worry_entries_data drop column if exists action_steps;
notify pgrst, 'reload schema';

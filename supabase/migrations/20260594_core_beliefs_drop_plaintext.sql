-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- core-belief content remains at rest. Plain DROP (no CASCADE). The *_len CHECK constraints
-- reference these columns and drop with them; the caps now live in the INSTEAD OF triggers.
alter table public.core_beliefs_data drop column if exists belief_statement;
alter table public.core_beliefs_data drop column if exists alternative_belief;
alter table public.core_beliefs_data drop column if exists reinforcement_plan;
alter table public.core_beliefs_data drop column if exists triggering_situations;
alter table public.core_beliefs_data drop column if exists evidence_for;
alter table public.core_beliefs_data drop column if exists evidence_against;
notify pgrst, 'reload schema';

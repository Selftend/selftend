-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- challenge-plan free-text remains at rest. coping_steps (text[]) and challenge_description (text)
-- are both encrypted whole. Plain DROP (no CASCADE): fails loudly if anything unexpected still
-- depends on these columns. (Neither column has a length CHECK to migrate.)
alter table public.challenge_plans_data drop column if exists challenge_description;
alter table public.challenge_plans_data drop column if exists coping_steps;
notify pgrst, 'reload schema';

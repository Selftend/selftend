-- Drop the now-unused plaintext columns from goals_data. The encrypted view (20260625) has
-- served reads/writes from the *_enc ciphertext columns since it was applied and the goals
-- encryption integration test is green. Plain drop (no CASCADE): the goals_title_len /
-- goals_description_len CHECK constraints (NOT VALID) on these columns drop with them; their
-- caps now live in the INSTEAD OF triggers.

alter table public.goals_data drop column if exists title;
alter table public.goals_data drop column if exists description;

notify pgrst, 'reload schema';

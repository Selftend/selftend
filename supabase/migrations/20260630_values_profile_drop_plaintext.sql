-- Drop the now-unused plaintext jsonb columns from values_profile_data. The encrypted view
-- (20260629) has served reads/writes from the *_enc ciphertext columns since it was applied and
-- the values_profile encryption integration test (incl. the upsert-merge case) is green.
-- Plain drop (no CASCADE): the UNIQUE (user_id) constraint that backs the upsert merge is on
-- user_id, not these columns, so it is unaffected.

alter table public.values_profile_data drop column if exists personal_values;
alter table public.values_profile_data drop column if exists priority_values;

notify pgrst, 'reload schema';

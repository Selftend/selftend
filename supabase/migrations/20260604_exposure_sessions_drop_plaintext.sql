-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- exposure-session free-text remains at rest. Plain DROP (no CASCADE): fails loudly if anything
-- unexpected still depends on these columns. (Neither column has a length CHECK to migrate.)
alter table public.exposure_sessions_data drop column if exists safety_behavior_description;
alter table public.exposure_sessions_data drop column if exists notes;
notify pgrst, 'reload schema';

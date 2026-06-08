-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- exposure-hierarchy free-text remains at rest. Plain DROP (no CASCADE): fails loudly if anything
-- unexpected still depends on these columns. The title_len CHECK constraint references title and
-- drops with it; the cap now lives in the exposure_hierarchies_ins/upd INSTEAD OF triggers.
alter table public.exposure_hierarchies_data drop column if exists title;
alter table public.exposure_hierarchies_data drop column if exists anxiety_type;
notify pgrst, 'reload schema';

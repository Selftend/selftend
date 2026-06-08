-- Plaintext is fully superseded by description_enc + the decrypting view. Remove it so no
-- cleartext exposure-item description remains at rest. Plain DROP (no CASCADE): fails loudly if
-- anything unexpected still depends on the column. The description_len CHECK references it and
-- drops with it; the cap now lives in the exposure_items_ins/upd INSTEAD OF triggers.
alter table public.exposure_items_data drop column if exists description;
notify pgrst, 'reload schema';

-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- recovery-plan free-text remains at rest. personal_slogan (text), strategy_integration_notes
-- (jsonb), maintenance_commitments (text[]) and recovery_keys (text[]) are all encrypted whole.
-- Plain DROP (no CASCADE): fails loudly if anything unexpected still depends on these columns.
-- The personal_slogan_len CHECK references personal_slogan and drops with it; the cap now lives
-- in the recovery_plans_ins/upd INSTEAD OF triggers.
alter table public.recovery_plans_data drop column if exists personal_slogan;
alter table public.recovery_plans_data drop column if exists strategy_integration_notes;
alter table public.recovery_plans_data drop column if exists maintenance_commitments;
alter table public.recovery_plans_data drop column if exists recovery_keys;
notify pgrst, 'reload schema';

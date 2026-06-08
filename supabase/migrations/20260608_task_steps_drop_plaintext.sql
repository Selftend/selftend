-- Plaintext is fully superseded by description_enc + the decrypting view. Remove it so no
-- cleartext task-step description remains at rest. Plain DROP (no CASCADE): fails loudly if
-- anything unexpected still depends on the column. (description has no length CHECK to migrate.)
alter table public.task_steps_data drop column if exists description;
notify pgrst, 'reload schema';

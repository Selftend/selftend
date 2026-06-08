-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- anger-log content remains at rest. Plain DROP (no CASCADE). The *_len CHECK constraints
-- reference these columns and drop with them; the caps now live in the INSTEAD OF triggers.
alter table public.anger_logs_data drop column if exists trigger_text;
alter table public.anger_logs_data drop column if exists interpretation;
alter table public.anger_logs_data drop column if exists urge;
alter table public.anger_logs_data drop column if exists behavior_chosen;
alter table public.anger_logs_data drop column if exists consequence;
alter table public.anger_logs_data drop column if exists alternative_interpretation;
alter table public.anger_logs_data drop column if exists notes;
notify pgrst, 'reload schema';

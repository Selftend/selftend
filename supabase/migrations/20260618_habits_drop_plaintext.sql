-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext habit
-- free-text remains at rest. Plain DROP (no CASCADE): fails loudly if anything unexpected still
-- depends on these columns. The *_length / name_not_blank CHECK constraints reference these
-- columns and are dropped with them; the caps + not-blank guard now live in the habits_guard
-- helper invoked by the habits_ins/upd INSTEAD OF triggers.
alter table public.habits_data drop column if exists name;
alter table public.habits_data drop column if exists identity;
alter table public.habits_data drop column if exists cue_plan;
alter table public.habits_data drop column if exists stack_after;
alter table public.habits_data drop column if exists craving_pairing;
alter table public.habits_data drop column if exists two_minute_version;
alter table public.habits_data drop column if exists reward_note;
notify pgrst, 'reload schema';

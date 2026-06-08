-- Plaintext is fully superseded by *_enc + the decrypting view. Remove it so no cleartext
-- gratitude free-text remains at rest. Plain DROP (no CASCADE): if anything unexpected still
-- depends on these columns, this fails loudly rather than silently destroying it.
-- The per-column length / not_blank_if_set / at_least_one_item / events_count CHECK constraints
-- reference these columns and are dropped with them; those guards now live in the
-- gratitude_entries_guard helper invoked by the gratitude_entries_ins/upd INSTEAD OF triggers.
alter table public.gratitude_entries_data drop column if exists item_1;
alter table public.gratitude_entries_data drop column if exists item_2;
alter table public.gratitude_entries_data drop column if exists item_3;
alter table public.gratitude_entries_data drop column if exists item_4;
alter table public.gratitude_entries_data drop column if exists item_5;
alter table public.gratitude_entries_data drop column if exists events;
alter table public.gratitude_entries_data drop column if exists good_moment;
alter table public.gratitude_entries_data drop column if exists miss_if_gone;
alter table public.gratitude_entries_data drop column if exists hidden_good;
alter table public.gratitude_entries_data drop column if exists life_item_1;
alter table public.gratitude_entries_data drop column if exists life_item_2;
alter table public.gratitude_entries_data drop column if exists life_item_3;
alter table public.gratitude_entries_data drop column if exists note;
notify pgrst, 'reload schema';

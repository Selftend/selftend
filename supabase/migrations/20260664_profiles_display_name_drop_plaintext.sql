-- Drop the now-superseded plaintext display_name column on profiles_data (encrypted in 20260663).
-- The transparent view + INSTEAD OF triggers have fully replaced it; the integration test is green.
-- The profiles_display_name_len CHECK constraint is on this column and drops with it (the cap is
-- now enforced by the char_length guard inside profiles_ins()/profiles_upd()).
alter table public.profiles_data drop column if exists display_name;
notify pgrst, 'reload schema';

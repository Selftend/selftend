-- Values: add the ordered top-6 priority list, and reset the table because the
-- personal value keys change from the old curated list to the Think CBT
-- Workbook keys (existing tier selections would otherwise reference values that
-- no longer exist). This is consistent with the prior workbook-alignment
-- migration, which also did not preserve values data.

ALTER TABLE public.values_profile
  ADD COLUMN IF NOT EXISTS priority_values jsonb NOT NULL DEFAULT '[]';

DELETE FROM public.values_profile;

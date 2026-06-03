-- Positional gratitude items: item_N now maps to a fixed question N, so an entry
-- may answer a later question while leaving item_1 empty. Drop the per-item_1
-- NOT-blank check and require instead that at least one of item_1..5 is non-blank.
ALTER TABLE public.gratitude_entries
  DROP CONSTRAINT IF EXISTS gratitude_entries_item_1_not_blank;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gratitude_entries_at_least_one_item'
  ) THEN
    ALTER TABLE public.gratitude_entries
      ADD CONSTRAINT gratitude_entries_at_least_one_item
      CHECK (
        length(btrim(item_1)) > 0
        OR length(btrim(item_2)) > 0
        OR length(btrim(item_3)) > 0
        OR length(btrim(item_4)) > 0
        OR length(btrim(item_5)) > 0
      );
  END IF;
END;
$$;

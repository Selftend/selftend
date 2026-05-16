-- Phase 2: add level and level-specific prompt columns to gratitude_entries.
-- Existing rows are backfilled to level = 3 (the original practice level).
ALTER TABLE public.gratitude_entries
  ADD COLUMN IF NOT EXISTS level SMALLINT NOT NULL DEFAULT 3
    CHECK (level BETWEEN 1 AND 3),
  -- Level 1 — Noticing
  ADD COLUMN IF NOT EXISTS events TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS good_moment TEXT NOT NULL DEFAULT '',
  -- Level 2 — Reflecting & Appreciating
  ADD COLUMN IF NOT EXISTS miss_if_gone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hidden_good TEXT NOT NULL DEFAULT '',
  -- Level 3 — in-my-life items (separate from today items)
  ADD COLUMN IF NOT EXISTS life_item_1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS life_item_2 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS life_item_3 TEXT NOT NULL DEFAULT '';

ALTER TABLE public.gratitude_entries
  ADD CONSTRAINT IF NOT EXISTS gratitude_entries_good_moment_length
    CHECK (length(good_moment) <= 240),
  ADD CONSTRAINT IF NOT EXISTS gratitude_entries_miss_if_gone_length
    CHECK (length(miss_if_gone) <= 240),
  ADD CONSTRAINT IF NOT EXISTS gratitude_entries_hidden_good_length
    CHECK (length(hidden_good) <= 240),
  ADD CONSTRAINT IF NOT EXISTS gratitude_entries_life_item_1_length
    CHECK (length(life_item_1) <= 240),
  ADD CONSTRAINT IF NOT EXISTS gratitude_entries_life_item_2_length
    CHECK (length(life_item_2) <= 240),
  ADD CONSTRAINT IF NOT EXISTS gratitude_entries_life_item_3_length
    CHECK (length(life_item_3) <= 240);

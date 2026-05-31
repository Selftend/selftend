-- Per-user flag marking whether the default emotion set has been seeded into
-- emotion_preferences. Mirrors user_preferences.widgets_seeded: once seeding has run,
-- an emptied emotion list stays empty instead of re-seeding the defaults.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS emotions_seeded BOOLEAN NOT NULL DEFAULT FALSE;

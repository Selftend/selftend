ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme text CHECK (theme IN ('system', 'light', 'dark'));

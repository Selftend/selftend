ALTER TABLE user_preferences
  ADD COLUMN theme text CHECK (theme IN ('system', 'light', 'dark'));

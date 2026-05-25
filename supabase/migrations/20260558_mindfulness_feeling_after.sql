ALTER TABLE mindfulness_sessions
  ADD COLUMN IF NOT EXISTS feeling_after text;

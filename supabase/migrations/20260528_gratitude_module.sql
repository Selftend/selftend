-- Gratitude module: add onboarding flag and default level to user_preferences.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gratitude_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gratitude_default_level SMALLINT NOT NULL DEFAULT 1
    CHECK (gratitude_default_level BETWEEN 1 AND 3);

-- Gratitude module: add onboarding flag to user_preferences.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gratitude_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

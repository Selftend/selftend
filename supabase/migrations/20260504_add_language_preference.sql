-- Add language preference column to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN language text NOT NULL DEFAULT 'en';

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_language_check CHECK (language IN ('en', 'bg'));

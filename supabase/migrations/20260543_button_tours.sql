ALTER TABLE user_preferences
ADD COLUMN shown_button_tours text[] NOT NULL DEFAULT '{}';

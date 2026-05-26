CREATE TABLE widget_preferences (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id   TEXT        NOT NULL,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, widget_id)
);

ALTER TABLE widget_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own widget preferences"
  ON widget_preferences FOR ALL USING (auth.uid() = user_id);

CREATE INDEX widget_preferences_user_position
  ON widget_preferences (user_id, position);

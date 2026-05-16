CREATE TABLE plan_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  tool_id          TEXT        NOT NULL,
  module_id        TEXT,
  route            TEXT        NOT NULL,
  frequency        TEXT        NOT NULL DEFAULT 'daily'
                               CHECK (frequency IN ('daily', 'weekly', 'as_needed')),
  reminder_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  item_order       INTEGER     NOT NULL DEFAULT 0,
  active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own plan items"
  ON plan_items FOR ALL USING (auth.uid() = user_id);

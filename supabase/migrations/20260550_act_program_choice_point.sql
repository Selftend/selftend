-- ACT Phase 1: Choice Point map, program flags, and Drop Anchor connection technique.

-- 1. Choice Point maps (hooks / away moves / toward moves).
CREATE TABLE IF NOT EXISTS act_choice_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hooks TEXT[] NOT NULL DEFAULT '{}',
  away_moves TEXT[] NOT NULL DEFAULT '{}',
  toward_moves TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_choice_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT choice points"
  ON act_choice_points
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_choice_points_user_created
  ON act_choice_points (user_id, created_at DESC);

-- 2. Program lifecycle flags on user_preferences (mirror cbt_program_*).
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS act_program_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS act_program_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS act_program_prompt_dismissed_at timestamptz;

-- 3. Allow new connection techniques (Drop Anchor / body scan).
ALTER TABLE act_connection_logs
  DROP CONSTRAINT IF EXISTS act_connection_logs_technique_check;

ALTER TABLE act_connection_logs
  ADD CONSTRAINT act_connection_logs_technique_check
  CHECK (technique IN (
    'noticeFiveThings', 'mindfulActivity', 'tenDeepBreaths', 'dropAnchor', 'bodyScan'
  ));

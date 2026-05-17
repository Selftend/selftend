-- ACT (Acceptance and Commitment Therapy) module — Phase 1 (Foundation).
-- Based on "The Happiness Trap" by Russ Harris.
-- Creates act_program_state and act_defusion_logs, and adds act_* preference
-- fields to user_preferences.

-- 1. Per-user program state row.
CREATE TABLE IF NOT EXISTS act_program_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_principles TEXT[] NOT NULL DEFAULT '{}',
  primary_concerns TEXT[] NOT NULL DEFAULT '{}',
  myths_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  last_check_in_at TIMESTAMPTZ,
  preferred_check_in_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_program_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT program state"
  ON act_program_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Defusion log entries.
CREATE TABLE IF NOT EXISTS act_defusion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fused_thought TEXT NOT NULL DEFAULT '',
  thought_category TEXT NOT NULL DEFAULT 'other'
    CHECK (thought_category IN (
      'selfJudgment', 'worry', 'pastRegret', 'prediction', 'ruleStatement', 'other'
    )),
  fusion_level_before INT
    CHECK (fusion_level_before IS NULL OR (fusion_level_before BETWEEN 0 AND 100)),
  technique_used TEXT NOT NULL DEFAULT 'havingTheThoughtThat'
    CHECK (technique_used IN (
      'havingTheThoughtThat', 'musicalThoughts', 'namingTheStory',
      'thankingYourMind', 'sillyVoices', 'televisionScreen', 'subtitles'
    )),
  defused_version TEXT NOT NULL DEFAULT '',
  fusion_level_after INT
    CHECK (fusion_level_after IS NULL OR (fusion_level_after BETWEEN 0 AND 100)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_defusion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT defusion logs"
  ON act_defusion_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_defusion_logs_user_created
  ON act_defusion_logs (user_id, created_at DESC);

-- 3. Add act_* fields to user_preferences. Reminders default off.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS act_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS act_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS act_reminder_hour INT NOT NULL DEFAULT 19
    CHECK (act_reminder_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS act_reminder_minute INT NOT NULL DEFAULT 0
    CHECK (act_reminder_minute BETWEEN 0 AND 59),
  ADD COLUMN IF NOT EXISTS act_reminder_timezone VARCHAR;

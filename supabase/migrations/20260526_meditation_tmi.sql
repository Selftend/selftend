-- The Mind Illuminated meditation module — Phase 1 (Foundation).
-- Extends meditation_sessions, adds meditation_program_state and stage_practice_notes,
-- and adds meditation_* preference fields to user_preferences.

-- 1. Extend meditation_sessions with stage-aware reflection fields. All optional.
ALTER TABLE meditation_sessions
  ADD COLUMN IF NOT EXISTS stage_at_session INT NOT NULL DEFAULT 1
    CHECK (stage_at_session BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS mind_wandering_episodes INT
    CHECK (mind_wandering_episodes IS NULL OR mind_wandering_episodes >= 0),
  ADD COLUMN IF NOT EXISTS dullness_level TEXT
    CHECK (dullness_level IS NULL OR dullness_level IN ('none', 'subtle', 'strong')),
  ADD COLUMN IF NOT EXISTS distraction_level TEXT
    CHECK (distraction_level IS NULL OR distraction_level IN ('none', 'subtle', 'gross')),
  ADD COLUMN IF NOT EXISTS obstacle_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reflection TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mood_after INT
    CHECK (mood_after IS NULL OR (mood_after BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS technique_used TEXT;

-- 2. Per-user program state row.
CREATE TABLE IF NOT EXISTS meditation_program_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_stage INT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 10),
  assessed_stage INT NOT NULL DEFAULT 1 CHECK (assessed_stage BETWEEN 1 AND 10),
  milestones_reached INT[] NOT NULL DEFAULT '{}',
  onboarding_completed_at TIMESTAMPTZ,
  last_session_at TIMESTAMPTZ,
  preferred_duration_minutes INT,
  preferred_time_of_day TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meditation_program_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meditation program state"
  ON meditation_program_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Stage-tied long-form private notes (optional).
CREATE TABLE IF NOT EXISTS stage_practice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage INT NOT NULL CHECK (stage BETWEEN 1 AND 10),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stage_practice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own stage practice notes"
  ON stage_practice_notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS stage_practice_notes_user_stage
  ON stage_practice_notes (user_id, stage);

-- 4. Add meditation_* fields to user_preferences. Reminders default off.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS meditation_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meditation_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meditation_reminder_hour INT NOT NULL DEFAULT 7
    CHECK (meditation_reminder_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS meditation_reminder_minute INT NOT NULL DEFAULT 0
    CHECK (meditation_reminder_minute BETWEEN 0 AND 59),
  ADD COLUMN IF NOT EXISTS meditation_reminder_timezone VARCHAR;

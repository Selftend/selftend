-- ACT Phase 3 - Presence.
-- Adds act_connection_logs and act_observing_self_sessions tables.

-- 1. Connection log - present-moment awareness exercises.
CREATE TABLE IF NOT EXISTS act_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique TEXT NOT NULL DEFAULT 'noticeFiveThings'
    CHECK (technique IN ('noticeFiveThings', 'mindfulActivity', 'tenDeepBreaths')),
  activity_context TEXT NOT NULL DEFAULT '',
  notices_from_senses TEXT NOT NULL DEFAULT '',
  duration_minutes INT
    CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  mood_after INT
    CHECK (mood_after IS NULL OR (mood_after BETWEEN 1 AND 10)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT connection logs"
  ON act_connection_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_connection_logs_user_created
  ON act_connection_logs (user_id, created_at DESC);

-- 2. Observing Self sessions - the stable witness exercises.
CREATE TABLE IF NOT EXISTS act_observing_self_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_used TEXT NOT NULL DEFAULT 'tenDeepBreaths'
    CHECK (technique_used IN ('tenDeepBreaths', 'observingFromBoard', 'bodyAwareness')),
  what_was_observed TEXT NOT NULL DEFAULT '',
  duration_minutes INT
    CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  mood_after INT
    CHECK (mood_after IS NULL OR (mood_after BETWEEN 1 AND 10)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_observing_self_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT observing self sessions"
  ON act_observing_self_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_observing_self_sessions_user_created
  ON act_observing_self_sessions (user_id, created_at DESC);

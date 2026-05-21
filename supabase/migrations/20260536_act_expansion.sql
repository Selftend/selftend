-- ACT Phase 2 - Expansion (Acceptance).
-- Adds act_expansion_logs and act_urge_surf_logs tables.

-- 1. Expansion log - 4-step exercise, Struggle Switch, clean/dirty distinction.
CREATE TABLE IF NOT EXISTS act_expansion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL DEFAULT '',
  body_sensation TEXT NOT NULL DEFAULT '',
  intensity_before INT
    CHECK (intensity_before IS NULL OR (intensity_before BETWEEN 0 AND 100)),
  struggle_switch_on BOOLEAN,
  discomfort_type TEXT
    CHECK (discomfort_type IS NULL OR discomfort_type IN ('clean', 'dirty')),
  technique_used TEXT NOT NULL DEFAULT 'fourStepExpansion'
    CHECK (technique_used IN (
      'fourStepExpansion', 'acceptanceSelfTalk', 'acceptanceImagery'
    )),
  intensity_after INT
    CHECK (intensity_after IS NULL OR (intensity_after BETWEEN 0 AND 100)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_expansion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT expansion logs"
  ON act_expansion_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_expansion_logs_user_created
  ON act_expansion_logs (user_id, created_at DESC);

-- 2. Urge surfing log - separate from expansion as it has a distinct data shape.
CREATE TABLE IF NOT EXISTS act_urge_surf_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  urge_description TEXT NOT NULL DEFAULT '',
  trigger TEXT NOT NULL DEFAULT '',
  peak_intensity INT
    CHECK (peak_intensity IS NULL OR (peak_intensity BETWEEN 0 AND 100)),
  surfing_notes TEXT NOT NULL DEFAULT '',
  urge_acted_on BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_urge_surf_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT urge surf logs"
  ON act_urge_surf_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_urge_surf_logs_user_created
  ON act_urge_surf_logs (user_id, created_at DESC);

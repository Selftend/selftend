-- ACT Phase 5 - Committed Action.
-- Adds act_committed_actions and act_action_steps tables.

-- 1. Committed actions - one plan per commitment
CREATE TABLE IF NOT EXISTS act_committed_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  life_domain TEXT NOT NULL
    CHECK (life_domain IN ('work', 'leisure', 'relationships', 'personalGrowth')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  target_date DATE,
  obstacles TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_committed_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own committed actions"
  ON act_committed_actions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_committed_actions_user_status
  ON act_committed_actions (user_id, status, created_at DESC);

-- 2. Action steps - checklist items within a committed action
CREATE TABLE IF NOT EXISTS act_action_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES act_committed_actions(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_action_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own action steps"
  ON act_action_steps
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_action_steps_action
  ON act_action_steps (action_id, created_at ASC);

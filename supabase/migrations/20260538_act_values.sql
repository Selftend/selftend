-- ACT Phase 4 - Values.
-- Adds act_value_entries and act_bulls_eye_snapshots tables.

-- 1. Value entries - one per (user, domain); upsert on conflict.
CREATE TABLE IF NOT EXISTS act_value_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  life_domain TEXT NOT NULL
    CHECK (life_domain IN ('work', 'leisure', 'relationships', 'personalGrowth')),
  value_statement TEXT NOT NULL DEFAULT '',
  importance_rating INT
    CHECK (importance_rating IS NULL OR (importance_rating BETWEEN 1 AND 10)),
  current_alignment_rating INT
    CHECK (current_alignment_rating IS NULL OR (current_alignment_rating BETWEEN 1 AND 10)),
  current_actions_note TEXT NOT NULL DEFAULT '',
  desired_actions_note TEXT NOT NULL DEFAULT '',
  barriers TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, life_domain)
);

ALTER TABLE act_value_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT value entries"
  ON act_value_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_value_entries_user_domain
  ON act_value_entries (user_id, life_domain);

-- 2. Bull's-Eye snapshots - time-series alignment ratings per domain.
CREATE TABLE IF NOT EXISTS act_bulls_eye_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL
    CHECK (domain IN ('work', 'leisure', 'relationships', 'personalGrowth')),
  alignment_rating INT NOT NULL
    CHECK (alignment_rating BETWEEN 1 AND 10),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_bulls_eye_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT bulls eye snapshots"
  ON act_bulls_eye_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_bulls_eye_snapshots_user_domain_reviewed
  ON act_bulls_eye_snapshots (user_id, domain, reviewed_at DESC);

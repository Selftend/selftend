-- === Values: replace domain-matrix model with personal-values jsonb ===

-- 1. Remove all existing domain rows (no cross-model backfill possible)
DELETE FROM public.values_profile;

-- 2. Drop domain-specific columns
ALTER TABLE public.values_profile
  DROP COLUMN IF EXISTS life_domain,
  DROP COLUMN IF EXISTS importance_rating,
  DROP COLUMN IF EXISTS satisfaction_rating,
  DROP COLUMN IF EXISTS domain_note;

-- 3. Add personal_values column
ALTER TABLE public.values_profile
  ADD COLUMN IF NOT EXISTS personal_values jsonb NOT NULL DEFAULT '[]';

-- 4. Switch from composite key (user_id, life_domain) to single-row per user
ALTER TABLE public.values_profile
  DROP CONSTRAINT IF EXISTS values_profile_user_id_life_domain_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'values_profile_user_id_key'
      AND conrelid = 'public.values_profile'::regclass
  ) THEN
    ALTER TABLE public.values_profile
      ADD CONSTRAINT values_profile_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- === Activities: add PACE category ===

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS pace_category text
    CHECK (pace_category IN ('physical', 'achievement', 'connection', 'enjoyment'));

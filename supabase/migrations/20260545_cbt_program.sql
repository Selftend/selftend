ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS cbt_program_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cbt_program_completed_at timestamptz;

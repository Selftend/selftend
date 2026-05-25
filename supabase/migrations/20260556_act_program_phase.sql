ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS act_program_phase_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS act_program_phase_started_at timestamptz;

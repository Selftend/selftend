ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS cbt_program_prompt_dismissed_at timestamptz;

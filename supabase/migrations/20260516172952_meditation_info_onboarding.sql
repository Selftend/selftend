ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS meditation_info_completed boolean NOT NULL DEFAULT false;

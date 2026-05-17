ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS cbt_wizard_completed boolean NOT NULL DEFAULT false;

-- Users who already completed CBT onboarding went through the concerns step.
UPDATE public.user_preferences
SET cbt_wizard_completed = true
WHERE cbt_onboarding_completed = true;

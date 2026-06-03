-- Persist CBT program graduation dismissal so the "program complete" celebration
-- card does not reappear on every app launch. Nullable timestamp; null = not dismissed.
alter table public.user_preferences
  add column if not exists cbt_graduation_dismissed_at timestamptz;

-- Timestamp when the user dismissed the home "Start here" card (null = never).
alter table public.user_preferences
  add column if not exists start_here_dismissed_at timestamptz;

alter table user_preferences
  add column if not exists mood_onboarding_completed boolean,
  add column if not exists journal_onboarding_completed boolean,
  add column if not exists sleep_onboarding_completed boolean,
  add column if not exists mindfulness_onboarding_completed boolean,
  add column if not exists grounding_onboarding_completed boolean;

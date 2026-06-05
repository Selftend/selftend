-- Per-tool reminder preferences for the 7 newly-live notification targets
-- (mood, journal, gratitude, grounding, breathing, sleep, habits) and their
-- per-day web-push dedup keys. Additive + idempotent so prod `db push` and the
-- local psql apply are safe to re-run.

alter table public.user_preferences
  add column if not exists mood_reminders_enabled boolean not null default false,
  add column if not exists mood_reminder_hour int not null default 12,
  add column if not exists mood_reminder_minute int not null default 0,
  add column if not exists mood_reminder_timezone text,
  add column if not exists journal_reminders_enabled boolean not null default false,
  add column if not exists journal_reminder_hour int not null default 21,
  add column if not exists journal_reminder_minute int not null default 0,
  add column if not exists journal_reminder_timezone text,
  add column if not exists gratitude_reminders_enabled boolean not null default false,
  add column if not exists gratitude_reminder_hour int not null default 20,
  add column if not exists gratitude_reminder_minute int not null default 0,
  add column if not exists gratitude_reminder_timezone text,
  add column if not exists grounding_reminders_enabled boolean not null default false,
  add column if not exists grounding_reminder_hour int not null default 15,
  add column if not exists grounding_reminder_minute int not null default 0,
  add column if not exists grounding_reminder_timezone text,
  add column if not exists breathing_reminders_enabled boolean not null default false,
  add column if not exists breathing_reminder_hour int not null default 16,
  add column if not exists breathing_reminder_minute int not null default 0,
  add column if not exists breathing_reminder_timezone text,
  add column if not exists sleep_reminders_enabled boolean not null default false,
  add column if not exists sleep_reminder_hour int not null default 22,
  add column if not exists sleep_reminder_minute int not null default 0,
  add column if not exists sleep_reminder_timezone text,
  add column if not exists habits_reminders_enabled boolean not null default false,
  add column if not exists habits_reminder_hour int not null default 9,
  add column if not exists habits_reminder_minute int not null default 0,
  add column if not exists habits_reminder_timezone text;

alter table public.web_push_subscriptions
  add column if not exists last_mood_reminder_key text,
  add column if not exists last_journal_reminder_key text,
  add column if not exists last_gratitude_reminder_key text,
  add column if not exists last_grounding_reminder_key text,
  add column if not exists last_breathing_reminder_key text,
  add column if not exists last_sleep_reminder_key text,
  add column if not exists last_habits_reminder_key text;

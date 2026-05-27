-- Seed the Home default widgets only once per user. Previously listOrSeed() inferred
-- "never seeded" from an empty widget_preferences table, so removing the last widget
-- re-seeded the full default set and an empty Home was unreachable. This flag records
-- that seeding has happened, so an emptied Home stays empty.
alter table public.user_preferences
  add column if not exists widgets_seeded boolean not null default false;

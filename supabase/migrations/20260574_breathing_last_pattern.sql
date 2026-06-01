-- Remembers the last breathing pattern a user ran, so /tools/breathing/session can reopen it.
-- Holds a built-in slug (e.g. 'box-breathing') or a custom breathing_exercises id. Optional +
-- idempotent; the app falls back to a default when null (see omitOptionalPreferenceColumns).

alter table public.user_preferences
  add column if not exists last_breathing_pattern_id text;

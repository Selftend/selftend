-- Routine reminders (issue #47, spec #37 "Reminders & the nudge system"):
-- per-channel dedup stamps for the per-ROUTINE reminder fan-out.
--
-- Tool reminders dedup via fixed `last_<target>_reminder_key` columns on
-- web_push_subscriptions / device_push_tokens. Routine reminders are per-row
-- (any number of routines per user), so the same mechanism generalizes to a
-- jsonb map `{ <routine_id>: 'YYYY-MM-DD' }` on each delivery-channel row:
-- the send-web-reminders edge function stamps the day key after a successful
-- send and skips any routine whose stamp already matches today, guaranteeing
-- <= 1 notification per routine per day per channel - exactly the per-tool
-- guarantee, generalized over rows. The function prunes entries for routines
-- that no longer have an enabled reminder, so the map stays bounded.
--
-- Plain metadata (no free text, no encryption concerns), matching the existing
-- last-key columns.

alter table public.web_push_subscriptions
  add column if not exists last_routine_reminder_keys jsonb not null default '{}'::jsonb;

alter table public.device_push_tokens
  add column if not exists last_routine_reminder_keys jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

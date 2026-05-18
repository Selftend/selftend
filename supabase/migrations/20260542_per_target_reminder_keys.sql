alter table public.web_push_subscriptions
  add column if not exists last_cbt_reminder_key text,
  add column if not exists last_meditation_reminder_key text,
  add column if not exists last_act_reminder_key text;

update public.web_push_subscriptions
set last_cbt_reminder_key = last_reminder_key
where last_cbt_reminder_key is null and last_reminder_key is not null;

-- Defense-in-depth for the web-push blind-SSRF + amplification vector. The send-web-reminders
-- worker runs with the service-role key and delivers to web_push_subscriptions.endpoint, but
-- RLS only constrains user_id, so an authenticated user could upsert arbitrary endpoints. The
-- edge function now allowlists endpoints at the application layer; these add the matching DB
-- guards so a raw PostgREST upsert can't seed a hostile endpoint or unbounded number of rows.

-- 1. Endpoint must be an https URL on a known push-service host. NOT VALID so the migration
--    never fails on a pre-existing row; enforced on every insert/update going forward. The
--    allowed-host set mirrors isAllowedPushEndpoint() in _shared/web-reminders.ts.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'web_push_subscriptions_endpoint_allowlist'
  ) then
    alter table public.web_push_subscriptions
      add constraint web_push_subscriptions_endpoint_allowlist
      check (
        endpoint ~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.apple\.com|notify\.windows\.com|wns\.windows\.com|push\.services\.mozilla\.com)(:443)?/'
      )
      not valid;
  end if;
end $$;

-- 2. Cap active subscriptions per user (limits SSRF/push amplification per cron tick).
create or replace function public.enforce_web_push_subscription_cap()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.web_push_subscriptions
  where user_id = new.user_id;

  if current_count >= 20 then
    raise exception 'web_push_subscriptions limit reached for user (max 20)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_web_push_subscription_cap on public.web_push_subscriptions;
create trigger enforce_web_push_subscription_cap
  before insert on public.web_push_subscriptions
  for each row execute function public.enforce_web_push_subscription_cap();

revoke all on function public.enforce_web_push_subscription_cap() from public, anon, authenticated;

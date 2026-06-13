-- ============================================================================
-- Full-audit (2026-06-10) — phase 2b DB hardening: #40, #81.
--
-- NOT LOCALLY VERIFIED (no local Postgres); validated + applied + advisor-checked
-- against the live project. Idempotent (create-or-replace / not-exists guards).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- #40 — act_program_state INSERT-on-conflict (partial-upsert) blind-clobber.
-- The client contract is a PARTIAL upsert (upsertACTProgramState builds a payload
-- of only the patched fields), but the conflict branch assigned excluded.* for
-- every column, and the VALUES list coalesces omitted (NULL-arriving) NOT NULL
-- columns to defaults ('{}', false) — so a partial write wiped the rest of the row.
-- Mirror emotion_preferences_ins (20260657): reference NEW.* raw (NULL = "omitted")
-- and coalesce to the existing base value, so only explicitly-supplied values
-- overwrite. The merged row is returned into NEW so .insert().select() reflects the
-- preserved values. Latent today (no live call sites — retained ACT-wizard
-- scaffolding) but destroys user data the moment that path is wired up.
-- ----------------------------------------------------------------------------
create or replace function public.act_program_state_ins() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare merged_primary_concerns_enc bytea;
begin
  insert into public.act_program_state_data (
    user_id, active_principles, primary_concerns_enc, myths_acknowledged,
    onboarding_completed_at, last_check_in_at, preferred_check_in_time, created_at, updated_at)
  values (
    coalesce(new.user_id, auth.uid()),
    coalesce(new.active_principles, array[]::text[]),
    app.encrypt_text(coalesce(new.primary_concerns, array[]::text[])::text),
    coalesce(new.myths_acknowledged, false),
    new.onboarding_completed_at,
    new.last_check_in_at,
    new.preferred_check_in_time,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.updated_at, timezone('utc', now())))
  on conflict (user_id) do update set
    active_principles       = coalesce(new.active_principles, act_program_state_data.active_principles),
    primary_concerns_enc    = coalesce(app.encrypt_text(new.primary_concerns::text), act_program_state_data.primary_concerns_enc),
    myths_acknowledged      = coalesce(new.myths_acknowledged, act_program_state_data.myths_acknowledged),
    onboarding_completed_at = coalesce(new.onboarding_completed_at, act_program_state_data.onboarding_completed_at),
    last_check_in_at        = coalesce(new.last_check_in_at, act_program_state_data.last_check_in_at),
    preferred_check_in_time = coalesce(new.preferred_check_in_time, act_program_state_data.preferred_check_in_time),
    updated_at              = timezone('utc', now())
  returning user_id, active_principles, primary_concerns_enc, myths_acknowledged,
            onboarding_completed_at, last_check_in_at, preferred_check_in_time, created_at, updated_at
    into new.user_id, new.active_principles, merged_primary_concerns_enc, new.myths_acknowledged,
         new.onboarding_completed_at, new.last_check_in_at, new.preferred_check_in_time,
         new.created_at, new.updated_at;
  new.primary_concerns := app.decrypt_text(merged_primary_concerns_enc)::text[];
  return new;
end; $$;

-- ----------------------------------------------------------------------------
-- #81 — device_push_tokens had no per-user cap or token-format guard, while its
-- web sibling (web_push_subscriptions, 20260571) got both. RLS only constrains
-- user_id, so an authenticated user could insert unbounded token rows, each of
-- which the cron worker POSTs to exp.host every tick (push amplification).
-- Mirror enforce_web_push_subscription_cap(): cap rows per user, plus a NOT VALID
-- format CHECK (the app only ever stores Expo getExpoPushTokenAsync() tokens, i.e.
-- ExponentPushToken[...] / ExpoPushToken[...], so this rejects nothing legitimate).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'device_push_tokens_expo_format'
  ) then
    alter table public.device_push_tokens
      add constraint device_push_tokens_expo_format
      check (expo_push_token ~ '^Expo(nent)?PushToken\[[^\]]+\]$')
      not valid;
  end if;
end $$;

create or replace function public.enforce_device_push_token_cap()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.device_push_tokens
  where user_id = new.user_id;

  if current_count >= 20 then
    raise exception 'device_push_tokens limit reached for user (max 20)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_device_push_token_cap on public.device_push_tokens;
create trigger enforce_device_push_token_cap
  before insert on public.device_push_tokens
  for each row execute function public.enforce_device_push_token_cap();

revoke all on function public.enforce_device_push_token_cap() from public, anon, authenticated;

notify pgrst, 'reload schema';

-- A recorded consent never moves backwards (#2217).
--
-- `policy_version_accepted` is written by whichever client the person happens
-- to be holding, and clients do NOT deploy together. Web is a Cloudflare
-- Workers push that is live within the release run; Android waits on Play
-- review, iOS on a manual TestFlight promotion. The consent gate in every build
-- shipped so far is a STRICT INEQUALITY against the constant compiled into that
-- build (`policyVersion`, src/features/policies/policy-content.ts), and the
-- accept path writes that same constant back unconditionally. So for the length
-- of the skew, one account's single row is written by two builds that disagree
-- about what the current policy is:
--
--   web (new build)    accepts -> '2026-09-04-teen-floor'
--   phone (0.17.0)     accepts -> '2026-08-27-feedback-processors'   <- backwards
--   web again          accepts -> '2026-09-04-teen-floor'            <- and so on
--
-- ☠️ The client that does the clobbering is the one ALREADY IN PEOPLE'S HANDS,
-- so no change to the app can stop it. The database is the only layer that
-- deploys ahead of every client, which is why the guard lives here.
--
-- What the regression costs is not only the re-prompt. It is the consent record
-- itself: while the older string is stored, the row asserts the person accepted
-- the pre-teen-floor policy - the one that said Selftend is for adults aged 18
-- and older - and gave the BUNDLED consent that #1766 split apart, sitting next
-- to a `health_data_consent_at` stamp for the separate Art. 9(2)(a) act that
-- older version never asked for. And `privacy_policy_accepted_at` /
-- `terms_accepted_at` advance while the version string retreats, so "latest
-- timestamp wins" does not reconstruct what was actually agreed.
--
-- The rule, therefore: an UPDATE may raise the recorded consent, and may clear
-- it, but may never lower it - and when it tries, the whole consent record is
-- left as the last genuine acceptance left it, timestamps included. Re-stamping
-- `terms_accepted_at` while keeping the newer version would record that the
-- person accepted the CURRENT policy at that moment, which is exactly the thing
-- that did not happen.
--
-- ⚠️ Ordering comes from the ISO date prefix, and from nothing else. Every
-- value the app has ever written is `YYYY-MM-DD-slug`
-- ('2026-05-03', '2026-05-06-web-push', ... '2026-09-04-teen-floor'), and
-- `policy-content.test.ts` pins the shape by asserting
-- `policyVersion.startsWith(policyLastUpdated + '-')`, so the prefix is not a
-- convention that can quietly lapse. Only the first ten characters are
-- compared: two versions published on the same date (there is one such pair,
-- '2026-05-06' and '2026-05-06-web-push') carry no ordering in their slugs, and
-- ranking them alphabetically would invent one.
--
-- The guard FAILS OPEN in every case it cannot rank, because the failure it
-- must never produce is refusing a legitimate acceptance:
--
--   * old is NULL           -> a first acceptance. Always allowed.
--   * new is NULL           -> clearing the record, which is how a re-gate is
--                              staged deliberately (docs/design/1980-before).
--                              Allowed; it is not a false claim about consent.
--   * either is unrankable  -> no date prefix, so no ordering exists. Allowed,
--                              which is also what lets a row holding a legacy
--                              or hand-edited value heal on the next accept.
--   * same date prefix      -> not a downgrade. Allowed.
--
-- Nothing raises an exception. A stale client that meets its own gate must be
-- able to submit it and get into the app; making its write fail would leave the
-- person staring at an error on a full-screen wall with no way past. The write
-- succeeds and the consent record simply does not move.
--
-- 📌 The companion half is client-side and lives in
-- src/features/policies/policy-consent.ts: a build must treat a stored version
-- NEWER than its own as accepted. Without it this guard has a sharp edge - a
-- rolled-back release would leave rows above the running constant, the gate
-- would fire on every launch, and the accept that should clear it would be the
-- very write this trigger declines.
--
-- Version 20260911000000: strictly after 20260910000000_dbt_module.sql, and the
-- same fourteen-digit width as every other recent version (supabase/README.md
-- "Migration versions"). No column is added, so `export_user_data` is unchanged.

create or replace function public.preserve_policy_consent_high_water()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.policy_version_accepted is null
     or new.policy_version_accepted is null
     or new.policy_version_accepted = old.policy_version_accepted then
    return new;
  end if;

  if old.policy_version_accepted ~ '^\d{4}-\d{2}-\d{2}'
     and new.policy_version_accepted ~ '^\d{4}-\d{2}-\d{2}'
     and left(new.policy_version_accepted, 10) < left(old.policy_version_accepted, 10)
  then
    new.policy_version_accepted := old.policy_version_accepted;
    new.privacy_policy_accepted_at := old.privacy_policy_accepted_at;
    new.terms_accepted_at := old.terms_accepted_at;
    new.health_data_consent_at := old.health_data_consent_at;
  end if;

  return new;
end;
$$;

comment on function public.preserve_policy_consent_high_water() is
  'Refuses to lower user_preferences.policy_version_accepted (#2217). Ordering is the leading YYYY-MM-DD only; a first acceptance, a clear to NULL, an unrankable value and a same-date change all pass through. When a lowering write is declined the accompanying consent timestamps are held at their stored values too, so the record keeps saying what was actually accepted and when.';

drop trigger if exists preserve_policy_consent_high_water on public.user_preferences;
create trigger preserve_policy_consent_high_water
before update on public.user_preferences
for each row
execute function public.preserve_policy_consent_high_water();

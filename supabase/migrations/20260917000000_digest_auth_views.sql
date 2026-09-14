-- The two auth columns the aggregate reports need, exposed through views in
-- `public` so the monthly digest's read-only role never touches the auth schema
-- (#2393, split out of #2380).
--
-- ☠️ WHY THIS EXISTS, because the obvious reading is that it is pointless
-- indirection. The digest runs as a dedicated role that must be UNABLE TO WRITE
-- (#2380: it is the first scheduled job whose executed SQL a merged pull request
-- can change). That role cannot read `auth.users`, and no grant fixes it:
--
--   * the `auth` schema is owned by `supabase_admin`, and `postgres` - which is
--     what the Supabase SQL editor runs as - holds USAGE *without grant option*.
--     `grant usage on schema auth to <role>` emits
--     `WARNING: no privileges were granted for "auth"` and does nothing at all;
--   * every role that DOES reach auth (`anon`, `authenticated`, `service_role`)
--     also carries write grants on `public`, because RLS is what gates them for
--     the API. Granting membership in one of those produced a role that could
--     INSERT and DELETE freely - the exact opposite of the requirement.
--
-- A view's base tables are checked against the view's OWNER, not the caller, so
-- these let the role read exactly these columns and nothing else in auth.
--
-- ☠️ THE COLUMN LISTS ARE THE SECURITY BOUNDARY, NOT A CONVENIENCE.
-- `auth.users` holds `encrypted_password`, `confirmation_token`,
-- `recovery_token` and more. Widening either view to `select *` would put those
-- within reach of a role whose whole output is posted into a GitHub comment.
-- test/analytics-shared-sql.test.ts pins both lists exactly, so a widening fails
-- a test rather than depending on a reviewer noticing.
--
-- ⚠️ `email` is here because the population-provenance block counts the
-- project's own accounts by address. It is never selected into a printed row -
-- every report is aggregate-only - and a separate guard confines it to the
-- `accounts` and `population_provenance` blocks.

create or replace view public.digest_auth_users as
  select id, created_at, email, is_anonymous from auth.users;

comment on view public.digest_auth_users is
  'The auth.users columns the aggregate analytics reports read (#2393). Exists so the digest role never needs the auth schema, which postgres cannot grant. The column list is a security boundary - auth.users holds password hashes and tokens - and is pinned by test/analytics-shared-sql.test.ts. Do not widen.';

create or replace view public.digest_auth_identities as
  select user_id, created_at from auth.identities;

comment on view public.digest_auth_identities is
  'The auth.identities columns the aggregate analytics reports read (#2393): the guest-to-registered conversion clock. Same reasoning and same pinning as public.digest_auth_users. Do not widen.';

-- ⚠️ Deliberately NOT granted to `anon` or `authenticated`. These views bypass
-- RLS on the auth schema by construction, so the API roles must never reach
-- them; only the digest role is granted SELECT, and that grant is made
-- alongside the role itself rather than here (the role is created by hand on
-- production, per #2380).
revoke all on public.digest_auth_users from anon, authenticated;
revoke all on public.digest_auth_identities from anon, authenticated;

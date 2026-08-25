# Supabase anonymous sign-ins — what the platform actually does

Date checked: 2026-08-25 · Map: #1427 · Ticket: #1428 (research)

Doc research only — no live Supabase API was exercised and no email flow was
triggered. Sources are supabase.com/docs, the `supabase/auth` (GoTrue) and
`supabase/supabase-js` source repos, and the npm registry. Where the docs were
silent and the answer comes from reading server source or from mechanical
inference, that is flagged inline.

## Headline

**With this repo's autoconfirm (`enable_confirmations = false`), linking an
email to an anonymous user is instant and silent: GoTrue applies the email
immediately, sends no confirmation email at all, and flips `is_anonymous` to
false in the same transaction.** That is a dedicated anonymous-user branch in
GoTrue's update handler, not an accident. The whole "which template fires,
what does the user click" question dissolves on this repo's config — the
repo's own verification layer (#489: `user_preferences.email_verified` +
signInWithOtp banner) becomes the only email verification in the flow, exactly
as it already is for password signups.

Second headline: **the pinned supabase-js can link Apple natively.** The
`linkIdentity()` in auth-js 2.103.2 accepts id-token credentials
(`{ provider, token }`) and POSTs `/token?grant_type=id_token` with
`link_identity: true`, linking to the currently-signed-in (anonymous) user.
Calling `signInWithIdToken()` instead does **not** link — it signs into
whatever account owns that Apple identity and silently abandons the anonymous
one.

## 1. Enablement

- **Hosted:** Dashboard toggle "Allow anonymous sign-ins" at
  Authentication → Sign In / Providers
  (`https://supabase.com/dashboard/project/_/auth/providers`). Per-project, so
  staging and prod are flipped independently — same release-step pattern the
  repo already uses for `mailer_autoconfirm`.
  Source: https://supabase.com/docs/guides/auth/auth-anonymous (2026-08-25).
- **Local:** `[auth] enable_anonymous_sign_ins = true` in `config.toml`
  (default `false`). Related: `auth.rate_limit.anonymous_users` (default 30,
  "Number of anonymous sign-ins that can be made per hour per IP address") and
  `[auth] enable_manual_linking` (default `false`) for OAuth linking.
  Source: https://supabase.com/docs/guides/local-development/cli/config
  (2026-08-25).
- **Client version:** `signInAnonymously` shipped in auth-js **2.63.0**
  (2024-03-26, "add method for anonymous sign-in"), first bundled by
  supabase-js **2.42.0** (2024-04-03, pins `@supabase/auth-js: 2.63.0`).
  This repo pins `@supabase/supabase-js ^2.103.2` (`package.json`), whose
  auth-js is version-locked at 2.103.2 — far above the minimum, and it
  already ships the id-token `linkIdentity` overload (verified in the
  published `GoTrueClient.d.ts` on unpkg).
  Sources: https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/CHANGELOG.md,
  https://registry.npmjs.org/@supabase/supabase-js/2.42.0,
  https://unpkg.com/@supabase/auth-js@2.103.2/dist/module/GoTrueClient.d.ts
  (all 2026-08-25).

## 2. `signInAnonymously()` semantics

- Creates a **real row in `auth.users`** with the `is_anonymous` column true;
  no email/phone. "It behaves like a permanent user, except the user can't
  access their account if they sign out, clear browsing data, or use another
  device."
- **JWT:** carries an `is_anonymous` claim; the Postgres role is
  **`authenticated`** (not `anon`) — which is why RLS review is mandatory
  before enabling (see §8).
- **Signature:** `signInAnonymously({ options: { data, captchaToken } })` —
  `data` seeds user metadata, `captchaToken` for CAPTCHA.
- **Session mechanics are ordinary:** it returns a normal session, persisted
  by the client's configured storage (this repo: SecureStore native /
  localStorage web) and refreshed by the normal rotation machinery — nothing
  anonymous-specific about persistence.
- On conversion "the user id remains the same, which means that any data
  associated with the user's id would be carried over" — no data migration
  needed.
  Sources: https://supabase.com/docs/guides/auth/auth-anonymous,
  https://supabase.com/docs/reference/javascript/auth-signinanonymously,
  https://supabase.com/blog/anonymous-sign-ins (2026-08-25).

## 3. Linking an email — and the autoconfirm interaction

Documented flow (confirmations ON): `updateUser({ email })` from the anonymous
session runs the **email-change** flow — the *email change* template fires
(this repo's `supabase/templates/email_change.html` / "Confirm your new email
for Selftend"), and the user must "verify by clicking on the email change link
or entering the 6-digit OTP". After verification, a second
`updateUser({ password })` sets the password.
Source: https://supabase.com/docs/guides/auth/auth-anonymous (2026-08-25).

What GoTrue actually does (`supabase/auth` master,
`internal/api/user.go` + `internal/api/verify.go`, read 2026-08-25):

- **Autoconfirm + anonymous = no email, instant flip.** In the update
  handler: `if user.IsAnonymous && config.Mailer.Autoconfirm` GoTrue sets
  `EmailChange` and immediately calls `emailChangeVerify(...)` itself — no
  email is sent, the address is applied at once. `emailChangeVerify` contains
  `if user.IsAnonymous { user.IsAnonymous = false; tx.UpdateOnly(user,
  "is_anonymous") }` — the flip happens in that same transaction. Hosted
  `mailer_autoconfirm = true` is the same flag as this repo's local
  `enable_confirmations = false`, so **on our config the linking path skips
  email verification entirely** — the attached email is *unverified*, which
  is precisely the state the repo's #489 in-app verification layer already
  handles for password signups.
- **The autoconfirm skip is anonymous-only.** For non-anonymous users a
  confirmation email is dispatched via `sendEmailChange()` regardless of
  autoconfirm.
- **Secure email change (double confirmation) does not bite here:** the
  double-confirm branch is guarded by `!config.Mailer.Autoconfirm`, and an
  anonymous user has no "other email" to confirm from anyway.
- **Password ordering is enforced server-side:** an anonymous user setting a
  password without simultaneously providing an email/phone is rejected (422
  validation error). Once converted, a plain `updateUser({ password })`
  succeeds.
- ⚠️ Inference, flagged: **the live access token still says
  `is_anonymous: true` after conversion** — claims only change when a new JWT
  is minted. Call `refreshSession()` after linking so RLS predicates (§8) see
  the flip; the docs do not spell this out.

## 4. Linking OAuth — Google (web PKCE) and Apple (native)

- **Prerequisite:** manual linking must be enabled — hosted dashboard
  ("authentication configuration options"), local
  `[auth] enable_manual_linking = true`, self-host
  `GOTRUE_SECURITY_MANUAL_LINKING_ENABLED: true`. When off, calls fail with
  error code `manual_linking_disabled`.
  Sources: https://supabase.com/docs/guides/auth/auth-identity-linking,
  https://supabase.com/docs/guides/auth/debugging/error-codes (2026-08-25).
- **Web/PKCE (Google):** `linkIdentity({ provider: 'google', options })` →
  GET `{url}/user/identities/authorize` → provider redirect → back to the
  app; PKCE supported; user must be signed in (as the anonymous user). It may
  link an identity whose email differs from the account's.
- **Native id-token (Apple):** `linkIdentity` has a second overload taking
  `SignInWithIdTokenCredentials` → POST `/token?grant_type=id_token` with
  `link_identity: true`; GoTrue requires "a valid user access token in
  Authorization" and calls `linkIdentityToUser` on the current user. Present
  in the pinned auth-js 2.103.2. So the Apple conversion is: obtain the
  native Apple identity token exactly as sign-in does today, but call
  `linkIdentity({ provider: 'apple', token })` while the anonymous session is
  active.
  Sources: https://github.com/supabase/supabase-js (packages/core/auth-js
  `GoTrueClient.ts`), https://github.com/supabase/auth
  (`internal/api/token_oidc.go`), read 2026-08-25.
- ☠️ **`signInWithIdToken()` never links.** Same endpoint, no
  `link_identity` flag: it creates/signs into the account owning that
  identity. From an anonymous session this silently swaps accounts and
  strands the anonymous user's data.
- **Identity already on another account:** 422, error code
  `identity_already_exists` — server messages are "Identity is already
  linked to another user" (other account) / "Identity is already linked"
  (same account). No merge happens (see §5).
  Source: https://github.com/supabase/auth `internal/api/identity.go`
  (2026-08-25).
- Linking an OAuth identity converts the anonymous user without any email
  verification step. Note Supabase's *automatic* linking (same-email) is a
  separate sign-in-time mechanism; SAML SSO users are never linking targets.

## 5. Email collision — and no merge exists

- `updateUser({ email })` with an email already registered to another user:
  **HTTP 422, error code `email_exists`** ("Email address already exists in
  the system"; server constant `DuplicateEmailMsg`). Supabase's guidance:
  match on `error.code`, never on message strings.
  Sources: https://supabase.com/docs/guides/auth/debugging/error-codes,
  https://github.com/supabase/auth `internal/api/user.go` (2026-08-25).
- **No server-side account merge exists.** Nothing in the anonymous guide,
  identity-linking guide, or the auth API merges two existing users; the
  collision errors above are terminal. Reconciling "I already have an
  account" is app-level: sign into the existing account (abandoning or
  cleaning up the anonymous user) and, if wanted, move data yourself.
  (Confirmed absence across the docs above, 2026-08-25.)

## 6. Abuse and limits

- **Rate limit:** anonymous sign-ins are IP-limited to **30/hour** (bursts up
  to 30) on `/auth/v1/signup` when the body has no email/phone; the guide
  says this one **can be modified** in the dashboard. Local key:
  `auth.rate_limit.anonymous_users = 30`.
- **CAPTCHA:** "strongly recommended to enable invisible CAPTCHA or
  Cloudflare Turnstile to prevent abuse" — wired through
  `signInAnonymously({ options: { captchaToken } })`.
- Adjacent defaults worth knowing: token refresh 1800/hr per IP (bursts 30);
  built-in email provider 2 emails/hr (custom SMTP required to raise); OTPs
  default 30/hr project-wide with a 60 s per-user cooldown.
  Sources: https://supabase.com/docs/guides/auth/rate-limits,
  https://supabase.com/docs/guides/auth/auth-anonymous (2026-08-25).
- **MAU:** billing counts "distinct users who log in or refresh their token
  during the billing cycle." No doc exempts anonymous users, and they log in
  and refresh like anyone else — so **each anonymous visitor is a billable
  MAU** (inference from the counting rule; no explicit "anonymous users
  count" sentence exists in the billing docs). Free plan: 50,000 MAU
  included, no overages; Pro: 100,000 included, then $0.00325/MAU.
  Free-plan implication for this product: an anonymous-first funnel spends
  MAU quota on drive-by visitors; deleting stale users later does not refund
  the cycle in which they authenticated.
  Source: https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users
  (2026-08-25).
- Disabled toggle → error code `anonymous_provider_disabled` ("Anonymous
  sign-ins are disabled").

## 7. Lifecycle — dormancy, cleanup, and the deletion hazard

- **Dormant sessions do not die by default.** Access tokens default to 1 h;
  "refresh tokens never expire but can only be used once" (rotation, 10 s
  reuse window); "by default, [a session] lasts indefinitely." Time-boxed
  sessions and inactivity timeouts exist but are **Pro plan and up**. So an
  untouched device keeps working access forever unless the user row is
  deleted or a session policy is configured.
  Source: https://supabase.com/docs/guides/auth/sessions (2026-08-25).
- **Cleanup:** "Automatic cleanup of anonymous users is currently not
  available." Recommended manual SQL, verbatim from the guide:

  ```sql
  delete from auth.users
  where is_anonymous is true and created_at < now() - interval '30 days';
  ```

  Source: https://supabase.com/docs/guides/auth/auth-anonymous (2026-08-25).
- ☠️ **The recommended SQL is age-based, not activity-based** (inference,
  flagged — the docs carry no warning). A device can hold a perfectly valid
  refresh token for a 31-day-old anonymous user; deleting the row cascades
  away sessions and data, and the device's next token refresh fails
  (`refresh_token_not_found` / `session_not_found` — "Session containing the
  refresh token not found") with the user's journal data already gone,
  unrecoverably. If we adopt cleanup, gate it on last activity (e.g. newest
  `auth.refresh_tokens.updated_at` / `auth.sessions` timestamps for the
  user), not `created_at` alone — or make the retention window far longer
  than any plausible return gap.

## 8. RLS patterns

Anonymous users hold the `authenticated` role, so **every existing
`to authenticated` policy already applies to them** — the guide's admonition
is to review all policies before flipping the toggle. The recommended
predicate is the JWT claim, and the recommended shape is a **restrictive**
policy so permissive policies can't accidentally re-grant:

```sql
create policy "Only permanent users can post to the news feed"
on news_feed as restrictive for insert
to authenticated
with check ((select (auth.jwt()->>'is_anonymous')::boolean) is false);
```

```sql
create policy "Anonymous and permanent users can view the news feed"
on news_feed for select
to authenticated
using ( true );
```

Source: https://supabase.com/docs/guides/auth/auth-anonymous (2026-08-25).
Pair this with the §3 caution: the claim is stale until the next access token
is minted, so refresh the session right after conversion.

## Repo-relevant deltas (for the #1427 decisions)

- `supabase/config.toml` today: `enable_confirmations = false`, no
  `enable_anonymous_sign_ins`, no `enable_manual_linking` — both keys must be
  added for local dev, and both dashboard toggles are explicit per-project
  release steps (staging, then prod), like the autoconfirm flip was.
- The custom token_hash email templates (`email_change.html`) are only
  relevant if autoconfirm is ever turned off — under the current config the
  anonymous→email link sends nothing.
- Google web linking rides the existing PKCE setup; Apple native linking
  needs no new dependency — the pinned supabase-js already has the id-token
  `linkIdentity` overload. The one implementation trap is using
  `signInWithIdToken` where `linkIdentity` is meant (§4).

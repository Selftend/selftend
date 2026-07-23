# Operations Runbook

This runbook defines the minimum operational process for support, privacy requests, security incidents, and breach handling. It is practical operating guidance, not legal advice.

## Contacts

- Support: `support@selftend.org`
- Privacy, data requests, deletion fallback: `privacy@selftend.org`
- Security reports: `security@selftend.org`
- Public security policy: [.github/SECURITY.md](../.github/SECURITY.md)

## Field Encryption Key Management

User-entered records are encrypted at rest using a symmetric key stored as a **Supabase Vault secret** named `app_field_encryption_key`. The Vault root key is held outside the database, so a leaked DB dump cannot be read without this secret.

### First deploy

1. In the Supabase Dashboard (or via the CLI `supabase secrets set`), create the Vault secret `app_field_encryption_key` with a strong random value (e.g. 32+ bytes of random hex).
2. **Back the production key up offline immediately** (e.g. a password manager or encrypted offline store). Losing the key means losing all encrypted data - there is no recovery path without it.
3. Use a **different key per environment** (local dev, staging, production). The local stack's key from `supabase/seed.sql` must never be used in production.

### Rotation

Key rotation requires a re-encrypt pass:

1. Write the new key to Vault under a temporary name.
2. Run a batched migration that reads ciphertext via the old key, re-encrypts with the new key, and writes back.
3. Update the Vault secret `app_field_encryption_key` to the new value once the re-encrypt is confirmed complete.
4. Back up the new key offline.

### `seed.sql` / local dev

`seed.sql` upserts a deterministic local key via an insert into the Vault secret. On `db:reset` the local stack reinitializes with this key. Seeded test users' data is encrypted with the local key; the local and remote keys are intentionally different.

### Key in SQL / migrations

The `app_field_encryption_key` secret is read **only** inside `SECURITY DEFINER` functions (`app.encrypt_text` / `app.decrypt_text`). It must never appear in plain SQL migrations, client code, or `pg_stat_statements`.

## Auth Security Toggles

These settings live outside the repo (Supabase Dashboard). Apply per environment.

### Supabase Dashboard

- **Authentication → Sign In / Providers → Email → Minimum password length:** `12` (production). Required-characters field left empty (NIST-modern stance - length over class rules). Also mirrored in `supabase/config.toml` as `minimum_password_length = 12` for local dev parity.
- **Authentication → Settings → Email confirmations:** ON (already configured via `[auth.email]` in `config.toml` - verify the Dashboard view matches).
- **Authentication → Multi-Factor → TOTP (App Authenticator):** Enabled. UI for end-users to enroll ships in a future phase; the factor type is enabled in advance so it's ready when that UI lands.

### Not currently enabled (paid-plan gated)

- **Prevent use of leaked passwords (HIBP check):** Pro plan and above only. Code path is wired (`LEAKED_PASSWORD_ERROR` surfaces an inline "this password appears in known data breaches" message at signup and password change) so the feature lights up automatically if/when the project upgrades to Pro. See [Deferred Security Decisions](#deferred-security-decisions) for the re-evaluation trigger.

### CAPTCHA

Not enabled. See [Deferred Security Decisions](#deferred-security-decisions) for the re-evaluation trigger.

### Verification after deploy

Smoke test:

- Sign up with an 11-char password - must be rejected with `weak_password / length` ("Password should be at least 12 characters").
- Sign up with a 12-char password - must succeed.

## Auth Email Templates (production Dashboard - owner action)

The default Supabase email templates link through `{{ .ConfirmationURL }}`,
which under the PKCE flow produces a `?code=` link that only completes in the
browser profile that initiated the request ("PKCE code verifier not found in
storage" anywhere else - e.g. requesting a reset on your phone and opening the
email on your laptop). The app's callback completes `token_hash` links via
`verifyOtp`, which works in **any** browser. Local dev already uses token_hash
templates (`supabase/config.toml` + `supabase/templates/*.html`); production
must mirror them by hand - templates are not part of `db push`.

### Steps

1. Supabase Dashboard → **Authentication → Emails** (template editor).
2. For each of the five templates below, set the **subject** and replace the
   **message body** with the exact HTML from the matching file in
   `supabase/templates/` (single source of truth - copy from the repo, do not
   retype). The critical part is the link format (in the raw HTML the `&` is
   written `&amp;`, exactly as in the repo files):

   | Template       | Subject                               | Link in body (exact format)                                                  |
   | -------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
   | Confirm signup | `Confirm your email for Selftend`     | `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=signup`       |
   | Reset password | `Reset your Selftend password`        | `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=recovery`     |
   | Change email   | `Confirm your new email for Selftend` | `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=email_change` |
   | Invite user    | `You're invited to Selftend`          | `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=invite`       |

   Never use `{{ .RedirectTo }}` as the link base: native clients send the app
   scheme (`selftend://auth-callback`) as `redirect_to`, and GoTrue's Go
   html/template refuses custom schemes inside an `href` - the button renders
   with the dead literal `ZgotmplZ?token_hash=...` and clicking does nothing
   (found live in prod, 2026-07-22). `{{ .SiteURL }}` is always http(s), so
   the link works from every client and email app.

   Body files: `confirmation.html`, `recovery.html`, `email_change.html`,
   `invite.html` in `supabase/templates/`. (Invite matters
   even without an invite UI: admin-API invitations from the Dashboard would
   otherwise send the default PKCE `?code=` link, which breaks cross-browser.)

3. **Verify Site URL** = `https://selftend.org` - exactly, with **no trailing
   slash** (Authentication → URL Configuration). `{{ .SiteURL }}` is the base
   of every emailed link, so it must be the production origin, never a preview
   or localhost value; a trailing slash turns links into
   `https://selftend.org//auth-callback?...`, which does not route.
4. **Verify the redirect allowlist** contains `https://selftend.org/auth-callback`
   (same URL Configuration page).
5. Smoke test after saving: request a password reset from the production site,
   open the email **in a different browser** than the one that requested it, and
   confirm the link lands on `/auth-callback?token_hash=...&type=recovery` and
   reaches the "Reset your password" screen. Repeat once for a fresh signup
   confirmation.

### Local development note

The local stack reads these templates only at `supabase start` (`npm run
db:start`) - a `db:reset` does NOT reload them. After editing
`supabase/config.toml` or any file in `supabase/templates/`, restart the stack
(`npm run db:stop && npm run db:start`) or the old templates keep being sent.

### Deployment-order note

Update these templates **together with (or before)** deploying an app version
that includes the query-less password-reset redirect (2026-07). With NEW app +
OLD templates, a recovery email still signs the user in but lands them in the
app instead of the update-password screen (the old `?code=` link no longer
carries the recovery marker). With OLD app + NEW templates everything works -
the callback has handled `token_hash` links since the previous release. Links
from emails sent before the switch keep working either way (the callback
retains the `code` branch, which is also still used by web Google OAuth).

## Support Workflow

- Check `support@selftend.org` at least weekly during testing and more often during public launch windows.
- Do not ask users to send detailed mental-health, crisis, therapy, or other sensitive self-help content by email.
- For urgent distress or self-harm messages, reply once with calm crisis guidance and direct the person to local emergency or crisis resources. Do not provide counseling or ongoing crisis support by email.
- For product bugs, ask only for the minimum needed: platform, browser/app version, steps, expected result, actual result, and screenshots only if they do not reveal private content.
- Move reproducible non-private bugs into GitHub issues. Keep private account, health, security, or deletion details out of public issues.
- Keep a private support log outside the repo with date received, sender email, category, status, and date closed.
- On the same weekly cadence, glance at the auth abuse signals: the count of
  unconfirmed `auth.users` rows in the production Dashboard (baseline 2/32 on
  2026-07-23; dozens of stale unconfirmed rows = bots), Supabase auth-email
  rate-limit or bounce warnings, and Sentry/auth-log anomalies suggesting
  scripted signups. Any of these firing means the CAPTCHA deferral trigger has
  fired — see [Deferred Security Decisions](#deferred-security-decisions).

## Privacy And GDPR Requests

- Use `privacy@selftend.org` for access, export, correction, restriction, objection, deletion fallback, complaints, and transfer-safeguard requests.
- Acknowledge privacy requests within 7 days.
- Complete valid requests within one month of receipt. If a request is complex or repeated and needs more time, tell the user within the first month and explain the extension.
- Verify identity before disclosing or deleting account data. Prefer requests from the email address attached to the Selftend account.
- Prefer self-service export and deletion in Settings when the user can access the account.
- Use manual handling only when self-service cannot work, when the user asks for a right not covered in-app, or when the request requires explanation.
- Keep a private request log outside the repo with received date, request type, verification state, action taken, response date, and closure date.
- Do not store private request logs, user exports, identity documents, or support inbox exports in this repository.

## Sensitive Self-Help Content

Selftend is not a medical app and does not diagnose, treat, or provide emergency support. Still, user-entered self-help content may include mental-health reflections or other sensitive information. Treat all user-created records as highly private.

- Do not use user-created records for advertising, analytics, AI training, research, public examples, or contributor demos.
- Do not read user records unless needed to fulfill a verified privacy request, investigate a security incident, or satisfy a legal obligation.
- Keep reminders optional and off by default.
- Keep the policy acceptance flow active when privacy or terms text materially changes.

## Security Incident Response

Follow [.github/SECURITY.md](../.github/SECURITY.md) for intake and safe harbor.

1. Acknowledge credible security reports within 7 days.
2. Preserve evidence: timestamp, reporter, affected systems, logs, screenshots, and the suspected data classes involved.
3. Triage severity and whether personal data confidentiality, integrity, or availability may be affected.
4. Contain the issue: rotate exposed keys, disable vulnerable code paths, tighten Supabase RLS, revoke sessions, or pause affected deployments as needed.
5. Fix and verify with the smallest safe release.
6. Record the incident privately outside the repo with dates, impact, root cause, actions taken, and follow-up work.
7. Update public docs only after private details and exploit instructions have been removed.

## Personal Data Breach Process

A personal data breach means a security incident that affects confidentiality, availability, or integrity of personal data.

1. Open a private incident record immediately after discovering a suspected breach.
2. Determine whether personal data was involved and which users, data categories, processors, and jurisdictions may be affected.
3. Assess risk to individuals. Pay extra attention to account data, self-help records, reminder subscriptions, and any content that could reveal mental-health or wellness information.
4. If the breach is likely to risk individuals' rights and freedoms, notify the relevant supervisory authority without undue delay and no later than 72 hours after becoming aware of it.
5. If the breach is likely to create high risk for affected users, notify those users directly unless effective measures make the risk unlikely to materialize.
6. If Selftend receives a processor breach notice from Supabase, Cloudflare, Google, Expo, or another provider, assess whether Selftend must notify authorities or users.
7. After closure, add prevention tasks to [.github/ROADMAP.md](../.github/ROADMAP.md) without exposing private incident details.

## DPIA Screening

Decision on 2026-05-12: a full Data Protection Impact Assessment is not required for the current MVP scope, but the decision must be revisited before public scale, new high-risk processing, or major product changes.

Reasons:

- No automated decision-making, profiling, diagnosis, treatment recommendation, or therapist-replacement feature.
- No systematic monitoring of public areas.
- No advertising, behavioral analytics, social feed, or tracking pixels.
- Processing is user-initiated, account-based, and scoped to guided self-help records and preferences.
- Sensitive content risk exists because users may enter wellness or mental-health reflections, but current processing is not intended to be large scale and is limited to storing and showing the user's own records.

Revisit the DPIA decision before:

- Launching at public scale beyond small testing.
- Adding AI, analytics, research use, social/community features, clinician/third-party sharing, child-directed features, under-18 support, or broader health-data integrations.
- Adding new processors or new cross-border transfer mechanisms.
- Changing from voluntary self-help records to medical, diagnostic, or treatment claims.

## Transfer Impact Assessment

Initial decision on 2026-05-12: Selftend uses US-based processors and relies on processor DPAs, Standard Contractual Clauses where applicable, and data minimization.

Current safeguards:

- Supabase DPA executed via PandaDoc on 2026-05-12.
- Cloudflare, Supabase, Google OAuth, Expo/EAS, and browser push services are disclosed in the privacy policy where relevant.
- No advertising networks, analytics trackers, or data brokers are used.
- User data is minimized to account email, preferences, optional reminder data, and user-created records.
- Users can request transfer-safeguard information through `privacy@selftend.org`.

Open follow-up:

- Confirm and record Cloudflare DPA status before broad public launch.
- Keep processor locations, transfer mechanisms, and privacy policy disclosures current.
- Reassess transfers if a new processor, analytics provider, AI provider, or hosted support tool is added.

## Pre-Invite Checklist (Closed Testing)

Complete every item before sending the first closed-testing invites. None of
these can be verified from the repo.

- **Custom SMTP is configured** in Supabase Dashboard -> Project Settings ->
  Auth -> SMTP. Supabase's built-in email service is rate-limited to a few
  emails per hour and will break a tester wave with email confirmations
  enabled. The stack uses **AWS SES** for outbound mail (the `send-feedback`
  function; Resend is being retired — control-tower #102), so prefer **SES** for
  auth custom SMTP too. Send a test signup and confirm the email arrives from
  the custom domain.
- **Auth rate limits reviewed** in Supabase Dashboard -> Auth -> Rate Limits:
  confirm sign-up, sign-in, OTP, and recovery limits will not lock out a
  12-20 tester wave arriving the same day (several testers may share an
  office/household IP).
- **Play Console tester threshold confirmed**: personal developer accounts
  created after November 2023 must run a closed test with a minimum number
  of testers for 14 continuous days before production access unlocks. Check
  the current threshold in Play Console -> Dashboard and recruit
  accordingly.
- **Sentry alerts on**: a new-issue email alert exists for the production
  project and lands in a monitored inbox (weekly review minimum, per the
  Support Workflow section).

## Deferred Security Decisions

Recorded here so they stay decisions, not gaps. Each lists its
re-evaluation trigger.

- **CAPTCHA on auth endpoints**: re-deferred at the Android production
  go-live decision
  ([#189](https://github.com/Selftend/selftend/issues/189), 2026-07-23) —
  no abuse observed in ~6 weeks of publicly reachable auth endpoints, and
  the Play promotion adds visibility, not new attack surface. Triggers:
  **observed signup abuse** (spike in unconfirmed `auth.users` rows —
  baseline 2/32 on 2026-07-23; Supabase auth-email rate-limit or bounce
  warnings; auth-log/Sentry anomalies showing scripted signups — checked
  weekly as part of the [Support Workflow](#support-workflow)), or **before any
  deliberate marketing/announcement push** beyond the Play listing.
  Implementation when triggered (pre-decided, do not re-litigate):
  Supabase's built-in CAPTCHA toggle with **Cloudflare Turnstile**
  (server-enforced, all platforms; one provider project-wide). Native uses
  an own ~100-line WebView component per Cloudflare's official recipe; web
  uses `@marsidev/react-turnstile`. Full recipe, test keys, and e2e
  implications:
  [CAPTCHA research](https://github.com/Selftend/selftend/blob/research/supabase-captcha-options/docs/research/2026-07-23-supabase-captcha-options.md).
  Enabling adds a new external provider and a credential (Turnstile secret
  key) — update control-tower's inventory per the architecture rule.
- **TOTP MFA UI** (factor type already enabled in `supabase/config.toml`):
  deferred. Trigger: post-launch phase, after closed-testing feedback.
- **HIBP leaked-password check**: enable if/when the project is on a
  Supabase plan that includes it (see Auth Security Toggles above).
- **Cache-owner check for the persisted query cache**: the AsyncStorage read
  cache is purged on SIGNED_OUT, but a session that dies without that event
  (expired refresh token) leaves the previous user's cache on device for up
  to 24 hours. It is never rendered to another account (queries are
  user-id-keyed) and maxAge/version-buster bound the window. Deferred:
  implement an owner-id marker (purge on sign-in with a different user id).
  Trigger: before the open production release.

## Public Launch Gate

Before broad public launch:

- Final human/legal review of privacy policy, terms, crisis guidance, and the adults-only 18+ launch posture.
- Confirm support, privacy, security, and deletion aliases are monitored.
- Keep this runbook, [gdpr-compliance.md](gdpr-compliance.md), and [.github/ROADMAP.md](../.github/ROADMAP.md) in sync.

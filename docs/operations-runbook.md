# Operations Runbook

This runbook defines the minimum operational process for support, privacy requests, security incidents, and breach handling. It is practical operating guidance, not legal advice.

## Contacts

- Support: `support@selftend.org`
- Privacy, data requests, deletion fallback: `privacy@selftend.org`
- Security reports: `security@selftend.org`
- Public security policy: [.github/SECURITY.md](../.github/SECURITY.md)

## Release incidents (bad production release)

The halt-and-hotfix runbook lives with the release docs, not here — one home,
kept next to the pipeline it describes:
[Rollback runbook](./releasing.md#rollback-runbook) (detection → halt → ship
forward) and [Hotfixes](./releasing.md#hotfixes) for the fast path to `main`.
The one rule that protects every release:
[the migration forward-compatibility rule](./releasing.md#the-migration-forward-compatibility-rule).
Detection is Sentry's release-tagged alert; Play vitals and reviews trail by
hours to days.

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
- **Authentication → Sign In / Providers → User Signups:** "Allow anonymous sign-ins" ON and "Allow manual linking" ON (both hosted projects: production since 2026-09-02, #1674 - guest entry live; staging since 2026-09-02, #1453; manual linking is required by the guest→registered OAuth conversion, `linkIdentity`, #1445). Mirrored in `supabase/config.toml` as `enable_anonymous_sign_ins` / `enable_manual_linking`. The anonymous rate cap stays at the Supabase default 30 guest creations/hour/IP (Authentication → Rate Limits; #1432 ruling, confirmed live 2026-09-02). Turning "Allow anonymous sign-ins" OFF is the guest-entry kill switch - the client degrades the landing CTA to the sign-up form on `anonymous_provider_disabled`.

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
   | Magic Link     | `Your Selftend verification code`     | `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=email`        |

   The Magic Link template is the verify-banner's OTP email (#489): its body
   leads with the `{{ .Token }}` 6-digit code (the primary path - the user
   types it into the banner) and carries the link only as a fallback. Note its
   link type is `email`, not `magiclink` - `email` is the spelling the app
   callback accepts.

   Never use `{{ .RedirectTo }}` as the link base: native clients send the app
   scheme (`selftend://auth-callback`) as `redirect_to`, and GoTrue's Go
   html/template refuses custom schemes inside an `href` - the button renders
   with the dead literal `ZgotmplZ?token_hash=...` and clicking does nothing
   (found live in prod, 2026-07-22). `{{ .SiteURL }}` is always http(s), so
   the link works from every client and email app.

   Body files: `confirmation.html`, `recovery.html`, `email_change.html`,
   `invite.html`, `magic_link.html` in `supabase/templates/`. (Invite matters
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
   confirm the link lands on `/auth-callback?token_hash=...&type=recovery`,
   shows the **"Password reset" confirmation card** (email links wait for a
   human press so mail scanners can't spend the one-time token), and — after
   pressing **"Choose a new password"** — reaches the "Reset your password"
   screen. Repeat once for a fresh signup confirmation (card button:
   **"Confirm my email"**).

### Autoconfirm flip (#489 release step - owner action, one-time)

Sign-in-without-verification ships dark until production auth config flips.
When the release that carries `user_preferences.email_verified` (migration
`20260805000000`) goes to production, in the same session:

1. Dashboard → Authentication → Sign In / Up → email: turn **"Confirm email"
   OFF** (`mailer_autoconfirm: true` via the Management API does the same).
2. Run the one-time confirm-backfill so any still-unconfirmed account can
   sign in (SQL via the Management API):
   `update auth.users set email_confirmed_at = now() where email_confirmed_at is null and email is not null;`
3. Paste the Magic Link template (table above) so the banner's code emails
   render the code (safe to do earlier - the template is inert until the
   banner sends).

Until the flip, nothing changes for prod users: GoTrue still refuses
unconfirmed sign-ins, signup still returns no session, and the app's legacy
verify-email screen still covers that path. The flip is safe to do late but
must not be done **before** the release is live, or new signups would land in
an app build that still walls on `email_confirmed_at`.

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
  scripted signups. Record the anonymous-account count
  (`select count(*) from auth.users where is_anonymous`, via the Dashboard
  SQL editor or the Management API) and the dashboard MAU, and check both
  against the guest triggers (anonymous accounts >5× store installs or an
  unexplained spike; MAU crossing 25,000). Any of these firing means the
  CAPTCHA deferral trigger has fired — see
  [Deferred Security Decisions](#deferred-security-decisions).

## Privacy And GDPR Requests

- Use `privacy@selftend.org` for access, export, correction, restriction, objection, deletion fallback, complaints, and transfer-safeguard requests.
- Acknowledge privacy requests within 7 days.
- Complete valid requests within one month of receipt. If a request is complex or repeated and needs more time, tell the user within the first month and explain the extension.
- Verify identity before disclosing or deleting account data. Prefer requests from the email address attached to the Selftend account.
- Prefer self-service export and deletion in Settings when the user can access the account.
- Use manual handling only when self-service cannot work, when the user asks for a right not covered in-app, or when the request requires explanation.
- Feedback content lives outside the database, in **two** places that self-service deletion never touches: the support mailbox and the private `#feedback-inbox` Discord channel (a mirror of each in-app submission's category + message text). Neither copy is linked to an account, so on an erasure request search **both** manually by content and delete what matches.
- Keep a private request log outside the repo with received date, request type, verification state, action taken, response date, and closure date.
- Do not store private request logs, user exports, identity documents, or support inbox exports in this repository.

## Delete On Knowledge (under-floor accounts)

Selftend admits people from 13, or their country's higher floor - the table is in [age-floor.md](age-floor.md). This section is what to do on the day someone tells us an account belongs to a person below it.

**Knowledge only ever arrives from outside, and that is by design.** Nothing stored distinguishes a teen from an adult: there is no minor flag, because the protections are universal rather than age-targeted (spec [#227](https://github.com/Selftend/selftend/issues/227) §4, argued in [dpia-minors-assessment.md](dpia-minors-assessment.md) §5 — [#1768](https://github.com/Selftend/selftend/issues/1768)). The one column that touches age, `age_floor_met`, is only ever written `true` - an under-floor verdict at the gate writes nothing at all, because the account it would be written against is deleted on the spot ([#1765](https://github.com/Selftend/selftend/issues/1765)). So the column holds `true` or `null`, and **no query finds an under-floor account**. ⚠️ That is writer behaviour, not a schema fact: `age_floor_met` is a plain nullable boolean, nothing constrains it, and a future write of `false` would not be rejected. What the column guarantees is only that `null` means _never asked_ rather than _failed_. Do not go hunting for a report that cannot exist, and do not add the field that would make one possible.

Reports reach us through `support@selftend.org` or `privacy@selftend.org`, the private `#feedback-inbox` Discord channel, a store review or store report, or the person themselves.

**Act on credible knowledge, not on suspicion.** Credible means a specific, first-hand claim about an identifiable account - the person saying so, or a parent or guardian naming the address the account uses. Someone's writing style is not evidence, and a hunch is not knowledge.

⚠️ **Data minimisation applies to the investigation too.** Ask at most which country the person is in. Never ask for a date of birth, never ask for a document or an ID, and never read the person's records to age them. Building an age dossier in the course of enforcing an age floor would create exactly the special-category record the gate exists to discard.

### Steps

1. **Acknowledge within 7 days**, on the same clock as every other privacy request, and act without undue delay - days, not weeks.
2. **Establish which account it is.** For a registered account, find it by email against the production database: `select id, email, created_at from auth.users where lower(email) = lower('…');`
   ☠️ **A guest account cannot be found from a report.** The silent guest is the primary entry path, it carries no email, and nothing outside the device names the row - so there is no lookup, and searching records content for a match is never an acceptable substitute. Reply with the in-app route instead: Settings → Delete account, on the device holding the session, which runs the same purge as step 5. If the device is out of reach, say so plainly rather than implying the row is gone: it still holds whatever that person wrote, nothing in it identifies them to us, and it is eventually collected by the guest dormancy job (`20260826010000_guest_dormancy_cleanup.sql`, twelve months).
3. **Verify the connection proportionately.** Prefer a message from the account's own address. When a parent or guardian reports, confirm only that the report is handled - do not disclose the account's existence, contents, or activity to them (§ [Privacy And GDPR Requests](#privacy-and-gdpr-requests), identity before disclosure).
   **The report cannot be corroborated, because the limits above forbid asking for proof. Decide anyway, with this rule:**
   - The account holder reports themselves → act. Nothing more to establish.
   - A parent or guardian reports, first-hand and specifically, with a plausible connection to the account → **write to the account holder once**, saying what has been reported and that the account will be removed, and give them a few days to reply. Act on their answer. **If nobody replies, act on the report** - an unanswered credible report is not a reason to keep processing someone's self-help entries under a floor they may not meet.
   - The reporter has no plausible connection to the account - an anonymous tip, a stranger, someone in an argument with the account holder → **that is not knowledge.** Do not delete. A deletion anyone can trigger against anyone is a harassment tool, and the person who loses their entries is the one being harassed.
     Record which of the three applied (step 8). Erring is possible in both directions and neither is free, so the record is what makes the next call better rather than merely faster.
4. **Decide which floor applies.** Read it for the person's country from [age-floor.md](age-floor.md); `FLOOR_BY_COUNTRY` in `src/features/auth/age-floor.ts` is the same table in machine form. Use where the person actually is, not `age_attested_country` - that column records what was attested, which is the thing in doubt. If no country can be established, apply the absolute minimum floor of **13** and record that you did.
5. **Delete the account.** As `service_role` - the Supabase SQL editor or the Management API - run `select public.purge_user_account('<uuid>'::uuid);` That helper is the single source of truth for what deletion removes: objects under the person's folder in the private `profile-pics` bucket, then every explicit per-table delete, then the `auth.users` row (`20260826000000_account_purge_helper.sql`). Two things it is not. `delete_user_account()` is the **self-service** RPC and derives its target from `auth.uid()`, so it cannot erase anyone but its caller. And a raw `delete from auth.users` strands storage objects and skips the per-table deletes, which is why that migration rules it out in its own words.
6. **Sweep the two copies deletion never touches** - the support mailbox and the private `#feedback-inbox` Discord channel. Neither is linked to an account, so search both by content and delete what matches, exactly as on an erasure request.
7. **Tell the person, once, calmly.** Say what was removed, that it is not a punishment, and the age at which they are welcome back. Point to `/crisis` and Find A Helpline, which work without an account - the same two links the under-floor exit screen carries, and for the same reason. Do not lecture, do not ask anyone to prove an age, and do not offer an appeal that could only be settled by collecting the data we refuse to collect. Reply to the address that wrote to us, as ordinary mail; never trigger an auth or transactional email to it.
8. **Record it in the private log outside the repo**: the date the knowledge arrived, how it arrived, the country and the floor applied, that the connection was verified (not the evidence itself), the account id or "guest - not identifiable", the deletion timestamp, and the date the person was told. **Do not record an age or a date of birth**, do not keep the report body, and do not copy any of it into a GitHub issue.

**The limit this has, stated rather than implied.** A server-side deletion writes no device block: `selftend:age-floor:blocked-until` is written on the device by the under-floor exit itself (`src/features/auth/use-under-floor-exit.ts`), and there is no ops-side way to set it. The next launch therefore mints a fresh guest and meets the age gate again, where the answer may differ. The floor is an attestation, not a verification, and Selftend deliberately builds no age-verification infrastructure (spec [#227](https://github.com/Selftend/selftend/issues/227) §10). Deleting on knowledge is what can actually be done, and it is worth doing; it is not a control that keeps someone out.

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
7. After closure, open a [GitHub issue](https://github.com/Selftend/selftend/issues) for each prevention task, without exposing private incident details.

## DPIA Screening

> [!IMPORTANT]
> **Superseded on 2026-09-04.** A full DPIA now exists, combined with the minors' data-protection assessment: [dpia-minors-assessment.md](dpia-minors-assessment.md) ([#1768](https://github.com/Selftend/selftend/issues/1768)). Read that document, not this section, for the current position. This screening is kept because a decision that was overtaken is part of the accountability record, and because its own last bullet — _revisit before adding under-18 support_ — is what fired.

Decision on 2026-05-12: a full Data Protection Impact Assessment is not required for the current MVP scope, but the decision must be revisited before public scale, new high-risk processing, or major product changes.

Reasons:

- No automated decision-making, profiling, diagnosis, treatment recommendation, or therapist-replacement feature.
- No systematic monitoring of public areas.
- No advertising, behavioral analytics, social feed, or tracking pixels.
- Processing is user-initiated, account-based, and scoped to self-help records and preferences.
- Sensitive content risk exists because users may enter wellness or mental-health reflections, but current processing is not intended to be large scale and is limited to storing and showing the user's own records.

Revisit the DPIA decision before:

- Launching at public scale beyond small testing.
- Adding AI, analytics, research use, social/community features, clinician/third-party sharing, child-directed features, under-18 support, or broader health-data integrations.
- Adding new processors or new cross-border transfer mechanisms.
- Changing from voluntary self-help records to medical, diagnostic, or treatment claims.

## Annual Legal-Landscape Check (minors)

Once a year, every **September** - anchored to the month the per-country age floor shipped (2026-09) - re-read the six areas below, and re-read any one of them immediately if it moves in the meantime. First due **September 2027**.

Each check updates the combined DPIA and minors' data-protection assessment, [dpia-minors-assessment.md](dpia-minors-assessment.md) ([#1768](https://github.com/Selftend/selftend/issues/1768)) — §6 for what a legal item moves, §8 for what re-opens the whole document. If a floor changes, the check also updates [age-floor.md](age-floor.md), `FLOOR_BY_COUNTRY` in `src/features/auth/age-floor.ts`, and the published table in `src/i18n/locales/{en,bg}/policies.json`. ⚠️ That last one is a disclosure change: it bumps `policyVersion` and moves the consent digest, which re-gates every existing user. A real cost, worth knowing before the edit rather than after.

**Record the date checked on every line below, even when nothing changed.** "Checked, no change" is what makes the next year's check cheap.

- **Colorado - CPA minors amendments.** SB 24-041 took effect 2025-10-01, and the Attorney General's amended minors rules were **adopted 2025-10-08** - so the "final rules" this check was created to wait for have landed. What remains open is the notice-and-60-day-cure period for minors' violations, which ends **2026-12-31**. Review whether the adopted rules reach a free non-profit wellness app that runs no ads, sells nothing, and profiles nobody. https://coag.gov/resources/colorado-privacy-act/ (checked 2026-09-04)
- **US federal - KOSA, COPPA 2.0, and the KIDS Act.** Neither KOSA nor COPPA 2.0 is enacted. Both were folded into the **KIDS Act (H.R. 7757)**, which the House passed on 2026-06-29 **without KOSA's duty of care**; Senate sponsors rejected that version, so enactment is unsettled. Check what passed, and whether a duty of care survived - the duty of care is the half that would reach product design rather than data handling. https://www.congress.gov/crs-product/LSB11465 (checked 2026-09-04)
- **Vermont Age-Appropriate Design Code (S.69).** Signed 2025-06-12, effective **2027-01-01** - the one item here with a date already on it. The Vermont AG is making the rules, including which age-assurance methods count. Review them as they issue, and whether the Act's "reasonably likely to be accessed by minors" test and its minimum duty of care reach Selftend. https://ago.vermont.gov/vermont-age-appropriate-design-code-rulemaking (checked 2026-09-04)
- **Play Age Signals API.** Google does not mandate it; it returns age bands (0-12, 13-15, 16-17, 18+) to apps that ask, and it is rolling out by country - Brazil from 2026-03-17, Texas for accounts created after 2026-05-28, Australia and Canada from mid-August 2026, wider rollout expected through 2026. Check whether Play has made it a requirement for the audience Selftend declares, and whether the TX/UT/LA app-store age statutes now reach a free non-profit app - spec [#227](https://github.com/Selftend/selftend/issues/227) §9's first parked counsel question. https://developer.android.com/google/play/age-signals/overview (checked 2026-09-04)
- **EU DSA Article 28(1).** The Commission's guidelines on the protection of minors were finalised on 2025-07-14 and exclude micro and small enterprises. Following them is voluntary, but the Commission uses them to assess Art. 28(1) compliance and national regulators may follow. Check whether Selftend still falls inside the micro/small exception, and whether any national coordinator has acted on them. https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors (checked 2026-09-04)
- **UK Online Safety Act.** Ofcom's protection-of-children duties and codes, and any updates to them. Check scope first: those duties attach to user-to-user and search services, and Selftend hosts nothing user-to-user - nothing a person writes is visible to anyone else. If that ever changes, this line stops being a scope check and becomes a compliance one. https://www.ofcom.org.uk/online-safety/protecting-children/protection-of-children-duties-under-the-online-safety-act (checked 2026-09-04)

Alongside those, re-read the per-country statute checks in [age-floor-statute-checks.md](age-floor-statute-checks.md) ([#1763](https://github.com/Selftend/selftend/issues/1763)) — every floor's source and the date it was last read are there, and Denmark is the proof that a floor goes stale silently — and the parked counsel questions in spec [#227](https://github.com/Selftend/selftend/issues/227) §9. Escalate to external counsel only if one of them goes live.

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
  weekly as part of the [Support Workflow](#support-workflow)),
  **anonymous-account growth wildly out of proportion to store installs**
  (more than 5× the installed base, or an unexplained week-over-week
  spike), **MAU crossing 25,000** (half the free plan's 50,000-MAU ceiling
  per [Supabase pricing](https://supabase.com/pricing), date checked
  2026-08-25 — chosen because deleting bot accounts does not refund the
  billing cycle's MAU),
  or **before any deliberate marketing/announcement push** beyond the Play
  listing.
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

- Final human/legal review of privacy policy, terms, crisis guidance, and the per-country age floor ([age-floor.md](age-floor.md)) — including the teen-readable summary, the parents-and-guardians section, and the Art. 9 consent wording, in `en` and `bg`. Tracked as [#1771](https://github.com/Selftend/selftend/issues/1771).
  - Explicitly in that review's scope and **deliberately not changed by the copy rewrite**: **terms §12, _Limitation of liability_**. Spec [#227](https://github.com/Selftend/selftend/issues/227) §6 marks its minor-related wording "(owner-review scope)". It names no minor today, and its third clause already preserves liability that cannot be excluded by law — which is where minority would bite — so the rewrite left it alone rather than guess at contract language. It needs a lawyer's read now that under-18s are admitted, not an editor's.
- Confirm support, privacy, security, and deletion aliases are monitored.
- Keep this runbook and [gdpr-compliance.md](gdpr-compliance.md) in sync.

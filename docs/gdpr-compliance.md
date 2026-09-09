# GDPR Compliance Posture

This document records Selftend's compliance posture under the GDPR and equivalent frameworks. Lawful-basis, processor, and retention specifics live in [policies.md](policies.md); operational workflows for incidents, requests, and breach notification live in [operations-runbook.md](operations-runbook.md). Open compliance work is tracked in [GitHub Issues](https://github.com/Selftend/selftend/issues), not in the repo.

## Principles (Article 5)

Selftend processes data in line with all seven Article 5 principles. Lawful basis and transparency are documented in the privacy policy; data minimization is enforced by collecting only email, preferences, and user-created content (no date of birth, no device identifiers); accuracy is supported by in-app editing; storage limitation follows the 30-day post-deletion retention window; integrity and confidentiality rely on HTTPS, Row-Level Security, SecureStore, and CSP headers; accountability is supported by this document, [policies.md](policies.md), and the privacy policy.

## Lawful Basis (Article 6 and Article 9)

Lawful bases are documented in the [policies.md "Lawful basis" table](policies.md): contract for core service delivery, consent for native and web push reminders, explicit consent for any user-entered self-help content that may engage Article 9, and legitimate interest for security and auth-event logging. Selftend is not a medical or diagnostic product, but user-entered records may include wellness or mental-health reflections, so they are treated operationally as highly private.

## Transparency (Articles 12-14)

The privacy policy at `/privacy` is accessible without sign-in and states: the controller identity (Selftend, operated by Vasil Yoshev), contact (privacy@selftend.org), processing purposes, lawful bases, processors and recipients, international transfer information, retention periods, data subject rights, the right to withdraw consent, the right to lodge a complaint, and whether data provision is statutory or contractual.

## Data Subject Rights (Articles 15-22)

Right of access and portability are served by JSON data export in Settings. Right to rectification is served by in-app editing. Right to erasure is served by self-service account deletion in Settings (DB RPC + UI). Right to restriction and right to object are handled via email request to privacy@selftend.org. The one-month response deadline and request logging are documented in [operations-runbook.md](operations-runbook.md). Selftend makes no automated decisions about users (Article 22 does not apply).

## Data Protection by Design and Default (Article 25)

Privacy by design: minimal data collection, Row-Level Security, local-first native reminders, and minimal web push subscription records. Privacy by default: reminders off, no analytics, no tracking. Pseudonymization uses UUID identifiers.

## Records of Processing (Article 30)

Processing activities are documented in [policies.md](policies.md). Data subjects are app users aged 13+, or their country's higher floor (see [age-floor.md](age-floor.md)) — a population that includes children, which is why the DPIA and minors' assessment are mandatory rather than optional ([dpia-minors-assessment.md](dpia-minors-assessment.md)). Data categories are email, preferences, web push subscriptions, and thought records. Recipients are Supabase, Google (optional OAuth), Cloudflare, and Sentry. Transfers to third countries (USA) are documented with SCCs as the transfer mechanism. Retention periods are documented above.

## Security (Article 32)

Encryption in transit (HTTPS/TLS) and at rest at multiple layers. User-entered records (including sensitive self-help content that may engage Article 9) are encrypted at rest at the field level using pgcrypto symmetric encryption; the encryption key is held outside the database in Supabase Vault, so a leaked backup exposes only ciphertext. Supabase infrastructure additionally provides disk-level encryption at rest. Database access is constrained by Row-Level Security, scoping each row to the owning user. Mobile credentials are stored in SecureStore. The web bundle ships with a Content-Security-Policy and HSTS. No service-role keys are present in the client bundle. The GDPR data export (`export_user_data()`) decrypts field content server-side for the authenticated owner. The incident response process is documented in [operations-runbook.md](operations-runbook.md). A regular security testing and audit cadence is open work.

## Data Breach Notification (Articles 33-34)

Detection, supervisory-authority notification within 72 hours, and notification of affected users when risk is high are all documented in [operations-runbook.md](operations-runbook.md). The published security contact is security@selftend.org.

## Data Protection Impact Assessment (Article 35)

**A full DPIA exists: [dpia-minors-assessment.md](dpia-minors-assessment.md)**, combined with the Connecticut and Colorado minors' data-protection assessment in one document ([#1768](https://github.com/Selftend/selftend/issues/1768)). It describes the as-built data flow, assesses necessity and proportionality, carries a risk register with its residual ratings, and records the no-minor-flag decision and the universal defaults that make it work. Its conclusion is that residual risk is not high and no Art. 36 prior consultation is required.

It **supersedes the 2026-05-12 screening**, which concluded a full DPIA was not required and was correct for the 18-and-over product it described. Special-category content was always one of the WP248 criteria that decide the question; the teen floor added the second, vulnerable data subjects, and two is the point at which a DPIA is expected. The superseded screening is kept in [operations-runbook.md](operations-runbook.md) as part of the accountability record.

## International Transfers (Chapter V)

Transfers to the USA via Supabase, Google, Cloudflare, and Sentry rely on Standard Contractual Clauses and processor DPAs with appropriate safeguards. The Supabase DPA was executed via PandaDoc on 2026-05-12. The initial transfer impact assessment is in [operations-runbook.md](operations-runbook.md).

## Consent Management (Article 7)

Consent is freely given (reminders optional, service works without them), specific (separated from terms acceptance in the UX), informed (clear language in Settings), and withdrawable (toggle off in Settings). Reminder consent is recorded in `reminder_consent` and `reminder_consent_updated_at`. Web cookie consent is captured via the banner and managed in cookie preferences.

The Article 9(2)(a) consent for user-entered self-help content is a separate affirmative act from the terms acceptance it used to be bundled with: an unticked, separately-worded control at the consent gate, with the withdrawal path (delete the account, or contact privacy@selftend.org) stated beside it. Both controls must be given before the gate opens, and the act is recorded in `user_preferences.health_data_consent_at` and carried in the user's own data export ([#1766](https://github.com/Selftend/selftend/issues/1766)).

## Age Restriction (Article 8)

The age threshold is **13, or the higher minimum age at which a person may consent to the processing of their own personal data in their country** — 14, 15 or 16 across much of the EEA. The table is in [age-floor.md](age-floor.md) and in code at `src/features/auth/age-floor.ts`; it is never below 13.

Each row was read against its national statute on 2026-09-04 and the sources are recorded in [age-floor-statute-checks.md](age-floor-statute-checks.md) ([#1763](https://github.com/Selftend/selftend/issues/1763)). That check found **Denmark** at 15 — its statute has said so since 2024-01-01 — while the table said 13; it was raised rather than silently applied ([#1921](https://github.com/Selftend/selftend/issues/1921)) and the table now follows the statute. ⚠️ **Hungary** could not be verified at all, because the official repository was unreachable, and reaches the legal review as an open question.

The floor is set by Art. 9(2)(a) explicit consent rather than by contract, because the entries the app holds are special-category data: the age that governs is the age at which the person can consent to _that_ processing themselves.

Attestation is **active, not passive**. Before the app opens, the age gate asks for a date of birth and a country ([#1764](https://github.com/Selftend/selftend/issues/1764)). The date of birth is compared once and discarded — never stored, logged, or transmitted — and what persists is the verdict, the declared country, and the timestamp (`user_preferences.age_floor_met` / `age_attested_country` / `age_attested_at`). An attempt that fails the floor retains nothing: the account created for it is deleted immediately ([#1765](https://github.com/Selftend/selftend/issues/1765)).

**No parental-consent flow exists, and none is planned.** Where a national law would require one, the floor rises instead. There is also **no minor flag**: nothing in storage distinguishes a minor from an adult, because the protections are universal — opt-in-only reminders, no ads, no sale, no profiling, no behavioural nudges. That is the "floor of protection" model, and the argument is written down in [dpia-minors-assessment.md](dpia-minors-assessment.md) §5 ([#1768](https://github.com/Selftend/selftend/issues/1768)).

No data is knowingly collected from anyone below the minimum age for their country; an account discovered to be below it is deleted on knowledge (the procedure is § [Delete On Knowledge](operations-runbook.md#delete-on-knowledge-under-floor-accounts) in the operations runbook).

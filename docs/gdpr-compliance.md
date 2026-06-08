# GDPR Compliance Posture

This document records Selftend's compliance posture under the GDPR and equivalent frameworks. Lawful-basis, processor, and retention specifics live in [policies.md](policies.md); operational workflows for incidents, requests, and breach notification live in [operations-runbook.md](operations-runbook.md). Open compliance work is tracked in [.github/ROADMAP.md](../.github/ROADMAP.md).

## Principles (Article 5)

Selftend processes data in line with all seven Article 5 principles. Lawful basis and transparency are documented in the privacy policy; data minimization is enforced by collecting only email, preferences, and user-created content (no date of birth, no device identifiers); accuracy is supported by in-app editing; storage limitation follows the 30-day post-deletion retention window; integrity and confidentiality rely on HTTPS, Row-Level Security, SecureStore, and CSP headers; accountability is supported by this document, [policies.md](policies.md), and the privacy policy.

## Lawful Basis (Article 6 and Article 9)

Lawful bases are documented in the [policies.md "Lawful basis" table](policies.md): contract for core service delivery, consent for native and web push reminders, explicit consent for any user-entered self-help content that may engage Article 9, and legitimate interest for security and auth-event logging. Selftend is not a medical or diagnostic product, but user-entered records may include wellness or mental-health reflections, so they are treated operationally as highly private.

## Transparency (Articles 12–14)

The privacy policy at `/privacy` is accessible without sign-in and states: the controller identity (Selftend, operated by Vasil Yoshev), contact (privacy@selftend.org), processing purposes, lawful bases, processors and recipients, international transfer information, retention periods, data subject rights, the right to withdraw consent, the right to lodge a complaint, and whether data provision is statutory or contractual.

## Data Subject Rights (Articles 15–22)

Right of access and portability are served by JSON data export in Settings. Right to rectification is served by in-app editing. Right to erasure is served by self-service account deletion in Settings (DB RPC + UI). Right to restriction and right to object are handled via email request to privacy@selftend.org. The one-month response deadline and request logging are documented in [operations-runbook.md](operations-runbook.md). Selftend makes no automated decisions about users (Article 22 does not apply).

## Data Protection by Design and Default (Article 25)

Privacy by design: minimal data collection, Row-Level Security, local-first native reminders, and minimal web push subscription records. Privacy by default: reminders off, no analytics, no tracking. Pseudonymization uses UUID identifiers.

## Records of Processing (Article 30)

Processing activities are documented in [policies.md](policies.md). Data subjects are app users aged 18+. Data categories are email, preferences, web push subscriptions, and thought records. Recipients are Supabase, Google (optional OAuth), and Netlify. Transfers to third countries (USA) are documented with SCCs as the transfer mechanism. Retention periods are documented above.

## Security (Article 32)

Encryption in transit (HTTPS/TLS) and at rest at multiple layers. User-entered records (including sensitive self-help content that may engage Article 9) are encrypted at rest at the field level using pgcrypto symmetric encryption; the encryption key is held outside the database in Supabase Vault, so a leaked backup exposes only ciphertext. Supabase infrastructure additionally provides disk-level encryption at rest. Database access is constrained by Row-Level Security, scoping each row to the owning user. Mobile credentials are stored in SecureStore. The web bundle ships with a Content-Security-Policy and HSTS. No service-role keys are present in the client bundle. The GDPR data export (`export_user_data()`) decrypts field content server-side for the authenticated owner. The incident response process is documented in [operations-runbook.md](operations-runbook.md). A regular security testing and audit cadence is open work.

## Data Breach Notification (Articles 33–34)

Detection, supervisory-authority notification within 72 hours, and notification of affected users when risk is high are all documented in [operations-runbook.md](operations-runbook.md). The published security contact is security@selftend.org.

## Data Protection Impact Assessment (Article 35)

DPIA screening was conducted on 2026-05-12 and a full DPIA was determined not to be required for the current MVP scope, based on: no systematic monitoring, no large-scale processing of special categories, no automated decision-making, and the small-scale voluntary nature of the tool. The decision is recorded in [operations-runbook.md](operations-runbook.md).

## International Transfers (Chapter V)

Transfers to the USA via Supabase, Google, and Netlify rely on Standard Contractual Clauses and processor DPAs with appropriate safeguards. The Supabase DPA was executed via PandaDoc on 2026-05-12. The initial transfer impact assessment is in [operations-runbook.md](operations-runbook.md).

## Consent Management (Article 7)

Consent is freely given (reminders optional, service works without them), specific (separated from terms acceptance in the UX), informed (clear language in Settings), and withdrawable (toggle off in Settings). Reminder consent is recorded in `reminder_consent` and `reminder_consent_updated_at`. Web cookie consent is captured via the banner and managed in cookie preferences.

## Age Restriction (Article 8)

Launch age threshold is 18. Age is attested at sign-up. No data is knowingly collected from users under 18, and the terms prohibit use by minors; no parental-consent flow exists in MVP.

# GDPR Compliance Checklist

This checklist tracks GDPR compliance status for Selftend. It covers the key requirements from the General Data Protection Regulation and related frameworks.

## Principles (Article 5)

- [x] **Lawfulness, fairness, transparency** — Lawful basis documented; privacy policy explains processing clearly
- [x] **Purpose limitation** — Data used only for stated purposes (service delivery)
- [x] **Data minimization** — Only email, preferences, and user-created content collected; no DOB, no device IDs
- [x] **Accuracy** — Users can edit their own records
- [x] **Storage limitation** — Retention policy defined (active account = retained; deleted = removed within 30 days)
- [x] **Integrity and confidentiality** — HTTPS, RLS, SecureStore, CSP headers
- [x] **Accountability** — This document + policies doc + privacy policy

## Lawful Basis (Article 6)

- [x] Contract basis for core processing documented
- [x] Consent basis for reminders and user-entered sensitive self-help content documented
- [x] Legitimate interest for security logging documented
- [x] Special-category risk addressed (Article 9) — Selftend is not a medical or diagnostic product, but user-entered self-help records may include wellness or mental-health reflections, so policy consent and operational handling now treat this content as highly private

## Transparency (Articles 12-14)

- [x] Privacy policy accessible without sign-in at `/privacy`
- [x] Identity of controller stated (Selftend, operated by Vasil Yoshev)
- [x] Contact details provided (privacy@selftend.org)
- [x] Purposes of processing stated
- [x] Lawful basis stated
- [x] Recipients/processors listed
- [x] International transfer information provided
- [x] Retention periods stated
- [x] Data subject rights listed
- [x] Right to withdraw consent mentioned
- [x] Right to lodge complaint mentioned
- [x] Whether data provision is statutory/contractual requirement clarified

## Data Subject Rights (Articles 15-22)

- [x] **Right of access (Art. 15)** — Data export in Settings
- [x] **Right to rectification (Art. 16)** — Edit records in-app
- [x] **Right to erasure (Art. 17)** — Self-service account deletion in Settings
- [x] **Right to restriction (Art. 18)** — Available via email request
- [x] **Right to data portability (Art. 20)** — JSON export in Settings
- [x] **Right to object (Art. 21)** — Available via email request
- [x] **Response within one month** — Manual request workflow documented in [operations-runbook.md](operations-runbook.md)
- [x] **No automated decision-making (Art. 22)** — App does not make automated decisions about users

## Data Protection by Design and Default (Article 25)

- [x] Privacy by design: minimal data collection, RLS, local-first native reminders, and minimal web push subscription records
- [x] Privacy by default: reminders off, no analytics, no tracking
- [x] Pseudonymization where possible (UUIDs as identifiers)

## Records of Processing (Article 30)

- [x] Processing activities documented in `docs/policies.md`
- [x] Categories of data subjects: app users (18+)
- [x] Categories of data: email, preferences, web push subscriptions, thought records
- [x] Recipients: Supabase, Google (optional), Netlify
- [x] Transfers to third countries: documented (USA, via SCCs)
- [x] Retention periods: documented

## Security (Article 32)

- [x] Encryption in transit (HTTPS/TLS)
- [x] Encryption at rest (Supabase infrastructure)
- [x] Row-Level Security (database access control)
- [x] Secure credential storage (SecureStore on mobile)
- [x] Content-Security-Policy header
- [x] HSTS header
- [x] No service-role keys in client bundle
- [x] Incident response process documented in [operations-runbook.md](operations-runbook.md)
- [ ] Regular security testing/audit

## Data Breach Notification (Articles 33-34)

- [x] Process for detecting breaches documented in [operations-runbook.md](operations-runbook.md)
- [x] Process for notifying supervisory authority within 72 hours documented in [operations-runbook.md](operations-runbook.md)
- [x] Process for notifying affected users when high risk documented in [operations-runbook.md](operations-runbook.md)
- [x] Security contact published (security@selftend.org)

## Data Protection Impact Assessment (Article 35)

- [x] DPIA screening conducted — full DPIA not required for current MVP scope on 2026-05-12 because:
  - No systematic monitoring
  - No large-scale processing of special categories
  - No automated decision-making
  - Small-scale, voluntary self-help tool
- [x] Decision on DPIA necessity documented in [operations-runbook.md](operations-runbook.md)

## International Transfers (Chapter V)

- [x] Transfers to USA documented
- [x] SCCs referenced as transfer mechanism
- [x] Processor DPAs referenced (Supabase, Netlify)
- [x] Supabase DPA executed via PandaDoc on 2026-05-12
- [x] Initial transfer impact assessment completed in [operations-runbook.md](operations-runbook.md)

## Consent Management (Article 7)

- [x] Consent freely given (reminders optional, service works without)
- [x] Consent specific (separate from terms acceptance in UX)
- [x] Consent informed (clear language in Settings)
- [x] Consent withdrawable (toggle off in Settings)
- [x] Record of consent stored (`reminder_consent` + `reminder_consent_updated_at`)
- [x] Cookie consent on web (banner + preferences)

## Age Restriction And Children (Article 8)

- [x] Age threshold set at 18 for launch
- [x] Age attestation at sign-up
- [x] No data knowingly collected from users under 18
- [x] Terms prohibit use by minors; no parental-consent flow in MVP

## Remaining Blockers Before Launch

1. [x] Replace `[Organization Name]` with confirmed legal entity (Selftend, operated by Vasil Yoshev)
2. [ ] Human/legal review of privacy policy text
3. [ ] Human/legal review of terms of service text
4. [x] Configure privacy@selftend.org email alias
5. [x] Configure security@selftend.org email alias
6. [x] Document data breach notification process
7. [x] Verify Supabase DPA is signed/applicable
8. [x] Test CSP headers don't break Expo web bundle
9. [x] Test self-service deletion end-to-end with real Supabase instance
10. [x] Decide on DPIA necessity and document decision

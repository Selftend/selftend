# Operations Runbook

Last updated: 2026-05-12

This runbook defines the minimum operational process for support, privacy requests, security incidents, and breach handling. It is practical operating guidance, not legal advice.

## Contacts

- Support: `support@selftend.org`
- Privacy, data requests, deletion fallback: `privacy@selftend.org`
- Security reports: `security@selftend.org`
- Public security policy: [.github/SECURITY.md](../.github/SECURITY.md)

## Support Workflow

- Check `support@selftend.org` at least weekly during testing and more often during public launch windows.
- Do not ask users to send detailed mental-health, crisis, therapy, or other sensitive self-help content by email.
- For urgent distress or self-harm messages, reply once with calm crisis guidance and direct the person to local emergency or crisis resources. Do not provide counseling or ongoing crisis support by email.
- For product bugs, ask only for the minimum needed: platform, browser/app version, steps, expected result, actual result, and screenshots only if they do not reveal private content.
- Move reproducible non-private bugs into GitHub issues. Keep private account, health, security, or deletion details out of public issues.
- Keep a private support log outside the repo with date received, sender email, category, status, and date closed.

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
6. If Selftend receives a processor breach notice from Supabase, Netlify, Google, Expo, or another provider, assess whether Selftend must notify authorities or users.
7. After closure, add prevention tasks to the roadmap or GitHub issues without exposing private incident details.

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
- Netlify, Supabase, Google OAuth, Expo/EAS, and browser push services are disclosed in the privacy policy where relevant.
- No advertising networks, analytics trackers, or data brokers are used.
- User data is minimized to account email, preferences, optional reminder data, and user-created records.
- Users can request transfer-safeguard information through `privacy@selftend.org`.

Open follow-up:

- Confirm and record Netlify DPA status before broad public launch.
- Keep processor locations, transfer mechanisms, and privacy policy disclosures current.
- Reassess transfers if a new processor, analytics provider, AI provider, or hosted support tool is added.

## Public Launch Gate

Before broad public launch:

- Final human/legal review of privacy policy, terms, crisis guidance, and the adults-only 18+ launch posture.
- Confirm support, privacy, security, and deletion aliases are monitored.
- Keep this runbook, [gdpr-compliance.md](gdpr-compliance.md), and [.github/ROADMAP.md](../.github/ROADMAP.md) in sync.

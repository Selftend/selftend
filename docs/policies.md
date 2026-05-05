# Public Policy Surfaces

Last updated: 2026-05-04

The app has public policy routes hosted from the Expo web export:

- `/privacy` — Privacy policy (GDPR + CCPA compliant)
- `/terms` — Terms of service
- `/cookies` — Cookie policy
- `/crisis` — Crisis guidance
- `/account-deletion` — Account deletion info

The source text for these routes lives in [src/features/policies/policy-content.ts](../src/features/policies/policy-content.ts).

## Launch status

Implementation status:

- [x] Privacy policy route exists without sign-in (production text drafted)
- [x] Terms of service route exists without sign-in (production text drafted)
- [x] Cookie policy route exists without sign-in
- [x] Crisis guidance route exists without sign-in
- [x] Account deletion route exists without sign-in
- [x] In-app sign-in, support, settings, and legal screens link to relevant public pages
- [x] Consent checkbox on sign-in screen (age 13+ attestation + policy acceptance)
- [x] Consent modal for policy version updates (shown to existing users on version change)
- [x] Self-service account deletion in Settings
- [x] Data export in Settings (JSON download)
- [x] Cookie consent banner on web
- [x] Cookie preferences management
- [x] Content-Security-Policy and security headers
- [x] HSTS header
- [x] Unused Android camera and microphone permissions disabled before Google Play testing
- [x] Final legal entity name added (Selftend, operated by Vasil Yoshev)
- [x] Public support email alias configured on `selftend.org`
- [x] Public privacy/deletion email alias configured on `selftend.org`
- [x] Crisis-resource intent captured as broad/global
- [ ] Global crisis-resource strategy reviewed
- [ ] Human/legal review of all policy text completed
- [x] Self-service account deletion implemented (DB RPC + UI)

## Compliance approach

### Jurisdictions targeted

- **EU/EEA**: GDPR compliance (Articles 6, 12-23, 25, 30, 32-34)
- **United States**: CCPA/CPRA (California), VCDPA (Virginia), CPA (Colorado), CTDPA (Connecticut)
- **UK**: UK GDPR (substantially identical to EU GDPR)

### Age floor

- **Minimum age: 13**
- Users attest age via checkbox at sign-in
- No collection of date of birth (data minimization)
- Under-13 use is explicitly prohibited in terms and privacy policy
- No COPPA compliance required (no knowing collection from under-13)

### Lawful basis for processing (GDPR Article 6)

| Data                         | Lawful basis                       | Notes                                  |
| ---------------------------- | ---------------------------------- | -------------------------------------- |
| Email, auth metadata         | Contract (Art. 6(1)(b))            | Necessary to provide the service       |
| Thought records, preferences | Contract (Art. 6(1)(b))            | Core app functionality                 |
| Local notification reminders | Consent (Art. 6(1)(a))             | Explicit opt-in, revocable in Settings |
| Auth event logs (Supabase)   | Legitimate interest (Art. 6(1)(f)) | Security and abuse prevention          |

### Data processors

| Processor           | Role                      | DPA                                                   |
| ------------------- | ------------------------- | ----------------------------------------------------- |
| Supabase Inc. (USA) | Database, auth, backend   | [Supabase DPA](https://supabase.com/legal/dpa)        |
| Google LLC (USA)    | OAuth provider (optional) | [Google Privacy](https://policies.google.com/privacy) |
| Netlify Inc. (USA)  | Static web hosting        | [Netlify DPA](https://www.netlify.com/legal/dpa/)     |
| Expo Inc. (USA)     | Build tooling only        | No runtime data processing                            |

### Data retention

- Active accounts: data retained for duration of account
- Deleted accounts: all data permanently removed within 30 days
- No data backups retained beyond 30-day window
- Session tokens: expire per Supabase defaults, cleared on sign-out

### International transfers

EU/EEA data may be processed in the US by Supabase, Google, and Netlify. Transfers rely on:

- Standard Contractual Clauses (SCCs)
- Processor DPAs with appropriate safeguards

### User rights implementation

| Right            | Implementation                            |
| ---------------- | ----------------------------------------- |
| Access           | Data export in Settings (JSON)            |
| Rectification    | Edit thought records in-app               |
| Erasure          | Self-service account deletion in Settings |
| Portability      | Data export in Settings (structured JSON) |
| Restriction      | Contact privacy@selftend.org              |
| Object           | Contact privacy@selftend.org              |
| Withdraw consent | Disable reminders in Settings             |
| Complaint        | Contact local supervisory authority       |

### Cookie/storage policy

- **Essential storage**: Browser localStorage for auth session token (cannot be disabled)
- **Optional**: Analytics category (consent required, not currently used)
- **Consent mechanism**: Cookie banner on web with Accept All / Essential Only / Manage Preferences
- **No tracking cookies** used anywhere in the app

## Current policy boundaries

The policy text maintains these boundaries:

- Wellness and guided self-help, not therapy or diagnosis
- Not emergency support
- No claims to treat, cure, prevent, or monitor a condition
- Account-required with data minimization
- Reminders optional, explicit, and off by default
- Android app permissions minimized for the current feature set; no camera-capture or microphone/audio recording permission
- No ads, subscriptions, manipulative retention, social feeds, or user-facing AI coach
- Age 13+ required

## Google Play URLs

Use the final domain for store forms:

```text
https://selftend.org/privacy
https://selftend.org/terms
https://selftend.org/account-deletion
```

Google Play requires Data safety information for all tracks. Self-service account deletion is now implemented in-app and documented at `/account-deletion`.

## Crisis guidance

The app shows calm, separate crisis guidance but never implies the app provides crisis response.

Current public resources listed:

- United States and territories: <https://988lifeline.org/get-help/>
- Canada: <https://988.ca/get-help/help-right-now>

Before public launch outside those jurisdictions, either add reviewed local resources or keep guidance generic.

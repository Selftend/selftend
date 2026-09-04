# Public Policy Surfaces

The app has public policy routes hosted from the Expo web export:

- `/privacy` - Privacy policy (GDPR + CCPA compliant)
- `/terms` - Terms of service
- `/cookies` - Cookie policy
- `/crisis` - Crisis guidance
- `/account-deletion` - Account deletion info

The policy version constants live in [src/features/policies/policy-content.ts](../src/features/policies/policy-content.ts). Policy copy is loaded from the locale files in `src/i18n/locales/{lang}/policies.json` — those files are the single source of the published text.

## Legal review status

Final owner legal review completed 2026-07-23 ([issue #198](https://github.com/Selftend/selftend/issues/198));
the launch-review notice is cleared (`LEGAL_REVIEW_PENDING = false` in
`src/features/policies/policy-content.ts`). The flag stays available: set it
back to `true` to re-show the notice on `/privacy`, `/terms`, and the in-app
Legal screen if a future revision goes back under review.

Deferred items from the review (open questions, not launch blockers):

- No governing-law/jurisdiction clause in the terms; add one if counsel
  recommends it.
- Age attestation stays passive (see "Age floor" below); revisit if a
  jurisdiction or store policy requires an explicit checkbox.
  **Closed on the consent half 2026-09-04** ([#1766](https://github.com/Selftend/selftend/issues/1766)):
  the Art. 9(2)(a) consent is now its own unticked, separately-worded control at
  the consent gate, not a clause inside the terms checkbox. The age half is
  closed by the age gate ([#1764](https://github.com/Selftend/selftend/issues/1764)),
  and the published text caught up in
  [#1767](https://github.com/Selftend/selftend/issues/1767) — so attestation is
  no longer passive at all: the app asks, and the answer decides. See
  [age-floor.md](age-floor.md).

## Compliance approach

### Jurisdictions targeted

- **EU/EEA**: GDPR compliance (Articles 6, 12-23, 25, 30, 32-34)
- **United States**: CCPA/CPRA (California), VCDPA (Virginia), CPA (Colorado), CTDPA (Connecticut)
- **UK**: UK GDPR (substantially identical to EU GDPR)

### Age floor

- **Minimum age: 13, or a country's higher floor** — the full table lives in
  [age-floor.md](age-floor.md) and in code at `src/features/auth/age-floor.ts`.
  Never below 13, anywhere.
- The floor is set by **Art. 9(2)(a) explicit consent, not by contract**: thought
  records are special-category data, so the age that governs is the age at which
  a person may consent to that processing themselves, which member states set
  individually between 13 and 16.
- Attestation is **active**, and this replaced the passive posture of decision
  #198 (2026-07-23): the age gate asks for a date of birth and a country before
  the app opens ([#1764](https://github.com/Selftend/selftend/issues/1764)).
- **Date of birth is never stored.** It is compared once and discarded; what
  persists is the verdict, the declared country, and the date asked
  (`user_preferences.age_floor_met` / `age_attested_country` / `age_attested_at`).
- Under-floor attempts retain nothing — the account created for the attempt is
  deleted immediately ([#1765](https://github.com/Selftend/selftend/issues/1765)) —
  and an account discovered to be under its floor is deleted on knowledge.
- ⚠️ **One row is known wrong and is not yet fixed.** Denmark's age of digital
  consent has been **15** since 2024-01-01; the table still says 13. It is
  raised for the owner and counsel at
  [#1921](https://github.com/Selftend/selftend/issues/1921) rather than changed
  silently, and it is cheaper to settle before the release than after. Every
  floor's source is in
  [age-floor-statute-checks.md](age-floor-statute-checks.md) ([#1763](https://github.com/Selftend/selftend/issues/1763)).
- **No minor flag and no parental-consent path.** Protections are universal
  rather than conditional; where a law would require a parental-consent route,
  the floor rises instead. The decision and the compliance argument behind it
  are in [dpia-minors-assessment.md](dpia-minors-assessment.md) §5, which is
  also the combined DPIA and Connecticut/Colorado minors' assessment for this
  processing.
- Published in privacy §11 and terms §2, `en` and `bg`
  ([#1767](https://github.com/Selftend/selftend/issues/1767)).
  `src/features/policies/policy-age-floor.test.ts` compares the published list
  against the code table country by country, so the two cannot drift.
- ⚠️ **Google Play still declares "18 and over"** (last edited 2026-05-08). That
  declaration moves to 13-15 / 16-17 in the owner's rollout pass
  ([#1771](https://github.com/Selftend/selftend/issues/1771)), same day as the
  release that publishes this text — see `docs/releasing.md` and §7 of the spec.

### Lawful basis for processing (GDPR Articles 6 and 9)

| Data                                              | Lawful basis                             | Notes                                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email, auth metadata                              | Contract (Art. 6(1)(b))                  | Necessary to provide the service                                                                                                                                                                               |
| Thought records, preferences                      | Contract (Art. 6(1)(b))                  | Core app functionality                                                                                                                                                                                         |
| Sensitive self-help content users choose to enter | Explicit consent where Article 9 applies | Own unticked control at the consent gate, worded apart from terms acceptance; recorded in `health_data_consent_at` (#1766). Withdrawn by deleting the account or contacting privacy, stated beside the control |
| Native local reminders                            | Consent (Art. 6(1)(a))                   | Explicit opt-in, revocable in Settings                                                                                                                                                                         |
| Web push reminder subscriptions                   | Consent (Art. 6(1)(a))                   | Explicit opt-in, browser permission, revocable in Settings                                                                                                                                                     |
| Auth event logs (Supabase)                        | Legitimate interest (Art. 6(1)(f))       | Security and abuse prevention                                                                                                                                                                                  |

### Data processors

| Processor                                  | Role                      | DPA                                                                   |
| ------------------------------------------ | ------------------------- | --------------------------------------------------------------------- |
| Supabase Inc. (USA)                        | Database, auth, backend   | [Supabase DPA](https://supabase.com/legal/dpa)                        |
| Google LLC (USA)                           | OAuth provider (optional) | [Google Privacy](https://policies.google.com/privacy)                 |
| Cloudflare, Inc. (USA)                     | Static web hosting        | [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) |
| Expo Inc. (USA)                            | Build tooling only        | No runtime data processing                                            |
| Functional Software, Inc. dba Sentry (USA) | Crash and error reporting | [Sentry DPA](https://sentry.io/legal/dpa/)                            |
| Browser push services                      | Web push delivery         | Depends on the user's browser vendor                                  |

### Data retention

- Active accounts: data retained for duration of account
- Deleted accounts: removed from live systems immediately; backups created
  before deletion are automatically deleted within 90 days (matches the
  published privacy policy)
- Session tokens: expire per Supabase defaults, cleared on sign-out

### International transfers

EU/EEA data may be processed in the US by Supabase, Google, Cloudflare, and Sentry. Transfers rely on:

- Standard Contractual Clauses (SCCs)
- Processor DPAs with appropriate safeguards

The initial transfer impact assessment and processor follow-ups are tracked in [operations-runbook.md](operations-runbook.md).

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

Manual request deadlines and logging are documented in [operations-runbook.md](operations-runbook.md).

### Cookie/storage policy

- **Essential storage**: Browser localStorage for auth session token (cannot be disabled)
- **Optional**: Analytics category (consent required, not currently used)
- **Consent mechanism**: Cookie banner on web with Accept All / Essential Only / Manage Preferences
- **No tracking cookies** used anywhere in the app

## Current policy boundaries

The policy text maintains these boundaries:

- Wellness and self-help, not therapy or diagnosis
- Not emergency support
- No claims to treat, cure, prevent, or monitor a condition
- Account-required with data minimization
- Reminders optional, explicit, and off by default
- Web push subscriptions are stored only after opt-in and browser permission
- User-entered self-help records are treated as highly private because they may include wellness or mental-health reflections; they are encrypted at rest at the field level (see [gdpr-compliance.md](gdpr-compliance.md))
- Android app permissions minimized for the current feature set; no camera-capture or microphone/audio recording permission
- No ads, subscriptions, manipulative retention, social feeds, or user-facing AI coach
- Minimum age 13, or a country's higher floor (see [age-floor.md](age-floor.md))

## Google Play URLs

Use the final domain for store forms:

```text
https://selftend.org/privacy
https://selftend.org/terms
https://selftend.org/account-deletion
```

Google Play requires Data safety information for all tracks. Self-service account deletion is now implemented in-app and documented at `/account-deletion`.

## Crisis guidance

The app shows calm, separate crisis guidance but never implies the app provides crisis response. Approved posture for the MVP launch (jurisdiction review on 2026-05-13):

- The `/crisis` page does not list per-country crisis hotlines. Listing a wrong or rotated number is more dangerous than directing the reader to a reviewed registry.
- For all locales, the single action button on `/crisis` points at [Find A Helpline](https://findahelpline.com/) (ThroughLine), which maintains a country-reviewed directory of crisis and emotional-support services.
- The Bulgarian locale additionally calls out 112 (Bulgaria and EU emergency number) inline in the "Immediate danger" section so Bulgarian-speaking users see a number that will connect.
- The English locale keeps the prose generic ("contact local emergency services") and relies on Find A Helpline for country-specific guidance.

Re-verify the Find A Helpline URL and the locale prose on each minor release. Adding any named hotline beyond the current set requires verification of the number and a documented re-check cadence.

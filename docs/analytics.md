# Analytics Strategy

## Current state

The MVP does not include any analytics SDK, tracking service, or telemetry. This is intentional:

- Product principle #7: "Avoid surveillance-style analytics."
- Privacy policy: "We do not use advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels."
- Deployment docs, stack docs, and self-hosting docs all list analytics SDKs as not required for MVP.

The consent infrastructure is already built and waiting:

- `src/stores/cookie-consent-store.ts` has an `analytics` toggle (default `false`).
- `src/components/app/cookie-consent-banner.tsx` offers "Accept all" / "Essential only" / "Manage preferences."
- Cookie consent is currently stored only in browser `localStorage` (key `selftend_cookie_consent`) on web; the store does not persist consent server-side. The Supabase `user_preferences.cookie_consent` column exists (and is included in `export_user_data()`) but is **not** populated by the current consent flow - it is always written as `null` (see `cookieConsent: null` default in `src/features/modules/types.ts`). Treat the column as reserved for future server-side consent recording.

Contributors must not add ad-hoc tracking without explicit review through the roadmap and PR template.

## Phased plan

### Phase 1: Supabase aggregate queries (no new dependency)

#### Phase 1 in use (2026-07)

Three aggregate-only reports run through the shared runner `scripts/analytics-report.js`.
Pass `--local` to run against the local Docker stack; for the linked production
project, set `SUPABASE_DB_URL` (from the dashboard) in the environment first.

`test/integration/analytics-reports.integration.test.ts` executes all three
against the local schema on every CI run, so a renamed column fails there rather
than three months later when someone runs a report by hand.

##### Everything is split by account type

Every table in every report carries an `account` column: `registered` or
`guest`. Guest accounts are `auth.users` rows with `is_anonymous = true`, minted
one per tap of the landing CTA by `useStartAsGuest`, and only purged after 12
months of dormancy. Without the split, the day anonymous sign-ins are switched
on, "signups" quietly becomes "visitors who tapped a button" and every
percentage in these reports collapses toward zero with nothing on screen to say
why. The split landed while the toggle was still off, on purpose; the
production toggle went live 2026-09-02 (#1674).

Two things to know when reading it:

- **Fixed-shape tables print both populations always**, zeros included — the two
  account types, the four modules, the ten concern arms. Open-shape tables
  (weeks, widget ids, feature names) print only what exists. Section 0 of each
  report carries the axis unconditionally.
- **The split reads current account state, not state at signup.** Signing up
  from a guest session converts the same `auth.users` row in place, so a
  converted guest reads as `registered` across their whole history. The `guest`
  rows are unconverted guests only, and conversion itself is invisible here.

`npm run analytics:engagement` runs `scripts/analytics-engagement.sql` (added
2026-07-14). It covers: activation (first row in any user-content table, ever
and within 72h of signup; setup actions excluded), retention (signup-anchored
weekly cohorts, W1-W4, retained = any content row in the window, percentages
over mature users only), module usage (per module — cbt, meditation,
gratitude, act — % with >=1 record in the module's tables), and core tool usage
(mood, journal, sleep, habits, mindfulness, per feature). All queries count
distinct users; none emit per-user rows.

The module table carried an "enabled" and an "enabled-but-never-used" column
until 2026-09-02, read from `user_preferences.enabled_modules`. That array
gates nothing: every module's tools are on the tools grid whether or not it
lists them, the last write hook went in the May 2026 dead-code sweep, and what
is left is the column default (`['cbt']`) plus one write from the meditation
wizard. Read against production it said cbt was "enabled" by 45 of 46 people
(the default) while gratitude was used by people who had never "enabled" it —
an instrument measuring a mechanism that does not exist (#1672). Usage is the
only adoption signal the schema carries, so it is the only one reported;
`test/analytics-shared-sql.test.ts` fails any report that reads the column.

`npm run analytics:onboarding` runs `scripts/analytics-onboarding.sql`.
The report covers: signups, first-run introduction conversion, finish-vs-skip
(`user_preferences.app_onboarding_completed_via` / `_at`, written when the
one-panel introduction is finished or skipped), the Home widget selection older
native builds still write, and home-tour engagement. The two funnel columns are
ordinary first-party preferences, included in `export_user_data()` and account
deletion. The concern-distribution sections (§4a/4b) were removed with the
`selected_concerns` column on 2026-09-05 (#1958): the introduction no longer asks
a concern, so nothing writes the column and it is gone; anything cohorted by
concern reads the immutable `initial_concerns` in the segment report below, which
covers the pre-redesign cohort only and is never written again by the app.

`npm run analytics:segment` runs `scripts/analytics-segment.sql` (added
2026-09-01). It cross-tabs W4 retention against the concern each person declared
when they arrived, read from the immutable `user_preferences.initial_concerns`
column — never from the since-dropped `selected_concerns`, which was
last-write-wins and therefore flattered retained users by construction. It
collects nothing new: every column it reads already exists. Since 2026-09-05
(#1958) the app writes `initial_concerns` for nobody — the one-panel
introduction asks no concern — so every concern arm covers the pre-redesign
cohort only, and users onboarded since land in `unknown`.

How to read it, in the order the report prints:

- **Read orderings, never percentages, until the gate opens.** Section 2 is
  ordered by retention rate for exactly that reason.
- **The gate is 30 W4-retained users**, reusing the warrant-to-continue number
  rather than inventing a second constant. Section 1 prints how far off it is.
  That puts the segment question on the **2027-08-31** clock, not the
  **2027-02-28** frame-review clock: the February read is informational only,
  and the segment slot in [positioning.md](positioning.md) cannot be filled
  there.
- **The arms overlap; they are not a partition.** Concerns are multi-select, so
  someone with three picks appears in three rows and the rows sum past 100%.
  Section 3 prints that overlap so it stays visible. Alongside the six concern
  keys there are `skipped` and `finished-with-none` (distinguishable only via
  `app_onboarding_completed_via` — the empty array cannot tell them apart),
  `zero-concerns-no-mode`, and `unknown` for rows predating the column. There is
  no backfill, deliberately.
- **Cells below k=5 print `<5`, and a percentage resting on one prints `-`.**
  This is a false-precision control first: a printed "67%" that means two users
  out of three is the number that gets believed.
- **A flat reading is a finding, not a failure.** If every arm retains alike,
  the concern axis is not the segment axis, and the next axes to look at are
  module usage, platform, and locale (EN/BG). That is decided in advance so
  the standing interpretation cannot quietly become "not enough data yet",
  permanently.

Cadence: **quarterly by hand**, mandatory at both dates above, no third clock.
Only the owner can run it (`SUPABASE_DB_URL` from the dashboard); there is no CI
job and no schedule. The report is the instrument, not the judgement — the
segment decision stays something a person makes while looking at it.

When basic product questions arise ("how many users signed up this week?", "how many exercises were completed?"), use server-side SQL against existing tables:

- Auth tables already have timestamped sign-up records.
- CBT thought records and future exercise tables have timestamps.
- Supabase dashboard or a contributor-only SQL script can query these.

This requires no new data collection, no consent change, and no SDK.

Example queries to create when needed:

```sql
-- Weekly sign-ups
SELECT date_trunc('week', created_at) AS week, count(*)
FROM auth.users GROUP BY 1 ORDER BY 1 DESC LIMIT 12;

-- Weekly completed exercises
SELECT date_trunc('week', created_at) AS week, count(*)
FROM public.thought_records GROUP BY 1 ORDER BY 1 DESC LIMIT 12;
```

Keep these in a contributor-only context (Supabase dashboard, a local script, or a protected admin route). Do not ship aggregate query infrastructure in the user-facing app bundle.

### Phase 2: Error and crash monitoring

> **Status (2026-07-04): implemented with Sentry SaaS (sentry.io).** The
> closed-testing launch was the trigger. SaaS was chosen over the
> self-hosted options below for operational simplicity at this stage; the
> SDK is Sentry-protocol-compatible, so self-hosted GlitchTip remains the
> documented fallback if hosting posture changes. Classification: essential
> (Art. 6(1)(f)), per "Consent classification" below. Monitoring is fully
> disabled when `EXPO_PUBLIC_SENTRY_DSN` is unset.

Adds minimal observability alongside the incident response process documented in [operations-runbook.md](operations-runbook.md).

#### Tool options (self-hostable required)

| Tool      | License                | Self-hosted | Expo/RN support       | Notes                      |
| --------- | ---------------------- | ----------- | --------------------- | -------------------------- |
| Sentry    | BSL (source-available) | Yes         | Yes (official SDK)    | Industry standard, heavy   |
| GlitchTip | MIT                    | Yes         | Sentry-compatible SDK | Lighter, fully open-source |

#### Consent classification

Error monitoring captures stack traces and device metadata, not user behavior. Recommended classification: **essential** (GDPR Article 6(1)(f) legitimate interest).

If the team prefers maximum caution, gate it behind the existing `analytics` consent toggle instead.

#### Implementation notes

When this phase begins: choose Sentry self-hosted or GlitchTip; add the SDK dependency (`@sentry/react-native` or compatible); initialize in `src/providers/app-providers.tsx` gated on the chosen consent classification; update privacy text in `src/features/policies/policy-content.ts`; add the vendor to the `docs/policies.md` data processor list; add self-hosted setup instructions to `docs/self-hosting.md`; update `docs/costs.md` with the hosting cost estimate; and note the approved exception in `docs/android-closed-testing.md`.

### Phase 3: Opt-in product analytics (only if Phase 1 is insufficient)

Only proceed if Supabase aggregate queries cannot answer a concrete product question that requires client-side event data.

> **Status (2026-07-14): considered and deferred.** Reviewed ahead of closed
> testing; no concrete product question required client-side events. The
> candidate questions (silent churn location, in-wizard abandonment, feature
> discovery) are better answered during closed testing by talking to testers
> directly — opt-in event data from a cohort of tens of users would be too
> sparse to beat that. Phase 1 was extended with the engagement report instead.

#### Tool options (self-hostable, privacy-respecting)

| Tool      | License    | Self-hosted | Cookieless | Platform     | Notes                                                           |
| --------- | ---------- | ----------- | ---------- | ------------ | --------------------------------------------------------------- |
| Plausible | AGPL       | Yes         | Yes (web)  | Web only     | Very lightweight (~20 MB RAM), no consent banner needed for web |
| Umami     | MIT        | Yes         | Yes (web)  | Web only     | Similar to Plausible, MIT license                               |
| PostHog   | MIT (core) | Yes         | No         | Web + native | Feature flags, funnels, heavier (needs ClickHouse)              |

Recommendations:

- **Web-only initially**: Plausible or Umami for cookieless page-view analytics. No consent required for cookieless web analytics under GDPR.
- **Native event tracking later**: PostHog self-hosted if native app events are needed, or a lightweight custom Supabase event table.

#### Event allowlist pattern

All tracked events must be defined in an allowlist. No open-ended `track(anything)` calls.

Events should be:

- Aggregate-friendly (counts, not individual user timelines)
- Not personally identifiable
- Approved in the allowlist before implementation

Example allowlist:

```typescript
type AllowedEvent =
  "exercise_completed" | "tool_opened" | "check_in_submitted" | "onboarding_completed";
```

#### Implementation notes

When this phase begins: document the concrete product question that requires client-side analytics; choose the tool based on web-only vs. native needs; create `src/providers/analytics-provider.tsx` that reads consent state from `useCookieConsentStore`, initializes or tears down the SDK based on consent changes, exposes `trackEvent(name: AllowedEvent, properties?: Record<string, string>)`, and no-ops silently when consent is not granted; gate initialization behind `analytics === true` from the consent store; define the event allowlist in this file or a dedicated constants file; update the privacy policy, cookie policy, and processor list; add self-hosted setup instructions to `docs/self-hosting.md`; and update `docs/costs.md` with the hosting cost estimate.

## Excluded approaches

These are deliberately excluded and should not be proposed without exceptional justification:

- **Google Analytics, Mixpanel, Amplitude, Segment**: proprietary, not self-hostable, heavy behavioral profiling
- **Session replay or heatmaps**: surveillance-style, conflicts with product principles
- **Default-on tracking**: always opt-in or legitimately essential
- **User-level behavioral profiling**: especially given sensitive mental-health content and possible future under-18 support
- **Ad-network pixels or attribution SDKs**: no ads, no ad-funded model

## Trigger for advancing phases

Do not add analytics preemptively. Advance to the next phase only when:

- **Phase 2**: Done (2026-07-04) - implemented ahead of closed testing; see status note above.
- **Phase 3**: A concrete, documented product question cannot be answered by Supabase aggregate queries alone.

## Related files

- `src/stores/cookie-consent-store.ts` - consent state with `analytics` toggle
- `src/components/app/cookie-consent-banner.tsx` - consent UI
- `src/providers/app-providers.tsx` - provider tree for future analytics provider
- `src/features/policies/policy-content.ts` - privacy and cookie policy text
- `docs/policies.md` - data processor list
- `docs/self-hosting.md` - self-hosting setup
- `docs/costs.md` - cost estimates
- `docs/product-principles.md` - principle #7 (privacy and dignity)

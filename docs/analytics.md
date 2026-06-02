# Analytics Strategy

## Current state

The MVP does not include any analytics SDK, tracking service, or telemetry. This is intentional:

- Product principle #7: "Avoid surveillance-style analytics."
- Privacy policy: "We do not use advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels."
- Deployment docs, stack docs, and self-hosting docs all list analytics SDKs as not required for MVP.

The consent infrastructure is already built and waiting:

- `src/stores/cookie-consent-store.ts` has an `analytics` toggle (default `false`).
- `src/components/app/cookie-consent-banner.tsx` offers "Accept all" / "Essential only" / "Manage preferences."
- Cookie consent is currently stored only in browser `localStorage` (key `selftend_cookie_consent`) on web; the store does not persist consent server-side. The Supabase `user_preferences.cookie_consent` column exists (and is included in `export_user_data()`) but is **not** populated by the current consent flow — it is always written as `null` (see `cookieConsent: null` default in `src/features/modules/types.ts`). Treat the column as reserved for future server-side consent recording.

Contributors must not add ad-hoc tracking without explicit review through the roadmap and PR template.

## Phased plan

### Phase 1: Supabase aggregate queries (no new dependency)

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
  | "exercise_completed"
  | "tool_opened"
  | "check_in_submitted"
  | "onboarding_completed";
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

- **Phase 2**: The app has real users and an undiagnosable production issue occurs, or an observability initiative is actively being scoped in `.github/ROADMAP.md`.
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

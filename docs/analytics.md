# Analytics Strategy

Last reviewed: 2026-05-04

## Current state

The MVP does not include any analytics SDK, tracking service, or telemetry. This is intentional:

- Product principle #7: "Avoid surveillance-style analytics."
- Privacy policy: "We do not use advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels."
- Deployment docs, stack docs, and self-hosting docs all list analytics SDKs as not required for MVP.

The consent infrastructure is already built and waiting:

- `src/stores/cookie-consent-store.ts` has an `analytics` toggle (default `false`).
- `src/components/cookie-consent-banner.tsx` offers "Accept all" / "Essential only" / "Manage preferences."
- The Supabase `cookie_consent` column stores `{essential, analytics, acceptedAt}` per user.

Contributors must not add ad-hoc tracking without explicit review (see AGENTS.md and the PR template checklist).

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

Aligns with the ROADMAP Phase 2 item: "minimal observability and incident response process."

#### Tool options (self-hostable required)

| Tool      | License                | Self-hosted | Expo/RN support       | Notes                      |
| --------- | ---------------------- | ----------- | --------------------- | -------------------------- |
| Sentry    | BSL (source-available) | Yes         | Yes (official SDK)    | Industry standard, heavy   |
| GlitchTip | MIT                    | Yes         | Sentry-compatible SDK | Lighter, fully open-source |

#### Consent classification

Error monitoring captures stack traces and device metadata, not user behavior. Recommended classification: **essential** (GDPR Article 6(1)(f) legitimate interest).

If the team prefers maximum caution, gate it behind the existing `analytics` consent toggle instead.

#### Implementation checklist

When this phase begins:

- [ ] Choose Sentry self-hosted or GlitchTip
- [ ] Add the SDK dependency (`@sentry/react-native` or compatible)
- [ ] Initialize in `src/providers/app-providers.tsx`, gated on the chosen consent classification
- [ ] Update `src/features/policies/policy-content.ts` privacy policy text
- [ ] Add the vendor to `docs/policies.md` data processor list
- [ ] Add self-hosted setup instructions to `docs/self-hosting.md`
- [ ] Update `docs/costs.md` with hosting cost estimate
- [ ] Update `docs/android-closed-testing.md` checklist to note the approved exception

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

#### Implementation checklist

When this phase begins:

- [ ] Document the concrete product question that requires client-side analytics
- [ ] Choose the tool based on web-only vs. native needs
- [ ] Create `src/providers/analytics-provider.tsx` that:
  - Reads consent state from `useCookieConsentStore`
  - Initializes or tears down the SDK based on consent changes
  - Exposes `trackEvent(name: AllowedEvent, properties?: Record<string, string>)`
  - No-ops silently when consent is not granted
- [ ] Gate initialization behind `analytics === true` from the consent store
- [ ] Define the event allowlist in this file or a dedicated constants file
- [ ] Update privacy policy, cookie policy, and data processor list
- [ ] Add self-hosted setup instructions to `docs/self-hosting.md`
- [ ] Update `docs/costs.md` with hosting cost estimate

## Excluded approaches

These are deliberately excluded and should not be proposed without exceptional justification:

- **Google Analytics, Mixpanel, Amplitude, Segment**: proprietary, not self-hostable, heavy behavioral profiling
- **Session replay or heatmaps**: surveillance-style, conflicts with product principles
- **Default-on tracking**: always opt-in or legitimately essential
- **User-level behavioral profiling**: especially given all-ages target (COPPA/child-safety risk)
- **Ad-network pixels or attribution SDKs**: no ads, no ad-funded model

## Trigger for advancing phases

Do not add analytics preemptively. Advance to the next phase only when:

- **Phase 2**: The app has real users and an undiagnosable production issue occurs, or the ROADMAP Phase 2 observability item is actively being worked.
- **Phase 3**: A concrete, documented product question cannot be answered by Supabase aggregate queries alone.

## Related files

- `src/stores/cookie-consent-store.ts` — consent state with `analytics` toggle
- `src/components/cookie-consent-banner.tsx` — consent UI
- `src/providers/app-providers.tsx` — provider tree for future analytics provider
- `src/features/policies/policy-content.ts` — privacy and cookie policy text
- `docs/policies.md` — data processor list
- `docs/self-hosting.md` — self-hosting setup
- `docs/costs.md` — cost estimates
- `docs/product-principles.md` — principle #7 (privacy and dignity)

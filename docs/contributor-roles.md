# Contributor Roles

Last updated: 2026-05-07

Selftend needs more than code. This page is a practical starting point for the kinds of contributors the project actively wants. If you don't see your skill below, [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) covers the general flow and you can also open an issue describing how you'd like to help.

For the broader community-operations view (channels, recognition, moderation), see [docs/community.md](community.md). This page is about getting one person started.

## Developer

What you can contribute:

- Bug fixes and feature work in `src/features/` (CBT, settings, profile, policies, tools)
- Shared component improvements in `src/components/` and `components/`
- Tests, accessibility fixes, performance work
- Supabase schema and RLS work in `supabase/`, edge functions in `functions/`
- Tooling, scripts, CI

Start here:

1. [README.md](../README.md) — install, env, run on web or Android.
2. [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) — code structure table, branch/PR flow, dev loop.
3. [AGENTS.md](../AGENTS.md) — technical defaults and "things to push back on." Same guardrails apply to humans.
4. [docs/stack.md](stack.md) — approved stack and dependency policy.
5. [docs/data-privacy-model.md](data-privacy-model.md) — what data classes exist and the rules around them.
6. [docs/modules/tools.md](modules/tools.md) — module contract for any new feature module.

Pick from issues labeled [`good first issue`](https://github.com/Selftend/selftend/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22), `bug`, `feature`, or `accessibility`. Comment before claiming larger work.

What to mind:

- The product is wellness and self-help, not diagnosis or therapy. Avoid copy or features that imply clinical outcomes.
- Streaks, reminders, and gamification stay optional and non-punitive (see [product-principles.md](product-principles.md)).
- Privacy and dignity are non-negotiable — minimize data collection, justify new fields, no analytics SDKs without review.
- New dependencies need a real reason. Expo defaults first, then NativeWind / React Native Reusables, then narrow libraries.

## Designer

What you can contribute:

- Visual design exploration: layouts, component states, illustrations, brand work
- UX flow review: onboarding, CBT thought-record flow, settings, account deletion
- Accessibility review: contrast, touch targets, focus order on web, screen-reader behavior, reduced-motion respect
- Copy review for tone (calm, non-clinical, non-infantilizing)
- Empty states, loading states, error states — there's a shared pattern in `src/components/screen-state.tsx`

Start here:

1. [docs/product-principles.md](product-principles.md) — _especially_ "Calm over sticky," "Quiet defaults," and "Wellness, not diagnosis." These shape every visual decision.
2. [docs/policies.md](policies.md) — public-facing surfaces (privacy, terms, crisis) and their tone constraints.
3. [docs/modules/cbt.md](modules/cbt.md) — the only fully-built feature today.
4. The current app: run it locally per the [README](../README.md), or browse the production web build once it's live at `selftend.org`.

To share work, open an issue with the `feature` or `accessibility` label and attach images, short videos, or links. Figma, Penpot, or any tool you prefer is fine — keep exports scannable inside the issue. We don't have a single canonical design file yet; mockups currently live in issues.

What to mind:

- Brand tokens live in `lib/theme.ts` and `tailwind.config.js`. Icon source is in `assets/branding/` ([docs/branding.md](branding.md)).
- The app must work on phone, tablet, and desktop web from the same codebase. Designs should consider all three.
- Avoid imagery that pathologizes mental health or implies clinical use.
- Mental-health-related illustration is sensitive — when in doubt, ask before investing a lot of time.
- Crisis pages must remain calm and clearly separate from app features. They are not the place for visual flourish.

## Translator

What you can contribute:

- Improve existing translations (English `en`, Bulgarian `bg`)
- Add a new language by translating all seven namespace files
- Review existing translations for tone, especially in mental-health-adjacent strings

Start here:

1. [Weblate selftend project](https://hosted.weblate.org/projects/selftend/) — translate in the web UI; Weblate auto-creates a PR.
2. [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md#translation) — overview of the translation workflow.
3. [docs/stack.md](stack.md#internationalization-i18n) — i18n architecture.
4. The seven namespace files in `src/i18n/locales/en/` are the canonical source. The `policies` namespace is the largest because it carries full legal text.

What to mind:

- Translate values, never keys.
- A new language must be complete (all seven namespaces). Partial locales create unpredictable fallback behavior.
- Tone matters: the app is supportive, not clinical, not infantilizing, not enthusiastic in a way that implies treatment outcomes.
- Some terms (CBT, "thought record," "automatic thought," "cognitive distortion") are technical. Prefer the established term in your target language's psychology literature over a literal translation.
- Crisis-resource copy must be reviewed carefully — incorrect localization could send someone to a wrong service. If in doubt, leave a comment in the PR rather than guess.
- Right-to-left languages will need additional layout work — flag this rather than committing partial RTL support.

## Tester

What you can contribute:

- Device testing on real Android phones and iPhones (the maintainer has limited device coverage)
- Web testing across browsers and screen sizes
- Accessibility testing with screen readers (TalkBack, VoiceOver, NVDA, JAWS)
- Reproducing reported bugs with clear steps
- Filing well-written bug reports

Start here:

1. [README.md](../README.md) — get the app running locally on web.
2. [docs/android-development.md](android-development.md) — Android dev-build setup if you want to test on Android.
3. [docs/internal-testing.md](internal-testing.md) — internal build and testing checklist.
4. [docs/android-closed-testing.md](android-closed-testing.md) — Google Play closed-testing readiness, once invitations open.

To file a bug, use the `bug-report.yml` template (the `Bug report` option when opening an issue). Include device, OS, browser if relevant, exact steps, expected vs. actual, and any privacy/safety concern.

What to mind:

- Account flows (sign-in, sign-out, magic links, OAuth, account deletion, data export) are the highest-priority test areas. Bugs there can lose user data or leak it.
- Reminders should be off by default and easy to disable. If you find a path that creates a reminder without explicit consent, file as `safety`, not just `bug`.
- Don't test against another contributor's account or production user data — use accounts you own or test accounts.
- Web push reminders behave differently across Chrome, Firefox, Safari, and iOS Home Screen. Note the exact platform when reporting.

## Mental-health expert (psychologist, therapist, researcher)

What you can contribute:

- Review the CBT module for accuracy of distortion definitions, framing, and tone
- Review crisis-resource copy and flag jurisdictions where the current resources are inadequate
- Advise on safety boundaries: what the app can and cannot say without crossing into diagnosis or treatment
- Review proposed modules (mood tracking, journaling, ACT, gratitude, meditation) for clinical reasonableness _before_ they ship
- Flag content that pathologizes normal experience or implies outcomes the app cannot deliver

Start here:

1. [docs/product-principles.md](product-principles.md) — especially principle 6 ("Wellness, not diagnosis") and principle 11 ("No AI coach in MVP").
2. [docs/modules/cbt.md](modules/cbt.md) — the only built module. Review the distortion list, the five-step thought-record flow, and the validation rules.
3. [docs/policies.md](policies.md) — privacy, terms, crisis copy, age floor (18+), and the explicit non-medical framing.
4. [.github/ROADMAP.md](../.github/ROADMAP.md) — sequencing of future modules.

To contribute, you can:

- Open an issue with the `safety` label describing what concerns you. Be specific (file path, line, exact phrasing).
- Open a PR editing copy in `src/features/policies/policy-content.ts` or the relevant locale files in `src/i18n/locales/{lang}/`.
- Email the maintainer at `support@selftend.org` if you'd rather review privately first, or if your concern is sensitive enough that a public issue is the wrong venue.

What to mind:

- This is a non-profit, free, self-help product. Contributions are uncompensated unless explicitly arranged. Please don't take on more than your time allows.
- The project does not currently claim "clinically reviewed" status anywhere, and won't until a formal review process exists. If you'd like that to change, raise it as a process discussion rather than as a copy edit.
- Credentials are appreciated context but not required to file an issue. If you'd like to be credited, say so in your PR or issue and let us know how you want to be named.
- The MVP intentionally has no AI coach, no peer-to-peer messaging, and no community feed. If you think any future module needs clinical involvement before shipping (e.g., suicide-safety planning), please flag that early so it can be planned for or dropped from scope.
- Crisis copy currently lists US (988) and Canada resources only. Expanding to other jurisdictions is an open task; see the global crisis-resource item in [.github/ROADMAP.md](../.github/ROADMAP.md).

## What's not yet covered

Selftend will eventually need community moderators, content editors, and possibly a security reviewer. Those roles are deferred until the project actually has the activity to justify them. If you'd like to step into one of those roles before they're documented here, open a discussion or email the maintainer.

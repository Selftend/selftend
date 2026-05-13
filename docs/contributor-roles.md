# Contributor Roles

Selftend welcomes code, design, docs, content, QA, translation, accessibility, and mental-health review. For the general flow, read [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md). For community operations, see [community.md](community.md).

## Developer

Useful work:

- app features in `src/features/`, `src/components/`, `components/`, and `app/`
- Supabase schema, RLS, storage policies, and edge functions
- tests, accessibility fixes, performance, tooling, CI

Start with [README.md](../README.md), [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md), [stack.md](stack.md), [architecture.md](architecture.md), [data-privacy-model.md](data-privacy-model.md), and [modules/tools.md](modules/tools.md). Pick a `good first issue`, a Bug or Feature issue, or an issue labeled `accessibility`. Comment before taking larger work.

Keep in mind: wellness, not diagnosis; privacy first; optional non-punitive reminders/progress; Expo defaults and approved dependencies before new libraries.

## Designer

Useful work:

- layouts, component states, brand work, empty/loading/error states
- UX flow review for onboarding, CBT, settings, deletion, support
- accessibility review: contrast, touch targets, focus order, screen readers, reduced motion
- calm, non-clinical copy review

Start with [product-principles.md](product-principles.md), [policies.md](policies.md), [modules/cbt.md](modules/cbt.md), and the running app. Share designs in a Feature issue or accessibility issue with images, videos, or links.

Keep in mind: phone, tablet, and desktop web all matter; mental-health imagery should not pathologize users; crisis pages stay calm and separate from app features.

## Translator

Translations are managed in [Weblate](https://hosted.weblate.org/projects/selftend/). Improve existing English/Bulgarian copy there, or request a new language through Weblate or a Localization issue.

Start with [.github/CONTRIBUTING.md#translation](../.github/CONTRIBUTING.md#translation), [stack.md#internationalization-i18n](stack.md#internationalization-i18n), and the English source files in `src/i18n/locales/en/`.

Keep in mind: translate values, not keys; new languages need all seven namespaces; mental-health and crisis terms need careful review; RTL languages need layout work, not just strings.

## Tester

Useful work:

- Android, iOS, and web device coverage
- browser and screen-size testing
- screen-reader testing
- bug reproduction with exact steps

Start with [README.md](../README.md), [android-development.md](android-development.md), [internal-testing.md](internal-testing.md), and [android-closed-testing.md](android-closed-testing.md). File defects through the Bug report template and include platform, environment, steps, expected/actual behavior, and privacy or safety impact.

Keep in mind: account, deletion, export, sign-in, reminders, and permission flows are high risk. Test only with accounts and data you control.

## Mental-Health Reviewer

Useful work:

- CBT accuracy, tone, and framing review
- crisis-resource copy and jurisdiction gaps
- safety boundaries around diagnosis, treatment, crisis support, minors, and future modules
- review of proposed mood, journaling, ACT, gratitude, meditation, or similar content before shipping

Start with [product-principles.md](product-principles.md), [modules/cbt.md](modules/cbt.md), [policies.md](policies.md), and [.github/ROADMAP.md](../.github/ROADMAP.md). Use a Content or safety-labeled issue for public review, or email `support@selftend.org` if the concern is sensitive.

Selftend does not currently claim formal clinical review. Credentials are useful context but not required; say how you want to be credited if you want public recognition.

## Not Yet Covered

Community moderation, content editing, and security-review roles are deferred until activity justifies them. Open an issue or email the maintainer if you want to help define one of those paths.

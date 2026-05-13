# Contributing

Thanks for helping with Selftend.

Selftend accepts code, design, docs, content, QA, localization, and community work. By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues through [SECURITY.md](SECURITY.md), not public issues.

## Start Here

- Read [README.md](../README.md) for setup and run commands.
- Read [docs/product-principles.md](../docs/product-principles.md) before proposing product scope.
- For role-specific paths, use [docs/contributor-roles.md](../docs/contributor-roles.md).
- Beginner-friendly issues: [good first issue](https://github.com/Selftend/selftend/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).

You do not need Supabase, EAS, or Google OAuth for docs, copy, design notes, translation, or issue triage. Running the app end-to-end does require a Supabase project.

## Project Boundaries

- Keep the product free to users.
- Do not add ads, ad SDKs, subscription paywalls, or dark patterns.
- Do not frame the app as diagnosis, treatment, crisis care, or a therapist replacement.
- Keep reminders, streaks, quests, and similar mechanics optional and non-punitive.
- Do not add tracking, analytics, broad social features, or AI mental-health coaching without explicit review.
- Do not copy code, product copy, or assets from other projects without license review and attribution.

## Code Map

| Path                       | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `app/`                     | Expo Router routes. Do not put non-route modules here.                                                  |
| `app/(app)/` `app/(auth)/` | Protected app shell and auth route groups.                                                              |
| `src/features/`            | Feature folders: `auth`, `cbt`, `modules`, `policies`, `profile`, `settings`, `tools`.                  |
| `src/components/`          | Shared product components such as safety callouts, screen states, toasts, modals, and error boundaries. |
| `components/`              | App-level reusable components plus generated Reusables primitives in `components/ui/`.                  |
| `src/providers/`           | Session, i18n, and root provider setup.                                                                 |
| `src/stores/`              | Zustand local state.                                                                                    |
| `src/lib/`                 | Shared app libraries: Supabase client, environment handling, notifications.                             |
| `src/i18n/`                | i18next config and `locales/{lang}/` JSON namespaces.                                                   |
| `lib/`                     | Reusables theme glue and `cn()` utility.                                                                |
| `supabase/`                | Migrations, RLS policies, and edge functions. See [supabase/README.md](../supabase/README.md).          |
| `functions/`               | Supabase Edge Function source for web push reminders.                                                   |
| `test/`                    | Tests that need shared providers. File-local tests can live next to the code as `*.test.ts(x)`.         |
| `scripts/`                 | Maintainer scripts for Android and dev-client workflows.                                                |
| `docs/`                    | Product, platform, policy, and process docs.                                                            |

New modules must follow [docs/modules/tools.md](../docs/modules/tools.md). For app structure and data-flow details, read [docs/architecture.md](../docs/architecture.md).

## Translation

Translations are managed in Weblate:

https://hosted.weblate.org/projects/selftend/

To contribute translations:

1. Create a hosted.weblate.org account.
2. Pick the Selftend project and language.
3. Translate in Weblate.
4. Weblate opens a GitHub PR for review.

To add a language, request it in Weblate or open a GitHub issue. New languages need all seven namespaces listed in [docs/stack.md](../docs/stack.md).

## Which Issue Template To Use

- **Bug report**: reproducible defects in the app, docs, backend behavior, or contributor tooling.
- **Feature request**: product or implementation proposals that need scope review before work starts.
- **Content**: changes to in-app copy, educational text, exercises, crisis copy, or tone.
- **Accessibility**: screen reader, focus, contrast, reduced-motion, touch target, or semantic issues.
- **QA test report**: device test passes, release verification, reproduction attempts, and manual testing notes.
- **Localization**: language requests, translation bugs, missing keys, Weblate workflow issues, or RTL/layout concerns.
- **Docs or process**: contributor onboarding, setup docs, roadmap docs, GitHub workflow, release process, or operations docs.

Do not open public issues for vulnerabilities, private account data, private health details, or another person's data. Use [SECURITY.md](SECURITY.md) for security reports and `support@selftend.org` for sensitive support concerns.

## Contribution Flow

1. Open or claim an issue. For changes larger than a typo, explain the approach first.
2. Branch from `main` with a short descriptive name, such as `fix/cbt-empty-state` or `docs/contributing-map`.
3. Keep each PR to one concern.
4. Open the PR against `main` and fill in the template honestly.
5. Update [.github/ROADMAP.md](ROADMAP.md) when the change affects product status, implementation progress, or next steps.
6. Update docs in the same PR when setup, commands, deployment, env vars, safety boundaries, legal boundaries, or current blockers change.

## Local Checks

```bash
npm run start      # Expo dev server
npm run web        # Expo web
npm run android    # Android dev build
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run lint:fix   # ESLint auto-fixes
npm run format     # Prettier
npm run test       # Jest
npm run test:watch # Jest watch mode
npm run verify     # CI check set
```

`npm run verify` matches CI. Husky installs with `npm install`; the pre-commit hook runs formatting and verification before a commit.

## Tests

- Use Jest and `@testing-library/react-native`.
- Put unit tests next to the file when possible.
- Put route/component tests that need providers in `test/` and use `test/render-with-providers.tsx`.
- Keep test files outside `app/` so Expo Router does not treat them as routes.
- New persistent modules need schema or repository tests plus one critical UI state test.

## Recognition

Public thanks should include docs, design, QA, moderation, translation, and community work, not only code.

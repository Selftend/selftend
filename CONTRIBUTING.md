# Contributing

Thanks for helping with Selftend.

This project is meant to be open to more than code contributions. Product, design, docs, content, QA, localization, and community work all matter.

## Project posture

- Mission-driven
- Free to users
- Non-profit
- Privacy-conscious
- Open-source

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, use the private process in [SECURITY.md](SECURITY.md), not a public issue.

## Where collaboration happens

- GitHub: source of truth for issues, PRs, docs, and roadmap
- Discord: contributor chat and coordination
- Shared project email aliases: for support, security, and contributor contact

## Good first contribution areas

- documentation cleanup
- copy editing
- roadmap refinement
- design notes
- accessibility review
- issue triage
- test planning
- adding or improving translations

Filtered list of issues marked beginner-friendly: [good first issue](https://github.com/Selftend/selftend/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22). If none are open, comment on any issue you'd like to take, or open one describing what you want to work on.

For role-specific starting points (developer, designer, translator, tester, mental-health expert), see [docs/contributor-roles.md](docs/contributor-roles.md).

## Getting set up

1. Read [README.md](README.md) for `npm install`, env vars, and how to run the app on web or Android.
2. Optional but useful for context: skim [AGENTS.md](AGENTS.md) and [docs/product-principles.md](docs/product-principles.md) — they explain why certain product decisions are non-negotiable (no AI therapist framing, no manipulative streaks, etc.).
3. The Husky pre-commit hook installs automatically with `npm install` and runs format + verify before each commit.

You do not need to set up Supabase, EAS, or Google OAuth to make doc, copy, or translation changes. The app does need a Supabase project to run end-to-end.

## Code structure

| Path                       | Purpose                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app/`                     | Expo Router routes. File-system routes; do not put non-route modules here.                                              |
| `app/(app)/` `app/(auth)/` | Route groups for the protected app shell and auth flows.                                                                |
| `src/features/`            | Feature folders: `auth`, `cbt`, `modules`, `policies`, `profile`, `settings`, `tools`. Most product logic lives here.   |
| `src/components/`          | Cross-feature shared components (safety callout, screen states, toast, error boundary, modals).                         |
| `components/`              | Top-level reusable app components (header, sidebar, sign-in form, etc.) plus the Reusables `components/ui/` primitives. |
| `src/providers/`           | App-wide React providers (session, i18n, root provider tree).                                                           |
| `src/stores/`              | Zustand stores for local state.                                                                                         |
| `src/lib/`                 | Shared library code: Supabase client, env, notifications.                                                               |
| `src/i18n/`                | i18next config and `locales/{lang}/` JSON namespace files.                                                              |
| `lib/`                     | Reusables theme glue (`theme.ts`) and `cn()` utility.                                                                   |
| `supabase/`                | Database migrations, RLS policies, edge functions. See [supabase/README.md](supabase/README.md).                        |
| `functions/`               | Supabase Edge Functions source (web push reminders).                                                                    |
| `test/`                    | Jest tests that need provider wrappers. Tests for individual files can live next to them as `*.test.ts(x)`.             |
| `scripts/`                 | Maintainer scripts (Android dev launcher, dev-client starter).                                                          |
| `docs/`                    | All non-top-level documentation.                                                                                        |

When adding a new module, follow the module contract in [docs/modules/tools.md](docs/modules/tools.md): identity, data, UI states, safety, drafts, reminders, tests.

For a deeper tour — provider tree, auth flow, data layer pattern, where web and native diverge — see [docs/architecture.md](docs/architecture.md).

## Translating the app

Translations are managed via Weblate (hosted Libre plan):

https://hosted.weblate.org/projects/selftend/

To contribute:

1. Create an account on hosted.weblate.org.
2. Browse to the selftend project and pick a language.
3. Translate in the web UI — Weblate auto-creates a GitHub PR.
4. A maintainer reviews and merges.

To add a new language, request it via the Weblate interface or open a
GitHub issue. See docs/stack.md for the namespace list.

## Contribution flow

1. Open or find an issue. If the change is larger than a typo, explain your approach before writing a lot of code.
2. Branch from `main`. Short, descriptive branch names are fine: `fix/cbt-archive-empty-state`, `docs/contributing-code-map`, `feat/journal-mvp`. Strict prefixes are not enforced.
3. Keep PRs focused. One concern per PR.
4. Open the PR against `main`. The PR template prompts for summary, checks, and product-guardrail items — fill them in honestly. PR titles should be short and descriptive ("Fix CBT archive empty state" beats "Update files").
5. Update [ROADMAP.md](ROADMAP.md) when the change materially affects product status, implementation progress, or the next planned steps.
6. Update relevant docs in the same PR if the change affects setup, commands, deployment, env vars, safety/legal boundaries, or current blockers (this matches the Documentation expectation in [README.md](README.md)).
7. Do not add product scope that conflicts with the roadmap without discussion.

## Dev loop and local checks

Common commands while working:

```bash
npm run start      # Expo dev server
npm run web        # Expo web only
npm run android    # Android dev build (see docs/android-development.md)
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run lint:fix   # ESLint with safe auto-fixes
npm run format     # Apply Prettier
npm run test       # Jest (one shot)
npm run test:watch # Jest in watch mode
npm run verify     # What CI runs: lint + format check + typecheck + tests
```

`npm run verify` is the same set of checks CI enforces. Running it locally before pushing avoids a round-trip.

Husky installs the pre-commit hook automatically with `npm install`. The hook runs `npm run format` then `npm run verify`, plus per-file `lint-staged` checks. Editor extensions (Prettier, ESLint) are recommended but optional — the hook covers what matters.

If formatting fails, run `npm run format` and re-stage.

## Tests

- Use Jest + `@testing-library/react-native`.
- Unit tests can live next to the file they test (`foo.ts` + `foo.test.ts`).
- Component or route tests that need shared providers (i18n, safe area, TanStack Query) go in `test/` and use `test/render-with-providers.tsx`. Route component tests may import screens from `app/`, but the test files themselves must live outside `app/` so Expo Router does not treat them as runtime routes.
- New module work should add at least schema/repository tests and one component-state test, per the module contract in [docs/modules/tools.md](docs/modules/tools.md).

## Rules for contributors

- Do not introduce dark patterns.
- Do not add invasive analytics casually.
- Do not copy code or product copy from other projects without license review and attribution.
- Do not frame the product as diagnosis, treatment, or crisis care.
- Be careful with mental-health content and tone.

## Recognition

Contributors should be thanked publicly in a way that matches their contribution. Recognition should include docs, design, QA, moderation, translations, and community work, not only code.

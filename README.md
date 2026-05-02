# mental-health

Working title for a free, non-profit, cross-platform mental health product.

This repository started as docs-first planning and now includes the first implementation scaffold: an Expo Router app with Google OAuth and passwordless email auth foundations, a CBT section, private thought records, settings, public policy surfaces, support links, tests, and CI.

## Mission

Build a widely available mental health app that helps as many people as possible without ads, subscriptions, manipulative engagement loops, or paywalls.

## Product direction

- wellness and self-help first, not diagnosis or therapist replacement
- guided self-help before social/community product features
- account-required MVP for cross-platform continuity
- gamification is optional, soft, and never punitive
- users should be able to choose which features they want and turn features off later
- notifications must be explicit, quiet by default, and easy to disable
- the app should be usable on iOS, Android, and in a browser from one product codebase

## Current implementation

The first shipped section is `CBT`.

Included now:

- Expo + React Native + TypeScript scaffold
- Expo Router app shell
- Supabase Google OAuth and magic-link auth wiring
- CBT learn surface and guided thought record flow
- thought history, edit, and archive flow
- quiet reminder settings, default-off
- support, legal, privacy, crisis, and account-deletion surfaces
- Jest test harness
- GitHub issue / PR templates and CI workflow

Deferred intentionally:

- mood check-ins as a separate section
- journaling as a separate section
- broader tool library
- social features
- AI features

## Quick start

1. Install dependencies:

```bash
npm install
```

Use Node `20.19.0+` for this repo. That matches the `package.json` engine requirement. Expo SDK 54 does not work correctly on Node 18.

2. Copy env values:

```bash
cp .env.example .env
```

3. Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID` only if you need to override the linked Expo project ID

4. Run the app:

```bash
npm run start
```

Useful commands:

```bash
npm run web
npm run start:dev-client
npm run build:android:development
npm run build:android:preview
npm run build:android:production
npm run export:web
npm run serve:web:production
npm run typecheck
npm test -- --runInBand
```

For Android development, use the installed development build with `npm run start:dev-client`. Do not treat Expo Go as the default Android workflow for this project.

## Android development build

Use the Android development build for normal development, reminder testing, and device verification. Do not use Expo Go as the primary Android runtime for this project.

1. Create or update `.env` with your real Supabase values.
2. The linked Expo project ID is already configured in `app.config.ts`. Only set `EXPO_PUBLIC_EAS_PROJECT_ID` if you need to override it.
3. If the project is not yet linked in EAS for your account, run `npx eas-cli init`.
4. Build the Android development client:

```bash
npm run build:android:development
```

5. Install the resulting build on the Android device or emulator.
6. Start Metro for the development client:

```bash
npm run start:dev-client
```

7. Open the installed development build and connect it to the Metro server.

Once the development build is installed, keep using it as the default Android development client. On Linux, the day-to-day workflow should be `npm run start:dev-client` plus the installed dev build, with `npm run build:android:development` only when you need a refreshed binary.

## Repo map

- [ROADMAP.md](ROADMAP.md): feature roadmap, launch phases, and readiness criteria
- [AGENTS.md](AGENTS.md): instructions for AI agents working in this repo
- [CONTRIBUTING.md](CONTRIBUTING.md): contributor flow and expectations
- [docs/product-principles.md](docs/product-principles.md): product guardrails
- [docs/stack.md](docs/stack.md): approved technical stack
- [docs/costs.md](docs/costs.md): launch and operating cost planning
- [docs/deployment.md](docs/deployment.md): static web deployment and Supabase auth callback setup
- [docs/android-closed-testing.md](docs/android-closed-testing.md): Google Play closed-testing readiness
- [docs/policies.md](docs/policies.md): public policy surfaces and launch-review status
- [docs/naming.md](docs/naming.md): current app-name candidate and naming checks
- [docs/community.md](docs/community.md): contributor/community and popularization strategy
- [docs/licensing.md](docs/licensing.md): license choice and reference-repo rules
- [docs/modules/cbt.md](docs/modules/cbt.md): first CBT module spec
- [docs/reference-log.md](docs/reference-log.md): reference-repo usage log
- [docs/github-setup.md](docs/github-setup.md): GitHub workflow and label setup
- [docs/internal-testing.md](docs/internal-testing.md): internal build and testing checklist
- [supabase/README.md](supabase/README.md): schema and environment notes

## Documentation expectation

This repo relies on docs as durable context. When a change affects setup, commands, deployment, store submission, environment variables, safety/legal boundaries, current blockers, or next user inputs, update the relevant docs in the same pass so fresh-context agents can resume safely.

## Status

Implementation scaffold is in place and pushed to GitHub. A real Supabase project exists, Android development should use the installed development build rather than Expo Go, and launch-prep docs now cover static web deployment plus Google Play closed testing. The temporary web-test domain is `yoshevbot.uk` under Cloudflare. The next blockers are Cloudflare Pages deployment, domain email aliases, final app naming, Supabase production redirect configuration, first-migration confirmation if it has not been applied yet, and end-to-end auth/persistence verification on web and device builds from the current environment.

Future direction now includes a self-hosting and portability track after the MVP is useful: keep the hosted Supabase path working, but preserve a later path for user-controlled backends, managed self-hosting options, and do-it-yourself deployment docs.

## Reference repositories

This project may inspect sibling repositories such as `../freecbt`, `../quirk`, `../ifme`, and `../awesome-mental-health` for ideas, workflows, and lessons, but should not copy code, text, or assets into this repo without explicit license review and attribution.

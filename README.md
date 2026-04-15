# mental-health

Working title for a free, non-profit, cross-platform mental health product.

This repository started as docs-first planning and now includes the first implementation scaffold: an Expo Router app with account/auth foundations, a CBT section, private thought records, settings, support stubs, tests, and CI.

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
- Supabase auth wiring and protected routes
- CBT learn surface and guided thought record flow
- thought history, edit, and archive flow
- quiet reminder settings, default-off
- support and legal stub screens
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

2. Copy env values:

```bash
cp .env.example .env
```

3. Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID` when EAS is configured

4. Run the app:

```bash
npm run start
```

Useful commands:

```bash
npm run web
npm run typecheck
npm test -- --runInBand
```

## Repo map

- [ROADMAP.md](ROADMAP.md): feature roadmap, launch phases, and readiness criteria
- [AGENTS.md](AGENTS.md): instructions for AI agents working in this repo
- [CONTRIBUTING.md](CONTRIBUTING.md): contributor flow and expectations
- [docs/product-principles.md](docs/product-principles.md): product guardrails
- [docs/stack.md](docs/stack.md): approved technical stack
- [docs/costs.md](docs/costs.md): launch and operating cost planning
- [docs/community.md](docs/community.md): contributor/community and popularization strategy
- [docs/licensing.md](docs/licensing.md): license choice and reference-repo rules
- [docs/modules/cbt.md](docs/modules/cbt.md): first CBT module spec
- [docs/reference-log.md](docs/reference-log.md): reference-repo usage log
- [docs/github-setup.md](docs/github-setup.md): GitHub workflow and label setup
- [docs/internal-testing.md](docs/internal-testing.md): internal build and testing checklist
- [supabase/README.md](supabase/README.md): schema and environment notes

## Status

Implementation scaffold is in place. GitHub remote creation and first push are still blocked until the repository exists in GitHub.

## Reference repositories

This project may inspect sibling repositories such as `../freecbt`, `../quirk`, `../ifme`, and `../awesome-mental-health` for ideas, workflows, and lessons, but should not copy code, text, or assets into this repo without explicit license review and attribution.

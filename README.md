# Selftend

<div align="center">
  <img src="./assets/icon.png" alt="Selftend logo" width="200" height="200" />
</div>

Selftend is a free, non-profit, cross-platform mental health product.

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
- Google profile-picture import plus manual profile-picture changes backed by Supabase Storage
- NativeWind styling with default React Native Reusables-generated UI primitives
- brand theme tokens with a purple primary, gray secondary, and subtle purple-tinted surfaces
- CBT learn surface and guided thought record flow
- account-backed one-page app and CBT onboarding with a Settings reset control
- thought history, edit, and archive flow
- collapsible sidebar Tools navigation with CBT history nested under CBT
- placeholder routes for Mood tracker, Meditation, ACT, and Gratitude log
- quiet reminder settings, default-off, with native local reminders and web push infrastructure
- support, legal, privacy, crisis, and account-deletion surfaces
- shared safety callout, loading/empty/error states, mobile form shell, app toast feedback, and global error fallback
- Jest test harness
- provider-aware component test example for i18n, navigation assumptions, and mocked backend data
- GitHub issue / PR templates and CI workflow
- i18n with English and Bulgarian, runtime language switching in settings

Deferred intentionally:

- mood check-ins as a separate section
- journaling as a separate section
- real implementations for ACT, meditation, gratitude, and the broader tool library
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

For a self-hosted or bring-your-own-Supabase build, start from:

```bash
cp .env.self-host.example .env
```

3. Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_PUBLIC_APP_URL=http://localhost:8081` for local Expo web auth, or your production web origin before exporting a production web build
- `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` if testing browser push reminders
- `EXPO_PUBLIC_EAS_PROJECT_ID` only if you need to override the linked Expo project ID

Only put public client configuration in `EXPO_PUBLIC_*` values. Never put service-role keys, database passwords, OAuth secrets, SMTP secrets, or JWT secrets in Expo public env vars.

Web push also needs Supabase Edge Function secrets before browser reminders can send:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`, for example `mailto:support@selftend.org`
- `WEB_PUSH_CRON_SECRET`

For local Expo web auth, make sure the matching callback URL is allowed in Supabase Auth redirect URLs:

```text
http://localhost:8081/auth-callback
```

For Android setup, including the development-client identity, callback URLs, and `npm run android` workflow, see [docs/android-development.md](docs/android-development.md).

4. Run the app:

```bash
npm run start    # Expo dev server (web + Expo Go)
npm run web      # Expo web only
npm run android  # Android dev build (see docs/android-development.md)
```

Day-to-day commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run verify   # what CI runs: lint + format check + typecheck + tests
npm run format   # apply Prettier
```

Before a Google Play upload, run `npm exec expo -- config --type prebuild --json` and confirm the resolved Android permissions do not include `android.permission.CAMERA` or `android.permission.RECORD_AUDIO`. The app only uses the photo library for optional profile-picture changes, and `app.config.ts` disables camera and microphone permissions in `expo-image-picker` for Play policy hygiene.

## Branding

Icon source and regeneration script: see [docs/branding.md](docs/branding.md).

## Android development

The default Android workflow uses an EAS development client (`Selftend Dev`), not Expo Go. For setup, callback URLs, day-to-day commands, troubleshooting, and local builds, see [docs/android-development.md](docs/android-development.md).

## Releases

GitHub Actions has manual workflows for `Android Play internal release`, `Web production deploy`, and `Android development APK` (cross-machine emulator builds). Required variables, secrets, and trigger details live in [docs/github-setup.md](docs/github-setup.md). EAS preview and production builds fail if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is missing, so a Play build cannot ship with auth disabled by accident.

## Repo map

Top-level:

- [ROADMAP.md](ROADMAP.md) — feature roadmap, launch phases, and readiness criteria
- [CONTRIBUTING.md](CONTRIBUTING.md) — contributor flow, code structure, dev loop
- [AGENTS.md](AGENTS.md) — instructions for AI agents working in this repo
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — expected behavior in project spaces
- [SECURITY.md](SECURITY.md) — how to report security vulnerabilities
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — third-party notice tracking for copied/generated code

Most-read deeper docs:

- [docs/contributor-roles.md](docs/contributor-roles.md) — practical starting points by role (developer, designer, translator, tester, mental-health expert)
- [docs/product-principles.md](docs/product-principles.md) — product guardrails
- [docs/stack.md](docs/stack.md) — approved technical stack
- [docs/architecture.md](docs/architecture.md) — how the runtime layers fit together
- [docs/data-privacy-model.md](docs/data-privacy-model.md) — data classes, privacy rules, export and deletion model

Everything else: [docs/README.md](docs/README.md) is the full index, grouped by topic. Backend-specific notes live in [supabase/README.md](supabase/README.md).

## Documentation expectation

This repo relies on docs as durable context. When a change affects setup, commands, deployment, store submission, environment variables, safety/legal boundaries, current blockers, or next user inputs, update the relevant docs in the same pass so fresh-context agents can resume safely.

## Status

Implementation scaffold is in place and pushed to GitHub. A real Supabase project exists, Android development should use the installed development build rather than Expo Go, and the UI shell now uses NativeWind with default React Native Reusables-generated primitives plus brand tokens from the Selftend icon palette. The P0 app and backend foundation now includes shared safety, feedback, loading/empty/error, mobile form, online-first draft, global error fallback, data/privacy, module-contract, component-test patterns, repaired Supabase migration history, profile avatar storage, language preference persistence, account-backed one-page app/CBT onboarding flags, native local reminders, and browser push reminder infrastructure. Launch-prep docs cover single-page Netlify web deployment plus Google Play closed testing, including Android permission hardening for the first Play upload. The next blockers are `selftend.org` purchase/DNS, Netlify production env verification, web push VAPID keys and Supabase Edge Function secrets, web reminder cron scheduling, domain email aliases, Expo/EAS authentication on the build machine, Google Play organization account setup, first manual AAB upload, Supabase production Site URL and redirect verification, and end-to-end auth/persistence/profile-picture/reminder verification on web and device builds from the current environment.

The current database/storage contract includes profile avatar metadata, a private Supabase Storage `profile-pics` bucket, timestamped reminder consent fields, and `web_push_subscriptions` for opted-in browser reminders. Removed profile photos use the existing nullable avatar fields plus a removal timestamp, so no extra avatar-source value is required. Apply all migrations before testing profile-picture upload, profile-picture removal, account deletion cleanup, or browser reminders.

The first web and Android testing path uses the maintainer-hosted Supabase project. Data separation remains a product direction, but it is not a launch blocker: add export/delete first, then local-only storage, then encrypted backup/import, with custom backend or Drive sync considered later.

## Reference repositories

This project may inspect sibling repositories such as `../freecbt`, `../quirk`, `../ifme`, and `../awesome-mental-health` for ideas, workflows, and lessons, but should not copy code, text, or assets into this repo without explicit license review and attribution.

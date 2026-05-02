# Technical Stack

Last reviewed: 2026-05-02

## Stack summary

- App framework: Expo + React Native + TypeScript
- Routing: Expo Router
- Styling: NativeWind + Tailwind CSS
- Server state: TanStack Query
- Local state: Zustand
- Forms: React Hook Form + Zod
- Backend: Supabase
- Notifications: Expo Notifications
- Secure local storage: Expo SecureStore
- Builds and store delivery: EAS Build + EAS Submit
- Web hosting for Expo web output: Cloudflare Pages or equivalent static hosting
- Testing: Jest + React Native Testing Library, with browser smoke tests later

## Why Expo

Expo is the default product platform because it gives one app stack for:

- iOS
- Android
- browser

It also gives strong defaults for:

- native APIs
- notifications
- secure storage
- build tooling
- app submission tooling

## Why NativeWind

NativeWind is an intentional approved exception to the "Expo defaults first" rule.

Reasons:

- fast cross-platform styling iteration
- consistent utility-based design language
- good fit with Expo and React Native
- easier tokenization for spacing, type, color, and state

## Why not daisyUI

`daisyUI` is web-DOM-focused and is not the right default for a React Native / Expo product. This project should use NativeWind and app-owned components instead.

## Dependency policy

Prefer Expo or React Native first for platform features.

Approved categories:

- Expo built-ins for device and platform capabilities
- NativeWind for styling
- small focused libraries for state, forms, and validation

Avoid by default:

- heavy UI kits
- large state frameworks without a clear need
- analytics SDKs with broad tracking by default
- libraries that duplicate Expo functionality

## Backend direction

Supabase is the default managed backend for MVP because it covers:

- authentication
- database
- storage
- row-level security
- server-side functions where needed

This keeps MVP scope manageable while leaving room to self-host or abstract later if necessary.

## Backend portability direction

The first web and Android testing path uses the maintainer-hosted Supabase project. Future data separation should be preserved, but runtime backend switching and local-only storage are not blockers for Android closed testing.

Current and planned backend modes:

- maintainer-hosted Supabase for the public web app and first Android closed-test build
- planned local-only storage for non-technical users who want personal records to stay on device
- planned bring-your-own Supabase Cloud project for technical self-hosters
- planned advanced self-hosted Supabase for operators who can run and maintain Supabase themselves

For the hosted path, the client uses public Supabase URL and publishable/anon key configuration from `EXPO_PUBLIC_*` values. Do not put service-role keys, database passwords, SMTP secrets, OAuth secrets, JWT secrets, or other private backend secrets in Expo public env vars.

Keep schema and RLS changes in `supabase/migrations` so hosted and self-hosted deployments can apply the same contract.

Out of scope before Android closed testing:

- automatic Google Drive backup/sync
- generic Postgres adapter
- Firebase/Appwrite/custom API support
- project-maintained production Docker Compose stack for Supabase

The eventual in-app data-location selector should be framed as a privacy choice before sign-in: hosted sync, local-only, or advanced custom Supabase. Implement export/delete first; local-only should come before automatic cloud backup.

## Data model direction

Expected MVP entities:

- user
- profile / preferences
- enabled modules
- mood check-ins
- journal entries
- quests / habits
- notification settings

## Web direction

The browser version should be the same product, not a separate marketing site.

Initial assumption:

- Expo web build
- static hosting
- Supabase-backed auth and data

If later SEO-heavy marketing pages are needed, they can be added as a separate web property without changing the app stack.

## Testing direction

MVP baseline:

- unit tests for core logic
- component tests for important screens and flows
- auth-flow smoke checks
- web smoke checks

Do not wait for "perfect QA" before writing tests. Add them around the riskiest logic first.

## Observability direction

Keep MVP observability minimal and privacy-aware.

Safe defaults:

- structured app errors
- auth and backend error logging
- deploy/build monitoring

Anything beyond that should be justified explicitly.

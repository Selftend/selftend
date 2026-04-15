# Technical Stack

Last reviewed: 2026-04-15

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

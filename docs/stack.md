# Technical Stack

## Summary

- App: Expo + React Native + TypeScript
- Routing: Expo Router
- Styling: NativeWind + Tailwind CSS
- UI: React Native Reusables-generated primitives in `src/components/react-native-reusables`
- Server state: TanStack Query
- Local state: Zustand
- Forms and validation: React Hook Form + Zod
- Backend: Supabase (Postgres, Auth, RLS, Storage, Edge Functions, Vault, pgcrypto)
- Notifications: Expo Notifications on native; browser Push API + Supabase Edge Function on web
- i18n: i18next + react-i18next + expo-localization
- Media: Expo ImagePicker for profile pictures
- Secure local storage: Expo SecureStore
- Builds/submission: EAS Build + EAS Submit
- Web hosting: static Expo web export on Netlify or equivalent
- Testing: Jest + React Native Testing Library; Playwright for web e2e

## Platform Decisions

Expo is the default because it keeps iOS, Android, and web in one product stack with strong defaults for native APIs, notifications, media, secure storage, builds, and app submission.

NativeWind is the approved styling exception because it gives fast cross-platform iteration and consistent tokens for spacing, type, color, and state.

React Native Reusables is the approved UI primitive source. Generated components live in `src/components/react-native-reusables`; keep them close to the upstream API and avoid app-specific compatibility props. App-owned composition lives in `src/components/app`.

Useful commands:

```bash
npm exec @react-native-reusables/cli@latest -- doctor --summary --yes
npm exec @react-native-reusables/cli@latest -- add --all --overwrite --styling-library nativewind
```

Do not add a second broad UI kit without a specific reason. `daisyUI` is web-DOM-focused and is not the default for this Expo/React Native app.

## Internationalization

Supported languages: English (`en`) and Bulgarian (`bg`). English is the fallback.

Translation files live in `src/i18n/locales/{lang}/` with seven namespaces:

| Namespace    | Scope                                     |
| ------------ | ----------------------------------------- |
| `common`     | shared UI strings                         |
| `auth`       | sign-in, sign-up, verification, passwords |
| `cbt`        | CBT module screens and records            |
| `settings`   | settings, profile, consent, cookie banner |
| `navigation` | tabs, sidebar, header, not-found          |
| `policies`   | policy page chrome and section content    |
| `errors`     | error messages                            |

Components use `useTranslation("namespace")`; non-component code may import `i18n.t()` directly. Policy screens use `t(sectionKey, { returnObjects: true })` for structured arrays.

Language preference is stored in AsyncStorage (`selftend:language`) and synced to `user_preferences.language`.

To add a language:

1. Create all seven namespace files under `src/i18n/locales/{code}/`.
2. Register the locale in `src/i18n/index.ts`.
3. Add the option to `src/components/app/language-toggle.tsx`.
4. Coordinate translation through [Weblate](https://hosted.weblate.org/projects/selftend/).

## Testing

- Unit and component tests use `jest-expo` and React Native Testing Library.
- Unit tests live next to the source file as `*.test.ts(x)`.
- Tests that need providers can import `test/render-with-providers.tsx` from their colocated test file.
- Test files must stay outside `app/` so Expo Router does not treat them as routes; keep route files thin and colocate tests with extracted `src/` components.
- Integration and e2e suites remain under `test/integration/` and `test/e2e/`.
- Add tests around the riskiest logic first: schemas, repositories, auth, deletion/export, reminders, and critical UI states.

## Dependency Policy

Prefer Expo or React Native defaults first.

Approved categories:

- Expo modules for platform capabilities
- NativeWind for styling
- React Native Reusables primitives and focused support packages
- small libraries for state, forms, validation, and server-state caching

Avoid by default:

- heavy UI kits
- large state frameworks without a clear need
- analytics SDKs or tracking defaults
- libraries that duplicate Expo functionality

## Backend And Hosting

Supabase is the MVP backend for auth, Postgres, RLS, storage, and edge functions. **Supabase Vault** holds the field encryption key outside the database; **pgcrypto** (`pgp_sym_encrypt` / `pgp_sym_decrypt`) is the crypto primitive for field-level encryption at rest. Netlify is the frontend host for the Expo web app at `https://selftend.org`. Native apps use Supabase directly and may open Netlify-hosted public policy pages.

The hosted path uses public `EXPO_PUBLIC_*` values. Never put service-role keys, database passwords, SMTP secrets, OAuth secrets, JWT secrets, or private backend credentials in Expo public env vars.

Keep schema and RLS changes in `supabase/migrations` so hosted and self-hosted deployments share the same contract.

## Portability Direction

Current launch path: maintainer-hosted Supabase for web and first Android closed testing.

Planned paths:

- local-only storage for non-technical users who want records on device
- bring-your-own Supabase Cloud for technical users
- advanced self-hosted Supabase for operators

Before Android closed testing, do not add automatic Google Drive sync, generic Postgres adapters, Firebase/Appwrite/custom API support, or a project-maintained production Docker Compose stack.

## Data, Web, And Observability

Expected MVP entities: user, profile, preferences, enabled modules, onboarding flags, mood check-ins, journal entries, quests/habits, notification settings, and web push subscriptions.

The browser version is the same product, not a separate marketing site: Expo web build, static hosting, Supabase-backed auth and data.

MVP observability stays minimal and privacy-aware: structured app errors, auth/backend error logging, and build/deploy monitoring. Anything beyond that needs explicit review.

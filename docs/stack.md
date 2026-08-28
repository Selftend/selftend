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
- Web hosting: static Expo web export on Cloudflare Workers (static assets) or equivalent
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

## Internationalization (i18n)

Supported languages: English (`en`) and Bulgarian (`bg`). English is the fallback.

Translation files live in `src/i18n/locales/{lang}/` — 20 namespaces, one JSON file per namespace per language. The authoritative list is the `ns` array in `src/i18n/index.ts`, and `src/i18n/locale-parity.test.ts` keeps the `en` and `bg` key sets identical. Ten cover app-level surfaces:

| Namespace       | Scope                                          |
| --------------- | ---------------------------------------------- |
| `common`        | shared UI strings                              |
| `auth`          | sign-in, sign-up, verification, passwords      |
| `settings`      | settings, profile, consent, cookie banner      |
| `navigation`    | tabs, sidebar, header, not-found               |
| `policies`      | policy page chrome and section content         |
| `errors`        | error messages                                 |
| `notifications` | reminder and notification settings             |
| `security`      | app lock and security settings                 |
| `help`          | in-app help content for tools and programs     |
| `modules`       | module copy without a dedicated tool namespace |

The other ten are one per tool or module: `act`, `cbt`, `gratitude`, `habits`, `journal`, `meditation`, `mood`, `routines`, `sleep`, `timer`.

Components use `useTranslation("namespace")`; non-component code may import `i18n.t()` directly. Structured content — policy sections, grounding steps, meditation instructions, gratitude prompts — is stored as JSON arrays and read with `t(key, { returnObjects: true })`.

Language preference is stored in AsyncStorage (`selftend:language`) and synced to `user_preferences.language`.

There is one Weblate component per namespace, each linked to the `auth` component so they share one repository connection. **All 20 namespaces are tracked** — the remaining 13 were created in one scripted pass on 2026-08-27 ([#1105](https://github.com/Selftend/selftend/issues/1105)), so every namespace is editable on Weblate.

Do not take that count on trust — it is a snapshot. `node scripts/weblate-create-components.js` reports which namespaces are untracked and prints the payload that would create them; `--verify` checks the live components against the expected configuration (i18next v4 format, propagation off, two-space JSON indent). Both are read-only and need no token. Now that the set is complete, adding a namespace also means adding a component: re-run the script with `--apply` and a `WEBLATE_API_TOKEN`, then revoke the token.

`--apply` also repairs components it did not create: Weblate auto-detects JSON indentation and has guessed wrong before, and a component left at the wrong width rewrites its whole locale file on the first translation write-back. Any component not at two spaces is PATCHed back, so one command covers the whole sitting; `--fix-indent` runs that repair on its own. Because the Weblate API documents `file_format_params` as writable under `PUT` but not `PATCH`, the repair re-reads each component afterwards and fails loudly if the value did not take, rather than trusting the status code — set it by hand (Component → Manage → Settings → Files → JSON indentation → 2) if that happens.

Weblate tracks `main`, while this repo develops on `dev`, so a namespace can be ready in the tree and not yet ready to track. Before creating anything the script reads each namespace's file as `main` has it and withholds the ones that would come up with error-level alerts — a key with both a bare and an i18next-v4 plural form (`key` beside `key_other`, where v4 wants `key_one`), or a file that has not reached `main` at all and would leave the filemask matching nothing. Withheld namespaces are named with their reason and wait for the next dev→main release; the rest are created anyway, so a release is never a reason to postpone the whole pass. The screen reads GitHub rather than the local checkout, because a stale `origin/main` would clear a namespace that is not actually clean.

`--apply` closes with the same steps a human would do afterwards, while the token is still live: it pulls the project repository, then reports the project's failing-check count, any namespace still untracked, and each component's alerts. `--finish` runs just that closing step. Alerts are listed rather than judged — the API exposes no severity field — so confirming they are warnings and not errors is still a human call. As of 2026-08-27 hosted Weblate answers `GET /api/components/selftend/<slug>/alerts/` with `404` for every component, even for a token that reads and writes those same components — the endpoint is gone, not guarded. The script distinguishes that from a token that cannot see alerts: a `404` on every component is reported once as a property of the deployment and does not fail the pass, while a `403`, or a `404` on only some components, stays loud and holds the exit code at 1. A run that could not read alerts says so in its closing line rather than implying a clean bill. Read the severities from the UI instead: each component page carries an **Alerts** tab whose cards are badged `Information`, `Warning`, or `Error`.

Removing a source string is a repo-side operation, and it is the one direction the steps above do not cover. Delete the key and **both** locale files in the same commit, together with any asset the key pulls in. For a help key that is five places: the entry in `HELP_KEYS` (`src/features/help/help-content.ts`), the block in `en/help.json`, the block in `bg/help.json`, the `HELP_IMAGES` entry (`src/features/help/help-images.ts`), and the PNG under `assets/images/help/`. Other namespaces are the same shape with a shorter tail — the key, both locales, and whatever the key referenced.

Both locales moving together is the binding constraint, and it is a repo test rather than anything Weblate does: `src/features/help/help-content.test.ts` asserts the `bg` help namespace holds exactly the `en` key set, and `src/i18n/locale-parity.test.ts` holds the same line across every namespace and every key path. A one-locale removal is a red build, not a staged migration.

`tsc` forces the code reference out but never the file on disk. `HELP_IMAGES` is typed `Partial<Record<HelpKey, ImageSourcePropType>>`, so an entry naming a deleted key fails the excess-property check (TS2353); removing the `require()` is therefore mandatory, and it is what drops the asset from the bundle. The PNG itself survives in git until it is deleted deliberately. `test/help-key-doors.test.ts` is the guard that catches what is left behind; read its clauses there rather than reconstructing them from here. A half-done removal fails CI instead of living on Weblate.

Weblate is silent about removals and loud about changes. Checked 2026-08-28 ([#1521](https://github.com/Selftend/selftend/issues/1521)): its change vocabulary carries repository-sourced _added_ and _changed_ events but no repository-sourced removal, and no alert covers removed or surplus strings, so nothing there signals a deleted source string — the unreadable `/alerts/` endpoint described above hides nothing on this path. A deletion reaches Weblate as a pull from the repository, so it never triggers a push. What does surface is a **changed** source string, which is why rewording is the visible half of a removal that rescues its content elsewhere: [#1545](https://github.com/Selftend/selftend/issues/1545) deleted the `distortions` help entry and moved its `why` sentence into `cbt.learn.description`, and that rewrite is the only half of it Weblate will ever show. Write the `bg` side of a rescued string by hand in the same commit — parity checks that a key is present, never that its translation is current.

That batch is also the first source-string removal to round-trip through this project: as of 2026-08-28 none of the 8,718 change events on the Weblate project was a removal of any kind, so the path is unexercised rather than proven — and since Weblate tracks `main`, nothing of it reaches Weblate at all until the next dev→main release.

To add a language:

1. Create all 20 namespace files under `src/i18n/locales/{code}/` (mirror `src/i18n/locales/en/`).
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

Supabase is the MVP backend for auth, Postgres, RLS, storage, and edge functions. **Supabase Vault** holds the field encryption key outside the database; **pgcrypto** (`pgp_sym_encrypt` / `pgp_sym_decrypt`) is the crypto primitive for field-level encryption at rest. Cloudflare Workers (static assets) is the frontend host for the Expo web app at `https://selftend.org`. Native apps use Supabase directly and may open the Cloudflare-hosted public policy pages.

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

# Architecture

A map of how the app is organized. For stack choices, see [stack.md](stack.md). For stored data, see [data-privacy-model.md](data-privacy-model.md).

## Runtime layers

| Layer             | Where it lives                                | Responsibility                                                                               |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Routes            | `app/`                                        | File-system routes (Expo Router). Public, `(auth)`, `(app)` protected.                       |
| Screens           | `app/.../*.tsx`, `src/features/**`            | Route files stay thin; tested screen bodies live under `src/` when practical.                |
| Feature modules   | `src/features/{name}/`                        | Module-owned: schemas, types, repository, queries, components.                               |
| Shared components | `src/components/app/`                         | App-owned cross-feature UI: screen states, toast, error boundary, header, sidebar.           |
| UI primitives     | `src/components/react-native-reusables/`      | Generated React Native Reusables (do not edit casually).                                     |
| Providers         | `src/providers/`                              | App-wide context: session, i18n, root provider tree.                                         |
| Stores            | `src/stores/`                                 | Zustand for local UI state (sidebar, theme, toast, draft, cookie consent).                   |
| Library           | `src/lib/`, `lib/`                            | Supabase client, env validation, notifications, theme, `cn()` utility.                       |
| Utilities         | `src/utils/`                                  | Pure, dependency-free helpers (dates, numbers, uuid validity). Hooks belong in `src/lib/`.   |
| Backend           | `supabase/migrations/`, `supabase/functions/` | Postgres schema, RLS, RPCs, edge functions. See [supabase/README.md](../supabase/README.md). |
| Edge functions    | `functions/`, `supabase/functions/`           | Web push reminder delivery.                                                                  |

## Provider Tree

[app/\_layout.tsx](../app/_layout.tsx) is the root:

```
AppProviders                          (src/providers/app-providers.tsx)
├── SafeAreaProvider
├── QueryClientProvider               (TanStack Query: staleTime 60s, retry 1)
├── I18nProvider                      (i18next; persists to AsyncStorage; syncs to user_preferences.language)
└── SessionProvider                   (subscribes to Supabase onAuthStateChange)
    └── ThemeProvider                 (expo-router, NAV_THEME from lib/theme.ts)
        └── AppErrorBoundary
            └── AppShell              (header + Stack + sidebar)
                + CookieConsentBanner
                + AppToast
                + PortalHost          (@rn-primitives/portal target)
```

`AppProviders` runs `validateRequiredEnv()` and `registerWebPushServiceWorker()` once on mount. Required env vars are listed in [README.md](../README.md#quick-start).

## Routes

Top-level route zones inside [app/](../app/):

```
app/
├── index.tsx              landing entry
├── privacy.tsx            public
├── terms.tsx              public
├── cookies.tsx            public
├── crisis.tsx             public
├── account-deletion.tsx   public
├── (auth)/                sign-up, verify-email, reset-password, update-password, auth-callback
└── (app)/                 protected app shell
    ├── index.tsx          home (Today)
    ├── settings.tsx       settings
    ├── cbt/               index, learn, new, [id], history
    ├── tools/             mood-tracker, journal, mindfulness, gratitude-log (working); act, meditation (placeholders)
    ├── legal.tsx
    └── support.tsx
```

Public routes stay reachable without sign-in. The `(app)` group is gated by [src/providers/session-provider.tsx](../src/providers/session-provider.tsx).

## Authentication

[src/lib/supabase.ts](../src/lib/supabase.ts) creates one client. Two key choices:

- **Platform storage:** web uses `localStorage`; native uses `expo-secure-store`.
- **Chunked native auth storage:** `src/lib/secure-store-storage.ts` splits oversized session values across SecureStore keys.
- **The session is pinned to the device it was written on.** Every SecureStore write passes `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`, because on iOS any Keychain item that is _not_ `*ThisDeviceOnly` travels in an encrypted iTunes/Finder backup **and restores onto a different device** — a backup plus its password would otherwise yield a live refresh token, and behind it the account and every entry the user has written.

  **Expected consequence, not a bug:** an iOS user who restores a backup onto a new phone is **signed out and must sign in again**. Support should treat "I restored my iPhone and got logged out" as working-as-intended, not as data loss — nothing is lost, because entries live server-side. Android is unaffected: `keychainAccessible` applies on iOS and is ignored elsewhere.

- **`detectSessionInUrl: false`.** The app handles callback URLs explicitly through `app/(auth)/auth-callback.tsx` and `src/features/auth/callback.ts` instead of letting Supabase auto-parse the URL. This makes Expo Router + deep linking + OAuth + recovery flows behave consistently across platforms.

`requireSupabase()` is the call-site helper that throws if the client is `null` (i.e., env vars missing). All repository code uses it - no caller hand-rolls null checks.

On native, [`initializeSupabaseAutoRefresh()`](../src/lib/supabase.ts) wires `AppState` so token refresh pauses in background and resumes in foreground.

### Sign-In Path

1. The user submits [src/components/app/sign-in-form.tsx](../src/components/app/sign-in-form.tsx) or starts Google OAuth.
2. Supabase redirects to the configured callback URL. Allowed callbacks per environment:
   - Web: `http://localhost:8081/auth-callback` (dev) or `https://selftend.org/auth-callback` (prod)
   - Android dev build: `selftend-dev://auth-callback`
   - Production native: `selftend://auth-callback`
3. `app/(auth)/auth-callback.tsx` calls `completeAuthRedirect(url)` from [src/features/auth/callback.ts](../src/features/auth/callback.ts).
4. `completeAuthRedirect` parses both query and hash params and chooses one of three completion paths:
   - **OAuth code exchange:** `code` param → `auth.exchangeCodeForSession(code)`
   - **Email OTP:** `token_hash` + `type` → `auth.verifyOtp(...)`
   - **Implicit flow:** `access_token` + `refresh_token` → `auth.setSession(...)`
5. The function returns `"authenticated" | "confirmed" | "password-recovery"` for route navigation.
6. `SessionProvider` receives the new session and `(app)` becomes accessible.

If you change auth, also update the redirect allow-list in the Supabase project. See [docs/deployment.md](deployment.md) and [docs/android-development.md](android-development.md).

## Data layer

Persistent modules follow the CBT shape:

```
src/features/cbt/
├── types.ts          TypeScript types (camelCase)
├── schemas.ts        Zod validation schemas
├── schemas.test.ts   Schema tests
├── repository.ts     Supabase queries: list, get, save, archive
├── queries.ts        TanStack Query hooks wrapping the repository
└── *-screen.tsx      Tested screen components used by thin Expo Router files
```

Flow:

1. **Component** calls a TanStack Query hook from `queries.ts`.
2. **Hook** wraps a `repository.ts` function and tags the result with a stable query key.
3. **Repository** calls `requireSupabase()`, runs the query, and maps `snake_case` rows to `camelCase` domain objects. Errors are thrown, never swallowed.
4. **Mutation hooks** invalidate the relevant query keys on success (see `useSaveThoughtRecord` in [queries.ts](../src/features/cbt/queries.ts) for a working example).
5. **RLS** enforces user-ownership server-side. Even if the repository forgot to filter by `user_id`, Postgres RLS blocks cross-user reads. Repository code still includes `.eq("user_id", userId)` for clarity and so the query plan uses indexes.

For new modules, see the module contract in [docs/modules/tools.md](modules/tools.md).

### Free-text sanitization (layering rule)

All user-typed prose is sanitized before storage by `sanitizeUserText`
([src/utils/sanitize-text.ts](../src/utils/sanitize-text.ts)): NBSP → space,
zero-width characters and C0 controls stripped (tab/newline kept, CRLF
normalized), unpaired UTF-16 surrogates dropped. It is applied at exactly ONE
layer per field, on WRITE paths only:

- **Zod-validated flows** (a form resolver parses before save): build the field
  with `userText(max, ...)` from [src/lib/zod-fields.ts](../src/lib/zod-fields.ts) -
  its `.transform` sanitizes, so the repository receives clean text and must not
  re-sanitize.
- **Everything else** (saves that bypass schemas - e.g. mood, journal,
  gratitude, habits, ACT): call `sanitizeUserText` in the feature repository's
  create/update, on the write payload.
- **Never on READ**: mappers (`map*` row → domain) must return stored text
  verbatim. Sanitizing reads would silently rewrite user content on display and
  mask write-path bugs.
- Length caps and sanitize ordering: slice/truncate FIRST, then sanitize - a
  slice applied after sanitizing can bisect an emoji at the boundary and
  reintroduce exactly the unpaired surrogate being removed.

### Wizard draft persistence contract

Multi-step wizard flows persist in-progress drafts via
[src/stores/create-wizard-draft-store.ts](../src/stores/create-wizard-draft-store.ts)
(zustand `persist` on AsyncStorage; consumed through
[src/lib/use-wizard-draft.ts](../src/lib/use-wizard-draft.ts)):

- **Key scheme:** `selftend:wizard-draft:<flowKey>` - one draft per flow key
  (`cbt-thought-record`, `act-defusion`, `goal`, `core-belief`,
  `procrastination-task`, `exposure-hierarchy`). One mode+entityId draft at a
  time; switching wipes the previous draft.
- **TTL:** drafts older than 24h are dropped at rehydrate (and their disk copy
  removed - drafts are PHI).
- **Versioning:** the persisted envelope carries a `version`; bump
  `WIZARD_DRAFT_PERSIST_VERSION` whenever the persisted shape changes
  incompatibly - there is deliberately no migrate function (a lost draft beats a
  wrongly-migrated one feeding a zod resolver).
- **Sign-out wipes disk:** `resetAllDraftStores()` (session provider on
  SIGNED_OUT) clears both memory state and the persisted copies.
- **User-controlled cleanup:** long-form screens expose a confirmed discard
  action. A successful save also clears both memory and disk before navigation.
- **Zustand + persist gotcha:** the middleware makes `set()` return the storage
  write's promise. Store action bodies use braces (return `void`) so callers -
  including `act()` in tests - never receive a stray thenable. Keep new actions
  braced.

## Field-level encryption layer

All user-entered text fields are encrypted at rest. The pattern is **encrypt-on-write / decrypt-on-read in the database**:

- **Storage:** Each table that holds user content is backed by a `*_data` base table whose text columns store `bytea` ciphertext. A same-named decrypting **view** (with `security_invoker = true` so RLS still applies) presents plaintext to the client via `INSTEAD OF INSERT/UPDATE` triggers that encrypt on write.
- **Key management:** The app encryption key lives as a secret in **Supabase Vault**. Its root key is held outside the database, so a full database dump or backup yields only ciphertext. The key is read exclusively inside `SECURITY DEFINER` helper functions (`app.encrypt_text` / `app.decrypt_text`) pinned to `set search_path = pg_catalog, public`, and is never inlined in client-issued SQL or exposed to query logs / `pg_stat_statements`.
- **Crypto primitive:** `pgcrypto` (`pgp_sym_encrypt` / `pgp_sym_decrypt`) - standard, not deprecated.
- **EXECUTE grants:** `REVOKE EXECUTE ... FROM public, anon; GRANT EXECUTE ... TO authenticated` on the helper functions, mirroring the existing hardening conventions.
- **Client transparency:** Repository code (`src/features/*/repository.ts`) reads and writes through the named view; the encryption boundary is invisible to the application layer.
- **GDPR export:** `export_user_data()` reads through the decrypting views so the export is plaintext for the owner.
- **`profiles.email` is intentionally plaintext** (synced from `auth.users`; encrypting it is a documented Supabase footgun). `profiles.display_name` is encrypted.

The system is **provider-recoverable** (not zero-knowledge): the operator can decrypt, and forgot-password recovery works normally. The protection is breach-resilience - a leaked database backup cannot expose user content.

## Android launcher widgets

Android exposes one reconfigurable `SelftendCard` provider. Each placed instance selects one
of the 27 Home card IDs and stores its own card, theme, and opacity configuration. The app
builds a pre-localized snapshot from the same React Query data used by Home, then the native
widget layer renders the selected card with `react-native-android-widget` primitives.

The CBT and ACT programme replicas preserve the Home cards' three states: review before
enrollment, current programme goals with deep links while enrolled, and completion guidance.
Programme enrollment is never triggered from the launcher widget. Adding or changing a
provider still requires a native Android rebuild; card payload and replica changes do not.

## Reminders: native vs. web

Native (Android, iOS):

- Schedules **locally on device**. The OS triggers them; no server roundtrip.
- The scheduled notification ID is stored in SecureStore (key `selftend:cbt-reminder-id`) so it can be canceled when the user disables reminders.
- See [src/lib/notifications.ts](../src/lib/notifications.ts).

Web:

- Uses the browser **Push API** plus a service worker registered at `/selftend-push-worker.js`.
- The browser subscription endpoint and keys are stored in the `web_push_subscriptions` table (per browser, not per user).
- A scheduled **Supabase Edge Function** (`send-web-reminders`) runs on a Vault-stored cron secret and sends pushes to subscribed endpoints whose local-time matches.
- iOS Safari requires the user to add the site to the Home Screen before web push works - this is documented at the consent surface.

Controls are shared; delivery differs. Reminder copy/consent usually changes one surface. Reminder scheduling changes both.

## i18n

[src/i18n/index.ts](../src/i18n/index.ts) configures i18next. `I18nProvider` exposes `useLanguage()`:

- Reads the persisted language from AsyncStorage (key `selftend:language`).
- Falls back to `expo-localization`.
- On change, persists to AsyncStorage _and_ writes to `user_preferences.language` in Supabase.

Components use `useTranslation("namespace")` and `t("key")`. Policy screens use `t(sectionKey, { returnObjects: true })` to load arrays of section content from JSON. The seven namespaces are defined in [stack.md](stack.md#internationalization-i18n).

Direct imports of `i18n.t(...)` are reserved for non-component code (utility functions, validation). Components should use the hook so re-render-on-language-change works.

## Theme And Color Scheme

- [`src/lib/theme/`](../src/lib/theme/) is the single source of truth for the colour tokens. `contract.ts` lists the 20 variable names a palette fills per scheme; `styles.ts` holds the palettes themselves; `derive.ts` fills the contract from six core hexes for palettes that don't hand-author all twenty.
- `global.css` carries a static copy of the default palette's light/dark pair. Its only job is the first paint, before any JS runs — `test/theme-contract.test.ts` fails the build if that copy drifts from the contract in either direction.
- Two things sit outside the contract on purpose: `--radius` (one global constant — colour is the only thing a palette varies) and the eight module hues, which are a pinned encoding palette in [`src/lib/design-tokens.ts`](../src/lib/design-tokens.ts) rather than theme tokens. A third, `--accent-ink`, was deleted in #589 along with the per-module chrome it existed for.
- `lib/theme.ts` projects the contract for consumers a CSS class cannot reach: `NAV_THEME` (React Navigation), `THEME` (`hsl()` strings for gradients, SVG, `ActivityIndicator`), and `CARD_COLOR` / `POPOVER_COLOR` (raw hex).
- `lib/theme.ts` also exports `THEME_VARIABLES`, which applies the token values through NativeWind `vars()` at the root layout so native builds can resolve classes like `bg-background` and `text-foreground`.
- `tailwind.config.js` maps the same variable names to NativeWind classes.
- `src/lib/color-scheme.ts` resolves the user's preference (light / dark / system) to an active scheme. It exports two hooks with distinct jobs:
  - `useColorSchemeName()` is the house reader — pure, always `"light"` or `"dark"`, no effects or storage access. Any component may call it, as often as it likes.
  - `useColorSchemeDriver()` owns the side effects (hydrating the stored preference, pushing it into NativeWind), returns `void`, and is called exactly once, in `app/_layout.tsx`.
- `src/stores/theme-store.ts` persists the choice.

NativeWind and React Navigation both receive the active scheme from the root layout.

## Error handling

[src/components/app/app-error-boundary.tsx](../src/components/app/app-error-boundary.tsx) catches render errors anywhere inside the shell and shows a calm fallback. It sits **inside** the providers so the fallback can use i18n.

Repository errors bubble to TanStack Query. Screens use `src/components/app/screen-state.tsx` for loading/empty/error states. Failed saves use `src/stores/toast-store.ts` and keep unsaved input in place.

## Adding A Module

When a placeholder route becomes real, add:

1. `src/features/{name}/types.ts` - types
2. `src/features/{name}/schemas.ts` (+ `.test.ts`) - Zod validation
3. `src/features/{name}/repository.ts` - Supabase queries with `requireSupabase()`
4. `src/features/{name}/queries.ts` - TanStack Query hooks
5. A migration in `supabase/migrations/` - table, RLS policies, ownership column, export coverage update, deletion coverage update
6. Screens under `app/(app)/{name}/` that use the queries
7. i18n keys in all seven namespaces, in every supported locale
8. At least one schema/repository test and one component-state test
9. A spec at `docs/modules/{name}.md` covering [modules/tools.md](modules/tools.md)

The module is not real until export and deletion include its data.

## Platform Differences

- **Storage:** localStorage on web, SecureStore on native (auth tokens, chunked when a session value is too large for one SecureStore entry). On **iOS** the session is device-bound, so restoring a backup onto a new phone requires signing in again — see [Authentication](#authentication).
- **Reminders:** local OS notifications on native, Push API + edge function on web.
- **Auth callback URLs:** different per environment, allow-listed in Supabase.
- **Auto-refresh:** `AppState`-driven on native, browser-driven on web.
- **OAuth UX:** native uses `expo-web-browser`; web uses standard redirects.

Everything else should stay shared where practical.

## Pointers

- Stack details: [stack.md](stack.md)
- Data classes and privacy rules: [data-privacy-model.md](data-privacy-model.md)
- Module contract: [modules/tools.md](modules/tools.md)
- CBT spec: [modules/cbt.md](modules/cbt.md)
- Backend schema and migrations: [supabase/README.md](../supabase/README.md)
- Android dev runbook: [android-development.md](android-development.md)
- Web deploy: [deployment.md](deployment.md)

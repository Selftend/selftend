# Architecture

Last updated: 2026-05-07

A practical map of how a request flows through the app. For _what_ the stack uses, see [stack.md](stack.md). For _what_ gets stored, see [data-privacy-model.md](data-privacy-model.md). This file is the _how it fits together_ view.

## Runtime layers

| Layer             | Where it lives                                | Responsibility                                                                               |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Routes            | `app/`                                        | File-system routes (Expo Router). Public, `(auth)`, `(app)` protected.                       |
| Screens           | `app/.../*.tsx`                               | Wire route to feature components, mostly thin.                                               |
| Feature modules   | `src/features/{name}/`                        | Module-owned: schemas, types, repository, queries, components.                               |
| Shared components | `src/components/`, `components/`              | Cross-feature UI: screen states, toast, error boundary, header, sidebar.                     |
| UI primitives     | `components/ui/`                              | Generated React Native Reusables (do not edit casually).                                     |
| Providers         | `src/providers/`                              | App-wide context: session, i18n, root provider tree.                                         |
| Stores            | `src/stores/`                                 | Zustand for local UI state (sidebar, theme, toast, draft, cookie consent).                   |
| Library           | `src/lib/`, `lib/`                            | Supabase client, env validation, notifications, theme, `cn()` utility.                       |
| Backend           | `supabase/migrations/`, `supabase/functions/` | Postgres schema, RLS, RPCs, edge functions. See [supabase/README.md](../supabase/README.md). |
| Edge functions    | `functions/`, `supabase/functions/`           | Web push reminder delivery.                                                                  |

## Provider tree

[app/\_layout.tsx](../app/_layout.tsx) is the root. The provider order, outermost first:

```
AppProviders                          (src/providers/app-providers.tsx)
├── SafeAreaProvider
├── QueryClientProvider               (TanStack Query: staleTime 60s, retry 1)
├── I18nProvider                      (i18next; persists to AsyncStorage; syncs to user_preferences.language)
└── SessionProvider                   (subscribes to Supabase onAuthStateChange)
    └── ThemeProvider                 (@react-navigation/native, NAV_THEME from lib/theme.ts)
        └── AppErrorBoundary
            └── AppShell              (header + Stack + sidebar)
                + CookieConsentBanner
                + AppToast
                + PortalHost          (@rn-primitives/portal target)
```

`AppProviders` runs `validateRequiredEnv()` and `registerWebPushServiceWorker()` once on mount. Required env vars are listed in [README.md](../README.md#quick-start).

## Routes

The router has three top-level zones inside [app/](../app/):

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
    ├── (tabs)/            index (home), settings
    ├── cbt/               index, learn, new, [id], history
    ├── tools/             act, gratitude-log, meditation, mood-tracker (placeholders)
    ├── history.tsx        compatibility redirect to cbt/history
    ├── legal.tsx
    └── support.tsx
```

Public routes are intentionally accessible without sign-in so policy and crisis surfaces remain reachable. The `(app)` group is gated by [src/providers/session-provider.tsx](../src/providers/session-provider.tsx) — components inside it use `useSession()` and redirect when there is no session.

## Authentication

### The Supabase client

[src/lib/supabase.ts](../src/lib/supabase.ts) creates one client. Two key choices:

- **Storage adapter is platform-conditional.** Web uses `localStorage`; native uses `expo-secure-store`. This keeps native session tokens out of plaintext storage.
- **Native auth storage chunks large values.** Supabase session JSON can exceed Expo SecureStore's single-value warning threshold, so `src/lib/secure-store-storage.ts` splits oversized native auth values across SecureStore keys and reassembles them on read.
- **`detectSessionInUrl: false`.** The app handles callback URLs explicitly through `app/(auth)/auth-callback.tsx` and `src/features/auth/callback.ts` instead of letting Supabase auto-parse the URL. This makes Expo Router + deep linking + magic-link + OAuth + recovery flows behave consistently across platforms.

`requireSupabase()` is the call-site helper that throws if the client is `null` (i.e., env vars missing). All repository code uses it — no caller hand-rolls null checks.

On native, [`initializeSupabaseAutoRefresh()`](../src/lib/supabase.ts) wires `AppState` so token refresh pauses when the app goes to background and resumes on foreground. Web does not need this; the browser handles tab visibility differently.

### The sign-in path

1. User submits the form in [components/sign-in-form.tsx](../components/sign-in-form.tsx) or starts a Google OAuth flow.
2. Supabase redirects to the configured callback URL. Allowed callbacks per environment:
   - Web: `http://localhost:8081/auth-callback` (dev) or `https://selftend.org/auth-callback` (prod)
   - Android dev build: `selftend-dev://auth-callback`
   - Production native: `selftend://auth-callback`
3. The callback route at [app/(auth)/auth-callback.tsx](<../app/(auth)/auth-callback.tsx>) calls `completeAuthRedirect(url)` from [src/features/auth/callback.ts](../src/features/auth/callback.ts).
4. `completeAuthRedirect` parses both query and hash params and chooses one of three completion paths:
   - **OAuth code exchange:** `code` param → `auth.exchangeCodeForSession(code)`
   - **Email OTP:** `token_hash` + `type` → `auth.verifyOtp(...)`
   - **Implicit flow:** `access_token` + `refresh_token` → `auth.setSession(...)`
5. The function returns `"authenticated" | "confirmed" | "password-recovery"` so the route can navigate appropriately.
6. `SessionProvider`'s `onAuthStateChange` subscription fires, the new session lands in context, and `(app)` becomes accessible.

If you change auth, also update the redirect allow-list in the Supabase project. See [docs/deployment.md](deployment.md) and [docs/android-development.md](android-development.md).

## Data layer

The CBT feature is the canonical example. Every persistent module should follow the same shape.

```
src/features/cbt/
├── types.ts          TypeScript types (camelCase)
├── schemas.ts        Zod validation schemas
├── schemas.test.ts   Schema tests
├── repository.ts     Supabase queries: list, get, save, archive
└── queries.ts        TanStack Query hooks wrapping the repository
```

Pattern, end to end:

1. **Component** calls a TanStack Query hook from `queries.ts`.
2. **Hook** wraps a `repository.ts` function and tags the result with a stable query key.
3. **Repository** calls `requireSupabase()`, runs the query, and maps `snake_case` rows to `camelCase` domain objects. Errors are thrown, never swallowed.
4. **Mutation hooks** invalidate the relevant query keys on success (see `useSaveThoughtRecord` in [queries.ts](../src/features/cbt/queries.ts) for a working example).
5. **RLS** enforces user-ownership server-side. Even if the repository forgot to filter by `user_id`, Postgres RLS blocks cross-user reads. Repository code still includes `.eq("user_id", userId)` for clarity and so the query plan uses indexes.

Why this layering matters:

- The repository is testable without React.
- The hooks are the only thing components touch; cache invalidation is centralized.
- Replacing Supabase with another backend would mean rewriting `repository.ts` files, not the screens.

For new modules, see the module contract in [docs/modules/tools.md](modules/tools.md).

## Reminders: native vs. web

Reminders are the most divergent surface in the app.

### Native (Android, iOS)

- Uses `expo-notifications`.
- Schedules **locally on device**. The OS triggers them; no server roundtrip.
- The scheduled notification ID is stored in SecureStore (key `selftend:cbt-reminder-id`) so it can be canceled when the user disables reminders.
- See [src/lib/notifications.ts](../src/lib/notifications.ts).

### Web

- Uses the browser **Push API** plus a service worker registered at `/selftend-push-worker.js`.
- The browser subscription endpoint and keys are stored in the `web_push_subscriptions` table (per browser, not per user).
- A scheduled **Supabase Edge Function** (`send-web-reminders`) runs on a Vault-stored cron secret and sends pushes to subscribed endpoints whose local-time matches.
- iOS Safari requires the user to add the site to the Home Screen before web push works — this is documented at the consent surface.

The user-facing controls are the same on both platforms; the underlying mechanism differs. If you change reminder copy or consent UI, you change one place. If you change how reminders fire, you touch both paths.

## i18n

[src/i18n/index.ts](../src/i18n/index.ts) configures i18next at module load. The `I18nProvider` exposes a `useLanguage()` hook that:

- Reads the persisted language from AsyncStorage (key `selftend:language`).
- Falls back to `expo-localization`.
- On change, persists to AsyncStorage _and_ writes to `user_preferences.language` in Supabase.

Components use `useTranslation("namespace")` and `t("key")`. Policy screens use `t(sectionKey, { returnObjects: true })` to load arrays of section content from JSON. The seven namespaces are defined in [stack.md](stack.md#internationalization-i18n).

Direct imports of `i18n.t(...)` are reserved for non-component code (utility functions, validation). Components should use the hook so re-render-on-language-change works.

## Theme and color scheme

- `lib/theme.ts` exports `NAV_THEME` (React Navigation theme) and the brand tokens.
- `lib/theme.ts` also exports `THEME_VARIABLES`, which applies the same token values through NativeWind `vars()` at the root layout so native builds can resolve classes like `bg-background` and `text-foreground`.
- `tailwind.config.js` mirrors the same tokens for NativeWind classes.
- `src/lib/color-scheme.ts` resolves the user's preference (light / dark / system) to an active scheme.
- `src/stores/theme-store.ts` persists the choice.

Two libraries see the color scheme: NativeWind (via `useColorScheme()`) and React Navigation (via `ThemeProvider`). The root layout keeps them in sync — see the `useEffect` hook in [app/\_layout.tsx](../app/_layout.tsx).

## Error handling

[src/components/app-error-boundary.tsx](../src/components/app-error-boundary.tsx) catches render errors anywhere inside the shell and shows a calm fallback. It sits **inside** the providers so the fallback can use i18n.

Repository errors thrown from Supabase calls bubble up to TanStack Query, which exposes them as `error` on the relevant hook. Screens use the shared `ScreenState` patterns in `src/components/screen-state.tsx` to render loading/empty/error states consistently. Failed save mutations are surfaced through the toast store (`src/stores/toast-store.ts`) so the form keeps unsaved input in place — see the online-first draft rule in [data-privacy-model.md](data-privacy-model.md).

## Adding a new module: minimum file set

When you graduate a placeholder route from `app/(app)/tools/` into a real module, the minimum is:

1. `src/features/{name}/types.ts` — types
2. `src/features/{name}/schemas.ts` (+ `.test.ts`) — Zod validation
3. `src/features/{name}/repository.ts` — Supabase queries with `requireSupabase()`
4. `src/features/{name}/queries.ts` — TanStack Query hooks
5. A migration in `supabase/migrations/` — table, RLS policies, ownership column, export coverage update, deletion coverage update
6. Screens under `app/(app)/{name}/` that use the queries
7. i18n keys in all seven namespaces, in every supported locale
8. At least one schema/repository test and one component-state test
9. A spec at `docs/modules/{name}.md` covering the module-contract items in [docs/modules/tools.md](modules/tools.md)

The module is not "real" until export and deletion include its data. That is the line between a placeholder and a shipped module.

## Where things deliberately diverge

- **Storage:** localStorage on web, SecureStore on native (auth tokens, chunked when a session value is too large for one SecureStore entry).
- **Reminders:** local OS notifications on native, Push API + edge function on web.
- **Auth callback URLs:** different per environment, allow-listed in Supabase.
- **Auto-refresh:** `AppState`-driven on native, browser-driven on web.
- **OAuth UX:** native uses `expo-web-browser`; web uses standard redirects.

Almost everything else — data layer, i18n, theme, components, error states — is the same code path on both surfaces. When you add a feature, write it once and verify on both web and an Android dev build.

## Pointers

- Stack details: [stack.md](stack.md)
- Data classes and privacy rules: [data-privacy-model.md](data-privacy-model.md)
- Module contract: [modules/tools.md](modules/tools.md)
- CBT spec: [modules/cbt.md](modules/cbt.md)
- Backend schema and migrations: [supabase/README.md](../supabase/README.md)
- Android dev runbook: [android-development.md](android-development.md)
- Web deploy: [deployment.md](deployment.md)

# Renaming `/tools/mood-tracker` → `/tools/check-in`: complete reference inventory

> Research for [wayfinder ticket #694](https://github.com/Selftend/selftend/issues/694) (part of
> [#689](https://github.com/Selftend/selftend/issues/689)), resolved 2026-08-07. Reading exercise
> only — no application code was changed. Line numbers are against `dev` at `90bcf6ab`.

## Headline

**94 occurrences of the literal `mood-tracker` across 50 git-tracked files** — 24 of those files are
production source (the rest are 19 test files and 7 docs). Separately, the widget card ids
`mood-checkin` / `mood-trend` appear **104 times across 32 files**.

Of everything below, **five entries are genuinely persisted** — and only **two** of those are written
by a shipped build in a way a rename would orphan. Neither of those two is touched by renaming the
route.

The two id spaces are separable, and that is the main finding:

- The **route path** (`/tools/mood-tracker`) is almost never persisted. It is minted fresh at
  render or send time from constants in the repo.
- The **module key** (`mood`) and the **widget card ids** (`mood-checkin`, `mood-trend`) _are_
  persisted, in a database and on-device — but those are a **separate rename** from the route.
  Renaming the route alone touches none of them.

---

## Bucket (a) — Compile-time references

A rename touches these and TypeScript or ESLint catches a miss. `experiments.typedRoutes: true` is
set (`app.config.ts:296-297`), so every value typed as `expo-router`'s `Href` is checked against the
generated `.expo/types/router.d.ts`.

### Route files (the rename itself)

| Path                                          | Note                                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| `app/(app)/tools/mood-tracker/index.tsx`      | re-exports `@/src/features/mood/mood-tracker-screen` |
| `app/(app)/tools/mood-tracker/new.tsx`        | `fallbackHref="/tools/mood-tracker"` at `:4`         |
| `app/(app)/tools/mood-tracker/[id]/index.tsx` |                                                      |
| `app/(app)/tools/mood-tracker/[id]/edit.tsx`  | `fallbackHref` at `:11`                              |

Renaming the directory regenerates `.expo/types/router.d.ts` (3 occurrences), which is what makes
every `Href`-typed site below fail to compile until it is updated. That file is generated, gitignored
build output — not a reference to fix by hand.

### `Href`-typed constants — the compiler will flag these

| Site                                               | Value                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/features/tools/tools-screen.tsx:47`           | `href: "/tools/mood-tracker"` (`href: Href` at `:38`)                                |
| `src/components/app/sidebar-nav.tsx:80`            | `href: "/tools/mood-tracker"` (`href: Href` at `:18`)                                |
| `src/features/routines/tool-routes.ts:19`          | `mood: "/tools/mood-tracker/new"` in `Record<SteppableToolId, Href>`                 |
| `src/features/cbt/program-definition.ts:99`        | `route: "/tools/mood-tracker/new"` on `DAILY_NOTICING`                               |
| `src/features/cbt/cbt-home/cbt-home-config.ts:187` | `route: "/tools/mood-tracker"`                                                       |
| `src/features/mood/mood-entry-card.tsx:40`         | `router.push(\`/tools/mood-tracker/${entry.id}\`)` — template literal, still checked |

### Source directory and i18n namespace

`src/features/mood/` (33 files) and the i18n namespace `mood`
(`src/i18n/index.ts:11,40,64`; `src/i18n/locales/{en,bg}/mood.json`) are **compile-time only**. The
namespace name never leaves the bundle — `useTranslation("mood")` resolves against the imported JSON
object, and 11 files call it. Renaming either is a pure refactor with zero migration cost. Note
`mood.json` already has a top-level `checkin` key, so the vocabulary shift is partly done.

**Verdict: `src/features/mood/` and the `mood` namespace are in play but free.** They are also fully
independent of the route rename — either can move without the other.

### Guard tests that hard-code file paths

`test/module-identity-neutral.test.ts:136-137` pins the literal strings
`"src/features/home/widgets/mood-checkin-widget.tsx"` and `".../mood-trend-widget.tsx"` in an
allowlist it reads off disk. Renaming _those files_ fails the suite loudly — which is the desired
behaviour, but it is a site to update rather than discover. (`test/accent-ink-call-sites.test.ts:213`
mentions `mood-tracker-screen.tsx` in a comment only.)

---

## Bucket (b) — Runtime strings

Resolved at runtime. A miss is a silent dead link, a missing label, or a no-op — never a build
failure. **This is where the real risk of a sloppy rename lives**, because nothing catches these.

### Casts that defeat the type checker

Four sites cast away the `Href` type, so `typedRoutes` does **not** protect them:

| Site                                                 | Value                                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/features/mood/mood-tracker-screen.tsx:311`      | `` `/tools/mood-tracker/new?score=${score}` as Parameters<typeof router.push>[0] `` |
| `src/features/mood/mood-entry-editor-screen.tsx:253` | `` `/tools/mood-tracker/${saved.id}` as Parameters<typeof router.replace>[0] ``     |
| `src/features/mood/mood-detail-screen.tsx:64`        | `"/tools/mood-tracker" as Parameters<typeof router.replace>[0]`                     |
| `app/(app)/modules/cbt/activities/[id].tsx:136`      | `` `/tools/mood-tracker/new?linkedStrategy=...` as Parameters<...> ``               |

### String-keyed lookups

| Site                                          | Why it is a runtime string                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/breadcrumbs.ts:56-57`                | `STATIC_ROUTES: Record<string, string>` (`:7`) — keyed by literal path. A miss = no breadcrumb label, silently.                |
| `src/components/app/sidebar-nav.tsx:82`       | `matchPrefix: "/tools/mood-tracker"`, typed `string \| null` (`:20`) — a miss = the nav item never highlights as active.       |
| `src/components/app/protected-layout.tsx:212` | `<Stack.Screen name="tools/mood-tracker/index" />` — `name` is a plain string.                                                 |
| `src/lib/notifications.ts:98`                 | `ALLOWED_REMINDER_ROUTES` — a `Set<string>` allowlist. See Q1; this is the single most dangerous entry in the whole inventory. |

### Widget click paths (rendered fresh each time)

| Site                                                   | Value                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/features/widgets/snapshot-builder.ts:203`         | `openCta(t, "/tools/mood-tracker")`                                      |
| `src/features/widgets/cards/kit.tsx:299`               | ``clickActionData={{ path: `/tools/mood-tracker/new?score=${i + 1}` }}`` |
| `src/features/home/widgets/mood-trend-widget.tsx:62`   | `router.push("/tools/mood-tracker")`                                     |
| `src/features/home/widgets/mood-checkin-widget.tsx:40` | ``router.push(`/tools/mood-tracker/new?score=${score}`)``                |
| `src/features/widgets/snapshot-types.ts:8`             | doc-comment example only                                                 |

### Server-side (Deno edge function)

| Site                                              | Value                                             |
| ------------------------------------------------- | ------------------------------------------------- |
| `supabase/functions/_shared/web-reminders.ts:153` | `TARGET_CONFIGS.mood.url = "/tools/mood-tracker"` |

This is a **separate deploy** from the app. It is the _only_ place a reminder URL originates
(`src/lib/notifications.ts:89-91` says so explicitly), and it is read at **send** time — see Q1.

### Test and tooling strings

19 test files (Jest + Playwright e2e), plus:

- `.maestro/app-store-screenshots.yaml:171` — `link: ${APP_LINK}tools/mood-tracker` (scheme deep link)
- `docs/campaign/capture/shoot.js:81` — `https://selftend.org/tools/mood-tracker/new`
- `scripts/e2e-web-server.js:76` — comment only
- Docs: `docs/architecture.md:58`, `docs/modules/tools.md:48`, `docs/modules/journaling.md:3`,
  `docs/modules/cbt-doc-reconciliation.md:79,144`, `docs/campaign/capture/shots.md:23`,
  `docs/security-optimization-audit-2026-06-01.md` (3, historical audit — leave alone)

---

## Bucket (c) — Persisted values

Already written to a device, a database row, or an OS queue by a shipped build. **These are the
entries that decide the migration cost.**

### c1. `widget_preferences.widget_id` — server-side, holds `mood-checkin` / `mood-trend`

- **Where it lives:** Supabase, `public.widget_preferences (user_id, widget_id TEXT NOT NULL, position)`,
  `UNIQUE (user_id, widget_id)` — `supabase/migrations/20260539_widget_preferences.sql:4,7`.
- **Who wrote it:** every shipped build. The onboarding wizard seeds it
  (`src/components/app/app-onboarding-wizard.tsx:112` hard-codes `"mood-checkin"` into the default
  set), the recommendation engine writes it
  (`src/features/onboarding/recommendations.ts:8-9`, `concerns.ts:19-24`), and the user's own home
  dashboard edits upsert into it (`src/features/home/widget-repository.ts`). The
  `apply_widget_recommendations` RPC bulk-inserts it
  (`supabase/migrations/20260707_apply_widget_recommendations.sql:35-38`).
- **No constraint, no FK, no enum** — `widget_id` is free `TEXT` validated only for blank/length
  (`:27-28`). The database will happily keep orphaned rows forever.
- **Survives a rename?** No. Rows saying `mood-checkin` would no longer match any registry entry
  (`src/features/home/widget-registry.tsx:77-92`) and the widget would vanish from the user's home
  dashboard. Needs a `UPDATE widget_preferences SET widget_id = ... WHERE widget_id = ...` backfill.
- **In play for a route rename?** **No.** This is the card-id namespace, not the route. Only at risk
  if the rename is widened to the module identifier.

### c2. `selftend.widgets.config.<androidWidgetId>` — on-device, holds `cardId`

- **Where it lives:** AsyncStorage on the device, key `` `selftend.widgets.config.${widgetId}` ``
  (`src/features/widgets/widget-config-store.ts:17`), value `{ theme, opacity, cardId }`.
  On web AsyncStorage is raw `localStorage`; on Android it is the app's sandboxed store.
- **Who wrote it:** the user, via the Android widget configuration screen
  (`src/features/widgets/widget-config-screen.tsx`), at the moment they placed a home-screen widget.
  Default is `cardId: "mood-checkin"` (`:14`, and the sanitizer fallback at `:38`).
- **Survives a rename?** No, and it **fails quietly**: `src/features/widgets/render-widget.tsx:25`
  does `cfg.cardId in CARD_REPLICAS ? ... : "mood-checkin"`, so an unknown stored id silently falls
  back — and if `mood-checkin` were the id being renamed, the fallback itself becomes dangling.
  The app never rewrites this key, so nothing self-heals it.
- **In play for a route rename?** **No** — same card-id namespace as c1.

### c3. `routine_steps.tool_id` — server-side, holds `mood`

- **Where it lives:** Supabase, `public.routine_steps.tool_id text not null`
  (`supabase/migrations/20260715_routines.sql:143`), constrained only to non-blank and ≤64 chars
  (`:147-148`). The migration header states the intent outright at `:11`:
  _"routine_steps is a plain table (tool_id is an app-defined identifier, not free text)"_.
- **Who wrote it:** the user, every time they saved a routine step
  (`src/features/routines/repository.ts:190` inserts `tool_id: toolId`).
- **Stores the id, not the path.** See Q2.
- **In play for a route rename?** **No.** This is exactly the indirection that makes the route rename
  cheap.

### c4. `user_preferences.reminder_prompted_tools` — server-side, holds `mood`

- **Where it lives:** Supabase, `text[] not null default '{}'` on `user_preferences`
  (`supabase/migrations/20260714_reminder_prompted_tools.sql:7`), exported by `export_user_data()`.
- **Who wrote it:** the app, when the one-time contextual reminder prompt was shown for a target
  (`src/features/notifications/reminder-prompt-card.tsx:38`). Values are `NotificationTargetKey`s —
  `"mood"`, `"cbt"`, … (`src/features/modules/types.ts:7-8`).
- **In play for a route rename?** **No** — module-key namespace.

### c5. Delivered push notifications sitting in the notification tray

- **Where it lives:** the OS notification shade / Notification Center, and (web) the service worker's
  delivered-notification list.
- **Who wrote it:** the `send-web-reminders` edge function, at send time, with
  `data: { url: "/tools/mood-tracker" }`
  (`supabase/functions/_shared/web-reminders.ts:566` reading `TARGET_CONFIGS[target].url`).
- **Survives a rename?** Yes — an undismissed notification keeps the old URL in its payload
  indefinitely. See Q1 for why this is small but non-zero.

### Not persisted, despite appearances

- **`selftend.widgets.snapshot.v1`** (`src/features/widgets/snapshot-store.ts:15`) does contain
  `openCta.path` / `Clickable.path` strings like `/tools/mood-tracker/new?score=3` in AsyncStorage.
  But it is **regenerated wholesale** from live data every app foreground
  (`src/features/widgets/use-widget-snapshot-sync.ts`) and version-gated (`SCHEMA_VERSION = 3`,
  `:20`; `readSnapshot` returns `null` on mismatch, `:31`). Bumping `SCHEMA_VERSION` discards every
  stale snapshot outright. **Self-healing — treat as bucket (b).**
- **The Android widget's rendered click path.** `widget-task-handler.tsx:23-27` reads
  `props.clickActionData.path` from the RemoteViews the launcher holds. That is stale until the next
  `WIDGET_UPDATE`, at which point it re-renders from the fresh snapshot. Bounded staleness, not
  orphaned data.
- **`user_preferences.enabled_modules`** holds only `cbt | meditation | gratitude | act`
  (`src/features/modules/types.ts` `VALID_MODULES`); `"mood"` is **not** a value. Not in play.
- **`user_preferences.shown_button_tours`.** `tourScope` is **dead code** —
  `src/components/app/module-home-header.tsx:60-64` documents it as _"No longer used: per-page button
  coach marks were removed… safe to drop in a future cleanup pass."_ The prop is accepted and
  ignored. `tourScope="mood"` (`mood-tracker-screen.tsx:180`) writes nothing.
- **`mood_logs`.** The table is referenced across ~20 migrations, `export_user_data()`, and the
  reminder suppression query (`web-reminders.ts:154`). It is **explicitly not in play** — a route
  rename does not touch a table name, and renaming it would be a far larger encrypted-table migration
  (`20260589_mood_logs_encrypt.sql`, `20260590_mood_logs_drop_plaintext.sql`) for zero user-visible
  benefit.
- **No OS-level deep-link declaration names this route.** iOS AASA restricts to `/auth-callback`
  only (`public/.well-known/apple-app-site-association`), and the Android `intentFilters` autoVerify
  block covers `pathPrefix: "/auth-callback"` only (`app.config.ts:200-207`). Nothing to migrate.

---

## The four questions

### Q1. Already-scheduled notifications — does a queued notification carry the old path?

**For this app: no, because this app schedules zero local notifications.** The generic Expo answer is
alarming, but it does not apply here. Both halves matter, so both are recorded.

**What Expo actually does** (verified against the installed `expo-notifications@57.0.6`, not just the
docs — the docs are silent on this):

- Content, including `data`, is **serialized at scheduling time** on both platforms. The app is never
  consulted at fire time. iOS builds the `UNNotificationRequest` immediately
  (`node_modules/expo-notifications/ios/ExpoNotifications/Notifications/Scheduling/SchedulerModule.swift:133-137`,
  handed to `UNUserNotificationCenter.current().add` at `:46`). Android Java-serializes the whole
  request into SharedPreferences before arming the alarm
  (`android/src/main/java/.../ExpoSchedulingDelegate.kt:66-67`,
  `SharedPreferencesNotificationsStore.kt:15-21`).
- **Android actively re-arms stale requests on app update.** The package manifest registers
  `MY_PACKAGE_REPLACED` (`android/src/main/AndroidManifest.xml:26`), which routes to
  `setupScheduledNotifications()` (`NotificationsService.kt:33-39,643-645,828-829`) and re-schedules
  every persisted request verbatim (`ExpoSchedulingDelegate.kt:22-31`). Updating the app _refreshes_
  the stale payloads rather than clearing them.
- Expo **never** reschedules on app launch. `setupScheduledNotifications()` has exactly one caller,
  reachable only via boot/reboot/package-replaced broadcasts.
- `response.notification.request.content.data` is exactly the payload stored at scheduling time
  (iOS `NotificationRecords.swift:328-334`; Android `NotificationSerializer.java:75,82`).

Sources: [expo-notifications SDK reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
and [its permissions section](https://docs.expo.dev/versions/latest/sdk/notifications/#permissions)
(which corroborates only the reboot half), plus
[Apple: Scheduling and Handling Local Notifications](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/SchedulingandHandlingLocalNotifications.html)
— all checked 2026-08-07.

**Why it does not apply.** `grep` for `scheduleNotificationAsync` across `src/`, `app/`, and
`supabase/` returns **zero hits**. Reminders are entirely server-driven push:
`src/lib/notifications.ts:319-335` — _"Reminder content + timing are server-driven … this only
ensures the channel is registered."_ There is even a one-time migration,
`clearLegacyLocalReminders()` (`src/lib/notifications.ts:360-364`), called once per session from
`src/features/notifications/use-notification-sync.ts:48`, which calls
`cancelAllScheduledNotificationsAsync()` to purge anything the pre-push build left in the OS queue.

So the URL is minted **at send time**, per send, by the edge function
(`supabase/functions/_shared/web-reminders.ts:566`). Deploy the edge function with the new URL and
every subsequent notification carries it.

**The actual residual risk is the client-side allowlist, and it is sharper than the queue problem.**
`src/lib/notifications.ts:94-105` defines `ALLOWED_REMINDER_ROUTES`, and
`isAllowedReminderRoute` (`:112-114`) gates every tapped notification before it reaches
`router.navigate()`. This creates a two-sided version skew:

- **Old app, new server.** The server sends `/tools/check-in`; an app build that has not been updated
  rejects it as not-allowlisted and the tap does **nothing at all**. Users on old builds — which on
  iOS/Android is most of them for days or weeks — get dead reminder taps.
- **New app, old notification.** A notification already delivered and sitting undismissed in the tray
  carries `/tools/mood-tracker`; if the new build drops that entry from the allowlist, the tap is
  silently swallowed.

**Verdict: a redirect is mandatory** — but the mandatory part is keeping `/tools/mood-tracker` in
`ALLOWED_REMINDER_ROUTES` **and** keeping a working route behind it, for at least as long as old
builds are in the field. The safe sequence is: ship the app with _both_ paths allowlisted and the old
route redirecting, wait for adoption, _then_ flip the edge function's URL.

### Q2. Saved routines — path or stable id?

**Stable id. Saved routines are completely unaffected by a route rename.**

- The database column is `routine_steps.tool_id text not null`
  (`supabase/migrations/20260715_routines.sql:143`), and the migration header at `:11` states it is
  _"an app-defined identifier, not free text"_.
- The write path stores the id: `src/features/routines/repository.ts:190` inserts
  `tool_id: toolId` where `toolId: SteppableToolId` (`:184`). `SteppableToolId` includes `"mood"`
  (`src/features/routines/derive.ts:15,37`).
- The path is only derived at navigation time, through
  `TOOL_STEP_ROUTES` / `routeForTool()` (`src/features/routines/tool-routes.ts:18-46`). That map is
  the single indirection point: change `mood: "/tools/mood-tracker/new"` to
  `mood: "/tools/check-in/new"` and every existing saved routine follows automatically.

Confirmed from both sides — the TypeScript and the schema agree.

### Q3. Android home-screen widgets — where are `mood-checkin` / `mood-trend` persisted?

**Both on-device and server-side — and they are two independent id spaces that happen to share the
same strings.** Neither is touched by a route rename.

1. **Server-side: `widget_preferences.widget_id`** — the **in-app home dashboard** widget list and
   order. See c1. Rows written by onboarding, recommendations, and manual home edits. Renaming the
   card id orphans these rows and the widget silently disappears from the user's dashboard until a
   backfill runs.
2. **On-device: `selftend.widgets.config.<androidWidgetId>.cardId`** — which card a **launcher
   widget** displays. See c2. Written once by the user at widget-placement time and never rewritten.
   `render-widget.tsx:25` falls back to `"mood-checkin"` for an unknown id, so a rename would make
   every configured mood widget silently render the fallback — and if `mood-checkin` is itself the
   renamed id, the fallback is dangling.

The two registries are deliberately kept in sync: `snapshot-types.ts:133` comments that `CARD_IDS`
_"must mirror the in-app WIDGET_REGISTRY ids"_, and `CARD_IDS` (`:134-135`) lists `mood-checkin` and
`mood-trend` alongside `widget-registry.tsx:77-92`.

**A widget already placed on a launcher home screen is the hardest thing here**, because the
on-device `cardId` has no server copy to reconcile against and no schema version to invalidate it —
unlike the snapshot, which has `SCHEMA_VERSION`. A card-id rename would need a read-modify-write
migration in `readConfig` (`widget-config-store.ts:23-45`), mapping the old id to the new one, kept
in place indefinitely.

**But none of this is triggered by renaming the route.** Keep the card ids as they are and the widget
problem does not exist.

### Q4. Redirects — what is the mechanism on each platform?

**Yes on all three, and the repo already uses one of the two mechanisms.** Verified against the
installed `expo-router@57.0.7`.

#### Mechanism 1 — a stub route file rendering `<Redirect />` (already proven in this repo)

`app/(app)/tools/act.tsx` is exactly this, four lines long, redirecting the retired `/tools/act` to
`/modules/act`. It needs no `<Stack.Screen>` registration in `protected-layout.tsx` (there is none for
`tools/act`). Keeping `app/(app)/tools/mood-tracker/index.tsx` as a `<Redirect href="/tools/check-in" />`
stub — plus `new.tsx` and `[id]/index.tsx` equivalents for the sub-paths — is the lowest-risk option
and works identically on iOS, Android, and web.

#### Mechanism 2 — the `expo-router` config-plugin `redirects` prop

Available since expo-router 5.0.0 (SDK 53); this app is on 57.0.7, so it is available. It is a prop on
the `expo-router` plugin entry (`app.config.ts:217`), **not** a hand-written `extra.router` key —
though the plugin writes there and the runtime reads
`Constants.expoConfig?.extra?.router` (`node_modules/expo-router/build/global-state/useStore.js:24`).
Schema: `node_modules/expo-router/plugin/options.json:78-138` (`source`, `destination`, `permanent`,
`methods`; `additionalProperties: false`, so typos are build errors).

Internally this is _generated_ stub routes — a config redirect compiles to a synthetic route node
whose `loadRoute()` renders `createElement(Redirect, { href })`
(`build/getRoutesCore.js:291-302`, `build/getRoutesRedirects.js:66-88`). Mechanism 2 is a generator
for mechanism 1.

#### Per platform

| Platform    | Incoming deep link                                                                                                                                             | In-app navigation to the old path                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **iOS**     | `getInitialURL()` → `applyRedirects` → `redirectSystemPath` (`build/getLinkingConfig.js:60-84`); warm links via `subscribe()` (`build/link/linking.js:99-131`) | `applyRedirects` in `build/global-state/getNavigationAction.js:21` |
| **Android** | same as iOS                                                                                                                                                    | same                                                               |
| **Web**     | `applyRedirects` is **skipped** (`getLinkingConfig.js:64-65`); instead the SPA boots and the generated redirect route does a client-side `history.replace`     | same                                                               |

Nothing is lost on web here because `wrangler.toml` sets
`not_found_handling = "single-page-application"` — every unknown path already serves `index.html`
with a 200 and lets the client router decide. `/tools/mood-tracker` will keep resolving after the
rename; the only question is whether it lands on a redirect stub or on `app/+not-found.tsx`.

#### Optionally, a real HTTP 301 on web

Cloudflare **Workers** static assets (not just Pages) support a `_redirects` file —
https://developers.cloudflare.com/workers/static-assets/redirects/ (checked 2026-08-07). Limits:
2,000 static + 100 dynamic redirects, 1,000 characters per line. It would go at `public/_redirects`,
mirroring the existing `public/_headers` (same `public/` → `dist/` copy;
`wrangler.toml` `directory = "./dist"`). The docs' caveat that `_redirects` is ignored for
Worker-served requests does **not** bite: `wrangler.toml` has an `[assets]` block and no `main`, so
this is a pure static-asset Worker.

⚠️ **Verify before relying on it:** Cloudflare's docs never state the ordering between `_redirects`
and `not_found_handling = "single-page-application"`. Check offline with `wrangler dev --local`
(the recipe already used for `_headers`).

#### What does _not_ work here

- **`+native-intent.tsx`** exists (since expo-router 3.5.6 / SDK 51) and exports
  `redirectSystemPath` — but it is **native-only** (docs, https://docs.expo.dev/router/advanced/native-intent/,
  checked 2026-08-07; confirmed at `getLinkingConfig.js:60-70`, skipped on web) and it has **no
  expo-notifications integration whatsoever**. It would add nothing over mechanisms 1 and 2 here.
- **Static `rewrites`** are server-only: _"Rewrite routes only work in a server context and have no
  equivalent on native or static exports"_ (`build/getRoutes.js:75-76`).
- **`permanent: true` is inert.** Real HTTP redirects come from `_expo/.routes.json`, which is only
  emitted for `web.output: 'static' | 'server'` on EAS Hosting. This app sets
  `web.output: "single"` (`app.config.ts:213`), so the file is never generated — and Cloudflare would
  not read it anyway.

#### The catch that actually matters

A config redirect **would** cover the notification tap path: `use-notification-deep-link.ts:25` calls
`router.navigate(url as Href)`, and `getNavigationAction.js:21` applies redirects to that.

**But the allowlist runs first and defeats it.** `reminderUrlFromResponse`
(`src/lib/notifications.ts:117-122`) returns `null` for any URL not in `ALLOWED_REMINDER_ROUTES`, so
a de-allowlisted `/tools/mood-tracker` never reaches `router.navigate()` and no redirect mechanism
ever sees it.

**So the redirect is necessary but not sufficient. `/tools/mood-tracker` must stay in
`ALLOWED_REMINDER_ROUTES` (`src/lib/notifications.ts:98`) for as long as any older build or
undismissed notification is in the field — that single line is the real migration constraint.**

---

## Recommendation in one line

**The route rename is cheap; the module-identifier rename is expensive.** Do them separately: renaming
`/tools/mood-tracker` → `/tools/check-in` touches ~50 files but orphans no persisted data, provided
the old path stays in `ALLOWED_REMINDER_ROUTES` and behind a redirect until old builds age out.
Renaming `mood` → `checkin` as a _key_ would orphan four persisted stores (c1–c4) and require
backfills on two Supabase tables plus an indefinite on-device migration shim.

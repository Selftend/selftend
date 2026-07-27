# How should the native app learn that a newer version exists?

> Research for [wayfinder ticket #384](https://github.com/Selftend/selftend/issues/384),
> part of the [store-availability map #381](https://github.com/Selftend/selftend/issues/381).
> All external facts checked **2026-07-27**. Graded against the `AGENTS.md` dependency policy
> and privacy expectations.

**Binding constraint from the map:** updates are **never forced**. No blocking screen, no
minimum-version gate, no break-glass. Any flow that only exists in a blocking form is
disqualified for that flow.

---

## 0. Ground truth from this repo

Established by reading the tree, not from memory. This section corrects two assumptions in the
ticket — see §0.4.

### 0.1 What the build actually is

| Fact                            | Value                                                                         | Where                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Expo SDK                        | `expo ^57.0.0`, `react-native 0.86.0`                                         | `package.json`                                                                                                              |
| App version (versionName)       | `package.json.version` — `0.6.1` today                                        | `app.config.ts:22` reads `require("./package.json").version` into `config.version`                                          |
| Android `versionCode` in config | `1` — **inert**                                                               | `app.config.ts:106`; the adjacent comment says "EAS remote versioning owns the integer versionCode separately"              |
| Who owns `versionCode`          | **EAS servers**, not the repo                                                 | `eas.json` → `cli.appVersionSource: "remote"`, `build.production.autoIncrement: true`                                       |
| Who bumps the versionName       | **release-please**, on `main`                                                 | `release-please-config.json` (`release-type: node`), `.github/workflows/release-please.yml`; process in `docs/releasing.md` |
| `expo-updates` in the tree      | **absent** — confirmed, no entry in `package.json` or `package-lock.json`     | —                                                                                                                           |
| `expo-application` in the tree  | **already present at `57.0.2`**, transitively via `expo-notifications@57.0.6` | `package-lock.json`                                                                                                         |
| `expo-constants`                | direct dependency, `~57.0.6`                                                  | `package.json`                                                                                                              |

### 0.2 Version identifiers a Selftend Android build exposes at runtime

- **`Constants.expoConfig?.version`** (`expo-constants`) — the value baked from `app.config.ts`
  at build time, i.e. `package.json.version`, e.g. `"0.6.1"`. **This already works in the
  shipped production app**: `src/providers/app-providers.tsx:49` uses it as the TanStack Query
  persist-cache buster (`buster: \`${Constants.expoConfig?.version ?? "0"}-shape2\``). So the
  "what version am I running" half of the check needs no new code and no new dependency.
- **`Application.nativeApplicationVersion`** (`expo-application`) — reads the Android
  `versionName` from the installed package (`"0.6.1"`). Differs from the `expo-constants` value
  in that it comes from the _installed native package_ rather than the JS-side manifest, so it
  stays correct even if a JS bundle is ever served that was built from a different config.
- **`Application.nativeBuildVersion`** (`expo-application`) — the Android `versionCode` as a
  string (`"61"`-ish). This is the integer Play actually compares when deciding whether an
  update exists.
- **`Constants.nativeAppVersion` / `Constants.nativeBuildVersion`** — **do not exist.** They were
  removed in `expo-constants` 16.0.0 (2024-04-18): "Remove deprecated `installationId`, `isDevice`,
  `nativeAppVersion`, `nativeBuildVersion` …"
  ([CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-constants/CHANGELOG.md)).
  We are on `~57.0.6`. Do not plan around them. `Constants.manifest` is likewise deprecated in
  favour of `expoConfig` ([expo-constants docs](https://docs.expo.dev/versions/latest/sdk/constants/)).
- **`Updates.runtimeVersion` / `Updates.updateId`** — not available; `expo-updates` is not
  installed.

Expo's own guidance is to read the version from the native package, not from app config:
"We recommend using `expo-application` to read the version instead of depending on values from
app config" ([app versions reference](https://docs.expo.dev/build-reference/app-versions/)).
`expo-application`'s Android manifest declares **no permissions at all**, and the two constants
are read synchronously from `PackageManager` with **no network call** — so promoting it from a
transitive to a direct dependency adds no permission to the Play data-safety disclosure and no
new package to the tree ([expo-application docs](https://docs.expo.dev/versions/latest/sdk/application/)).

### 0.3 The identifier a self-hosted check can actually compare

**Only the versionName (`0.6.1`), compared with semver.** The `versionCode` is _not_ comparable
from a self-hosted source, because `appVersionSource: "remote"` + `autoIncrement: true` means
the integer is allocated by EAS during the build and **never lands in the repo**. Nothing in the
git tree, and therefore nothing the web deploy can publish, knows what `versionCode` the AAB
received. Only Google Play knows that number authoritatively — which is precisely what the Play
in-app-update API returns (`availableVersionCode()`).

### 0.4 Two ticket assumptions this invalidates

1. **"a self-hosted version source … costs a release-time bump."** It does not have to. Both the
   web deploy and the Android build run from the _same release tag_
   (`.github/workflows/release.yml` → `deploy-web` and `deploy-android`, both `needs: migrate-prod`,
   both passed `ref: ${{ github.event.release.tag_name }}`), and `expo export` copies `public/`
   into `dist/` (proved by `web-deploy.yml:106`, which appends to `dist/_headers` — a file that
   only exists in `public/`). A build step that writes `package.json.version` into
   `dist/version.json` makes the published "latest version" a **derived** value, bumped by
   release-please like everything else. Zero manual steps, nothing to forget.
2. **"compared against the running build version."** Only the _versionName_ can be compared this
   way — see §0.3. A design that wants to compare `versionCode` must use Play, not our own origin.

But the automation in (1) buys a new problem, and it is the decisive one: see §4.

---

## 1. Option A — Play in-app updates

### 1.1 The API supports a dismissible-only design

`AppUpdateManager.getAppUpdateInfo()` is a **silent query**. It "requests the update availability
for the current app, an intent to start an update flow, and, if applicable, the state of updates
currently in progress" — it returns a `Task<AppUpdateInfo>` and **displays nothing**. Play-owned
UI appears only when the app calls `startUpdateFlowForResult(...)`.
([AppUpdateManager reference](https://developer.android.com/reference/com/google/android/play/core/appupdate/AppUpdateManager),
[Kotlin/Java guide](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java))

`AppUpdateInfo` exposes `updateAvailability()`, `availableVersionCode()` ("the version code of
the update"), `clientVersionStalenessDays()` ("the number of days since the Google Play Store app
on the user's device has learnt about an available update"), `updatePriority()` and
`installStatus()`.
([AppUpdateInfo reference](https://developer.android.com/reference/com/google/android/play/core/appupdate/AppUpdateInfo))

So **check-only + our own dismissible banner is fully supported**, and it is the exact shape
Google documents. Nothing forces a blocking flow.

### 1.2 Flexible vs. immediate

- **IMMEDIATE** is "a fullscreen UX flow that requires the user to update and restart the app in
  order to continue using it." **Disqualified** by the never-force constraint. Noted, not used.
- **FLEXIBLE** provides "background download and installation with graceful state monitoring …
  appropriate when it's acceptable for the user to use the app while downloading." The user can
  decline; declining yields `RESULT_CANCELED`.
  ([in-app updates overview](https://developer.android.com/guide/playcore/in-app-updates))

Google's own guidance on a declined update matches the product guardrail almost word for word:
"If possible, let the user continue without the update and prompt them again later."
([Kotlin/Java guide](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java))

Flexible downloads in the background and then requires an explicit `completeUpdate()`; Google
says "provide a notification (or some other UI indication) to inform the user that the update is
ready to install and **request confirmation before restarting the app**." (same page)

**Play policy does not require the blocking flow.** Google's Play Console help page contrasting
recovery tools with in-app updates says of in-app updates: "You can choose if and when to show
the dialog. You can show a less invasive dialog (not a full-screen dialog)."
([Play Console help](https://support.google.com/googleplay/android-developer/answer/13812041))
No Play policy was found restricting developer-authored update prompts — the policies are silent
on the topic, so treat "our own banner is allowed" as _unrestricted by omission_, not explicitly
blessed.

### 1.3 Reach and testability constraints

- Android 5.0 (API 21)+; "only supported for Android mobile devices, Android tablets, and
  ChromeOS devices." ([overview](https://developer.android.com/guide/playcore/in-app-updates))
- **Android-only.** Nothing for web, nothing for a future iOS listing — both would need a second
  mechanism anyway.
- Only works for an app the account **owns and installed from Play**; the test build must use the
  same application ID and signing key with a lower version code, exercised through **internal app
  sharing**. Debug builds do not work; emulator behaviour is undocumented.
  ([test guide](https://developer.android.com/guide/playcore/in-app-updates/test))
- Availability is the **Play Store app's cached view on the device**, not a live server query
  (that is what `clientVersionStalenessDays()` measures). Expect hours of lag after a rollout.
- Google discloses its own collection for this feature: device metadata, application version, and
  the list of installed modules/asset packs. ([overview](https://developer.android.com/guide/playcore/in-app-updates))
  That is a Google-side data flow we would be newly opting users into.
- **`AppUpdateInfo` instances are single-use** — reuse throws `IntentSender.SendIntentException`;
  fetch fresh before starting any flow.
  ([reference](https://developer.android.com/reference/com/google/android/play/core/appupdate/AppUpdateManager))

### 1.4 Expo's position

**Expo neither ships nor documents anything for Play in-app updates.**
[`expo-updates`](https://docs.expo.dev/versions/latest/sdk/updates/) covers OTA JS bundles only
and does not mention Play Core or store-level binary updates. Despite the name,
`expo-in-app-updates` is a **third-party community module, not an Expo package**. Under the
`AGENTS.md` "prefer Expo built-ins and officially supported solutions" rule, this option scores
worst on provenance: there is no first-party option here at all.

### 1.5 The two candidate packages

|                    | `expo-in-app-updates`                                                                         | `sp-react-native-in-app-updates`                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Latest             | **0.12.0**, published 2026-06-07                                                              | **2.0.0**, published 2026-07-10                                                                        |
| Last commit        | 2026-06-07                                                                                    | 2026-07-13 (repo pushed 2026-07-26)                                                                    |
| Open issues        | **0** (23 total, all closed)                                                                  | **68**                                                                                                 |
| Stars              | 285                                                                                           | 579                                                                                                    |
| Author / licence   | SohelIslamImran / MIT                                                                         | SudoPlz / MIT                                                                                          |
| Runtime deps       | **none** (peer `expo: *`)                                                                     | `react-native-device-info`, `semver`, `underscore`                                                     |
| Expo config plugin | **no** (autolinked Expo module)                                                               | **no** — needs a hand-written `react-native-device-info` shim + a `babel-plugin-module-resolver` alias |
| Expo Go            | no (dev build / prebuild required)                                                            | no                                                                                                     |
| Check-only call    | `checkForUpdate()` → `{ updateAvailable, storeVersion, daysSinceRelease, … }`, launches no UI | `checkNeedsUpdate()` → `{ shouldUpdate, storeVersion }`, launches no UI                                |

Sources: [expo-in-app-updates npm](https://registry.npmjs.org/expo-in-app-updates) /
[repo](https://github.com/SohelIslamImran/expo-in-app-updates);
[sp npm](https://registry.npmjs.org/sp-react-native-in-app-updates) /
[repo](https://github.com/SudoPlz/sp-react-native-in-app-updates).

**Disqualifying behaviour in `expo-in-app-updates`.** Its always-registered
`InstallStateUpdatedListener` calls `appUpdateManager.completeUpdate()` **automatically** when
`InstallStatus.DOWNLOADED` fires — no snackbar, no confirmation, the app restarts itself. On
`InstallStatus.FAILED` it fires an unsolicited `ACTION_VIEW` intent to the Play listing. Read
directly from
[`ExpoInAppUpdatesModule.kt`](https://github.com/SohelIslamImran/expo-in-app-updates/blob/main/android/src/main/java/expo/modules/inappupdates/ExpoInAppUpdatesModule.kt).
That is a forced restart and a forced navigation — contrary both to Google's own guidance and to
our constraint. Its README also ships a "Forcing Updates" recipe with a `BackHandler` trap. The
library is only safe for us if we use `checkForUpdate()` and **never** start a flexible flow.

`sp-react-native-in-app-updates` has the correct shape (`installUpdate()` is caller-driven) but
fails the dependency policy harder: three runtime deps, a babel-alias shim to work under Expo at
all, and 68 open issues including several Expo-specific ones (#199 Metro `Unable to resolve
module crypto`, #179 `checkNeedsUpdate` of null, #168/#186/#193 iOS bundleId/version-comparison).

**Both** query Apple's iTunes lookup API on iOS
(`https://itunes.apple.com/lookup?bundleId=…`, with `Cache-Control: no-cache`), leaking device IP
and bundle ID to Apple on every check
([itunesLookup.ts](https://github.com/SudoPlz/sp-react-native-in-app-updates/blob/master/src/itunesLookup.ts)).
Irrelevant while we are Android-only, but it must be hard-guarded, and it is a latent
privacy regression the moment an iOS listing exists.

### 1.6 Verdict on Option A

The _capability_ is right — Play is the only source that knows what is **actually installable
right now**, which no self-hosted value can know (§4). The _packaging_ is wrong: no
first-party Expo option, the better-integrated wrapper auto-restarts the app, the
better-behaved wrapper needs babel shims and carries a 68-issue backlog, and both add an
Android-only mechanism that solves none of the map's other surfaces.

---

## 2. Option B — a self-hosted version source

### 2.1 Supabase row vs. static JSON on the existing Worker

**Static JSON on the Cloudflare Worker wins, decisively, on privacy.**

A Supabase read carries the anon (or, once signed in, the user's) JWT and lands in Supabase's
own request logs against our project — the check becomes **joinable to a user account**. It also
needs a new public table plus an `anon`-readable RLS policy, i.e. schema surface and a migration,
and it does not work before the client is initialised. Note that
`supabase/migrations/20260670_grant_role_privileges.sql` already grants `select` on all public
tables to `anon`, with RLS doing the gating — so a genuinely public row is possible, but it is
strictly more machinery and strictly worse privacy than a file.

A static file on the origin we already run needs **no new service, no schema, no auth, and no
new dependency**. The web `_headers` CSP already permits it: `connect-src 'self'` (`public/_headers`).

### 2.2 It does not have to cost a release-time bump

See §0.4. `expo export` copies `public/` into `dist/`, and `release.yml` deploys web and builds
Android from the **same release tag**, so a build step that writes `package.json.version` into
`dist/version.json` makes the published value derived. release-please already bumps
`package.json`; nothing new has to be remembered.

The value must be the **versionName**, not the versionCode — see §0.3; the versionCode lives on
EAS servers and never reaches the repo. Comparison is therefore semver on
`Application.nativeApplicationVersion`.

### 2.3 Privacy footprint of the outbound check

Small, but not zero, and it is a **new outbound network call from a mental-health app**.

What a plain HTTPS GET to our own origin unavoidably reveals, and what Cloudflare can log:
`ClientIP`, `ClientCountry`, `ClientRequestUserAgent`, `ClientRequestHost`, `ClientRequestPath`,
and (separately) the query string; `ClientTCPRTTMs`. TLS fingerprints (`JA3Hash`/`JA4`) are
"available only for Bot Management customers" (Enterprise), so they are not captured on our plan.
([Cloudflare HTTP request log fields](https://developers.cloudflare.com/logs/reference/log-fields/zone/http_requests/))

Retention defaults:

- **Zone HTTP request logs are not retained by default** — "By default, your HTTP request logs
  are not retained"; retention must be explicitly enabled.
  ([Logpull retention](https://developers.cloudflare.com/logs/logpull/enabling-log-retention/))
- **Workers Logs are on by default** for newly created Workers, capturing "the Request, Response,
  and related metadata", retained 3 days (Free) / 7 days (Paid), at 100% head sampling by default.
  ([Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/))

**Our `wrangler.toml` declares no `main`** — it is an assets-only deploy (`[assets] directory =
"./dist"`), so no user Worker code is invoked per request. _Open question, flagged rather than
hidden:_ whether an assets-only Worker still produces Workers Logs invocation records could not
be confirmed from a primary Cloudflare source. Treat it as unverified and set
`observability.enabled = false` (or `head_sampling_rate = 0`) explicitly rather than relying on
the assumption.

Design rules that keep the check as close to anonymous as the transport allows:

1. **No auth header, no cookie, no Supabase session** on this request.
2. **No device ID, install ID, or user ID** in any form.
3. **One fixed path for everyone — `/version.json` — and no query parameters.** Fetch the whole
   (tiny) file and compare client-side. `/version?current=0.6.1` would put the running build into
   the log and make each request more distinguishing.
4. **Cache headers** (`Cache-Control: public, max-age=3600` in `public/_headers`) so the CDN and
   device HTTP cache absorb most checks.
5. **Check at most once per cold boot.** Frequency is itself a privacy setting.
6. Disclose it in the privacy policy (`docs/policies.md` and the `policies` i18n namespace).

Under GDPR the IP address alone is personal data, so this is a real (if minimal) data flow that
belongs in the privacy read the map already lists as unresolved.

### 2.4 Verdict on Option B

Zero new native dependencies, zero new services, no third party in the path, one file, automatic
bumping, and the **same mechanism serves the web surface** that siblings #385/#386 have to solve
anyway — which is exactly the map's "one banner component, two version sources" shape. Its one
real weakness is §4.

---

## 3. Option C — EAS Update / OTA

### 3.1 It answers a different question

EAS Update ships JS, styling, images and assets over the air; it explicitly **cannot** ship "a
change to native code or native dependencies", "a change to app permissions", "an update to the
Expo SDK version", or "anything that requires a new app binary version"
([EAS Update introduction](https://docs.expo.dev/eas-update/introduction/),
[runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)).

So EAS Update **does not tell the app that a newer store build exists.** It removes the need for
a store trip for _some_ releases and is silent about the rest. This repo ships native-surface
changes regularly (SDK 57 bump, `react-native-android-widget`, `expo-notifications`,
`@sentry/react-native`, config-plugin edits in `app.config.ts`), and every one of those still
needs a Play update the user has to accept. Adopting EAS Update would leave #384 unanswered for
precisely the releases where the banner matters most. **It is orthogonal to this ticket, not a
solution to it.**

### 3.2 What it would cost if adopted anyway

- **Pricing** (checked at <https://expo.dev/pricing> on 2026-07-27): Free = **1,000 MAU**, 100 GiB
  edge bandwidth, 20 GiB storage. Starter = **$19/mo** + usage (3,000 MAU). Production = $199/mo.
  Overage: **$0.005 per additional MAU**, **$0.10/GiB** bandwidth
  ([usage-based pricing](https://docs.expo.dev/billing/usage-based-pricing/)). An MAU is
  "someone who downloads at least one update during the billing period"; users who only _check_
  are not counted. **No non-profit, open-source, student, or PPP discount exists** — the pricing
  FAQ says so explicitly. The [Fair Use Policy](https://expo.dev/eas/fair-use) restricts the Free
  plan to "pre-revenue startups, proof of concepts, and hobby and student projects" and states
  "asking for donations is not considered commercial use", so Selftend plausibly qualifies — by
  the revenue test, not by an explicit non-profit carve-out. `docs/costs.md` currently books
  "Expo Free: $0"; this would be the first thing to put that at risk as the user base grows.
- **A new third party in the runtime path.** By default `expo-updates` checks on every cold boot
  (`checkAutomatically: "ON_LOAD"`), sending `expo-runtime-version`, `expo-platform` and channel
  headers to `u.expo.dev` ([download behaviour](https://docs.expo.dev/eas-update/download-updates/),
  [protocol](https://docs.expo.dev/technical-specs/expo-updates-1/)). That is strictly worse than
  Option B on the third-party-disclosure axis, and it triggers the **AGENTS.md architecture rule**
  (new external dependency + new public URL → control-tower issue).
- **Pipeline discipline we do not have today**: a runtime-version policy (`appVersion` /
  `nativeVersion` / `fingerprint`; only `fingerprint` updates automatically when native surface
  changes — the others "require remembering to bump the version when native code changes"),
  channel→branch links per build profile, and a rule that `verify`/integration/e2e must gate
  `eas update` because an OTA is a **production deploy with no store review**. Plus a rollback
  runbook (`eas update:rollback`) added to `docs/releasing.md`.
- **Self-hosting is real but expensive.** The protocol is public and Expo publishes a reference
  server, but that server ships with the caveat that it "is not guaranteed to be complete, stable,
  or performant enough to use as a full-fledged backend" and that "Expo does not provide hands-on
  technical support for custom expo-updates server implementations"
  ([custom-expo-updates-server](https://github.com/expo/custom-expo-updates-server)). The response
  is a `multipart/mixed` manifest with SFV headers and hashed asset URLs — days of work plus an
  unsupported maintenance tax, in the app's update path.

### 3.3 Store policy: not the blocker

Google Play's Device and Network Abuse policy bars downloading executable code from outside Play,
but "this restriction does not apply to code that runs in a virtual machine or an interpreter …
(such as JavaScript in a webview or browser)"
([policy](https://support.google.com/googleplay/android-developer/answer/9888379)). The binding
condition is that the OTA'd JS must not itself violate other Play policies — relevant for us
because of the health-adjacent content and the 13+ teen-access work. Apple's carve-out lives in
the **Developer Program License Agreement §3.3.1(B)**, not the Review Guidelines (Guideline 2.5.2
reads stricter on its face) — an ambiguity to re-check before any iOS launch, irrelevant today.
([Expo FAQ](https://docs.expo.dev/faq/))

### 3.4 The banner copy, if EAS Update were adopted

It would read "apply update", not "go to the store" — and that is genuinely the nicer non-forced
UX. `fallbackToCacheTimeout` defaults to `0`, so launch is never delayed; `useUpdates()` exposes
`isUpdatePending`; and `Updates.reloadAsync()` fires only on tap
([expo-updates API](https://docs.expo.dev/versions/latest/sdk/updates/)). Nothing here forces
anything. If the project ever does adopt EAS Update, the banner should be driven by
`isUpdatePending` and must never auto-reload mid-session — reloading under someone mid-journal-entry
would be its own harm. **But this is a decision about the release strategy, not about #384**, and
it should be taken on its own merits in its own ticket.

---

## 4. The one thing Option B gets wrong, and how to bound it

A self-hosted value says "version 0.7.0 was released"; Play says "0.7.0 is installable **for you,
right now**". They are not the same claim.

In `release.yml`, `deploy-web` and `deploy-android` both fan out from `migrate-prod` **in
parallel**. The web deploy finishes in minutes; the Android job has a 90-minute timeout, and Play
processing/review follows. So a derived `version.json` can advertise a version whose AAB has not
finished building, let alone reached the user's Play Store cache — which itself lags by hours
(`clientVersionStalenessDays`, §1.3). Tapping the banner would land the user on a listing that
says "Open", not "Update".

That is a confusing banner, not a harmful one, and it is dismissible. Two cheap mitigations, both
for the spec ticket to choose between:

- **A publish timestamp plus a grace window.** Put `{"version": "0.7.0", "publishedAt": "<ISO>"}`
  in the file and only surface the banner once `publishedAt` is more than N hours old (24h is a
  safe first guess). Fully automatic, no human step.
- **Publish the value from the Android job instead**, after `eas submit` succeeds. More faithful,
  but it couples the web deploy to the Android job and needs a second Worker deploy — more
  machinery than the problem deserves right now.

Play in-app updates is the only option with no version of this problem. That is its one genuine
advantage, and it costs a third-party native dependency to buy.

---

## 5. Recommendation

**Adopt Option B: a static `version.json` on the existing Cloudflare Worker origin, generated
from `package.json.version` at web-export time, compared client-side against
`Application.nativeApplicationVersion` with semver.** Reject Play in-app updates for now, and
treat EAS Update as a separate decision that does not answer this ticket.

Concretely:

1. Promote **`expo-application`** from transitive to direct dependency (already `57.0.2` in the
   lock via `expo-notifications`; no permissions, no network, no new package). Read
   `nativeApplicationVersion`, per Expo's own recommendation over `Constants.expoConfig?.version`.
2. Add a build step that writes `public/`-adjacent `dist/version.json` containing the version and
   a `publishedAt` timestamp, from `package.json`. No manual bump — release-please already owns it.
3. Serve it with `Cache-Control: public, max-age=3600` via `public/_headers`. No query params, no
   auth, no identifiers, one fixed path, one check per cold boot.
4. Gate the banner on `Platform.OS === "android"` **and** a `publishedAt` grace window (§4). The
   banner links to the Play listing (`EXPO_PUBLIC_PLAY_STORE_URL`, already wired in
   `src/lib/env.ts`) and is dismissible with the dismissal remembered.
5. Disclose the check in the privacy policy, and note the new public URL in control-tower per the
   `AGENTS.md` architecture rule.

**Why, in one line each:** it adds no new dependency and no new service (the strongest possible
answer to the three `AGENTS.md` dependency questions); it keeps the check on our own origin
rather than sending a per-cold-boot request to Google or Expo; it is the only option that also
serves the web surface siblings #385/#386 must solve, which is what the map's "one banner
component, two version sources" asks for; and it cannot force anything, because it is a string
comparison and a link.

**What we give up, stated plainly:** we lose the ability to say "installable right now" (§4), we
compare a semver string rather than the versionCode Play actually orders by (§0.3), and we accept
a small new outbound request whose IP-level footprint is personal data (§2.3). Those are real
costs; they are smaller than a third-party native module whose shipped code calls `completeUpdate()`
without asking (§1.5), or a metered third-party service that still would not answer the question
(§3.1).

**Revisit Play in-app updates if** the grace-window banner proves confusing in practice, or if a
first-party Expo module for Play Core appears — at which point the `checkForUpdate()`-only,
own-banner design in §1.1 is the shape to build, and the IMMEDIATE flow stays permanently off the
table.

**Unverified, flagged rather than hidden:**

- Whether an assets-only Cloudflare Worker (no `main`) emits Workers Logs invocation records (§2.3).
- Whether `inAppUpdatePriority` can be set from the Play Console UI or only the Developer API
  (irrelevant to this recommendation — we set no priority).
- Whether Play in-app updates work on emulators or non-production tracks; Google documents neither.
- Whether the `sdkVersion` runtime-version policy is formally deprecated; it remains in the config
  type union but is no longer documented on the `expo-updates` page.

**Related repo state worth knowing:** `PR #379` (release Android to the Play **production** track
automatically on merge to `main`) is still open against `dev`. `eas.json` today submits to the
`Groups` closed track and `android-release.yml` mirrors onto `alpha`. The §4 timing window gets
shorter, not longer, once #379 lands and releases go straight to production.

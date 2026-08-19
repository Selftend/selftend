# Web push in Playwright chromium: real subscriptions vs. stubs

Date: 2026-08-19 · Map: #1109 · Ticket: #1110 · Origin: #966

**Verdict:** Playwright's bundled Chromium cannot hold a real web-push subscription.
`pushManager.subscribe()` needs Chrome's push service — Firebase Cloud Messaging,
reachable only from builds carrying Google API keys and a real (non-incognito)
profile — and the bundled open-source Chromium build has no working FCM backend,
while Playwright's default contexts are incognito-style profiles in which Chrome
auto-denies push by design. The default headless binary (chromium-headless-shell,
the "old headless") doesn't support push messaging at all. There is no Chromium
command-line flag that enables a fake push service; Chromium's own tests inject a
compiled-in C++ fake. The realistic ceiling for this project's setup is: stub
`pushManager.subscribe` at the page level (full control, zero external deps),
optionally paired with the CDP `ServiceWorker.deliverPushMessage` command — which
is confirmed to dispatch a real `push` event to the service worker **without
checking for any subscription** — to exercise the SW-side handler. A genuinely
real subscribe is only plausible with `channel: "chrome"` (branded Google Chrome)

- `launchPersistentContext` + live network access to Google's FCM endpoints, which
  trades hermeticity for fidelity and could not be confirmed working by any primary
  source.

## Question / context

This repo pins `@playwright/test` 1.59.1 with a single `chromium` project using
the "Desktop Chrome" device descriptor (`playwright.config.ts`), app served at
`http://localhost:8099` as a static export. The app's flow
(`src/lib/notifications.ts`): check `Notification.permission`, register a service
worker, call `registration.pushManager.subscribe({ userVisibleOnly: true,
applicationServerKey: <VAPID public key> })` wrapped in a 20 s timeout
(`WEB_PUSH_SUBSCRIBE_TIMEOUT_MS`, line 47; subscribe at lines 273–283). Today the
e2e webServer env injects no `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, so
`readWebChannelStatus()` reports `unsupported` and every web-push path is dead
code in the suite. Question: can subscribe ever _succeed_ in this e2e rig, or is
stubbing the browser primitives the ceiling?

## Findings

### a. `grantPermissions(["notifications"])` and `Notification.permission`

**Confirmed: it works in Chromium, and Playwright's own test suite asserts it.**

- The [BrowserContext.grantPermissions docs](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions)
  (checked 2026-08-19) list the supported permissions: `'accelerometer'`,
  `'ambient-light-sensor'`, `'background-sync'`, `'camera'`, `'clipboard-read'`,
  `'clipboard-write'`, `'geolocation'`, `'gyroscope'`, `'local-fonts'`,
  `'local-network-access'`, `'magnetometer'`, `'microphone'`, `'midi-sysex'`,
  `'midi'`, `'notifications'`, `'payment-handler'`, `'storage-access'`,
  `'screen-wake-lock'`. **`'push'` is not in the current list** (the docs
  historically listed it; it is gone). Caveat quoted from the docs: "Supported
  permissions differ between browsers, and even between different versions of the
  same browser. Any permission may stop working after an update."
- Playwright's own test suite
  ([tests/library/permissions.spec.ts](https://github.com/microsoft/playwright/blob/main/tests/library/permissions.spec.ts),
  checked 2026-08-19) contains, with no chromium skip:

  ```ts
  it("should grant notifications permission when listed", async ({ page, context, server }) => {
    await page.goto(server.EMPTY_PAGE);
    await context.grantPermissions(["notifications"], { origin: server.EMPTY_PAGE });
    expect(await getPermission(page, "notifications")).toBe("granted");
  });
  ```

  So `permissions.query({name:'notifications'})` returning `granted` in bundled
  Chromium is release-gated behavior.

- **`'push'` in Chromium concretely fails**:
  [playwright#5631](https://github.com/microsoft/playwright/issues/5631) (Feb
  2021, checked 2026-08-19) reports `browserContext.grantPermissions: Unknown
permission: push` in Chromium (the same call worked in Firefox and WebKit). The
  mechanism, verified against 1.59 source
  ([crBrowser.ts at tag v1.59.0](https://github.com/microsoft/playwright/blob/v1.59.0/packages/playwright-core/src/server/chromium/crBrowser.ts),
  checked 2026-08-19): the `webPermissionToProtocol` map contains
  `['notifications', 'notifications']` and **no `push` entry**; and the CDP
  [`Browser.PermissionType` enum](https://chromedevtools.github.io/devtools-protocol/tot/Browser/)
  (checked 2026-08-19) itself has `notifications` but **no `push`/`pushMessaging`
  value** — so there is nothing to map to.
- **localhost is fine**: per the
  [W3C Secure Contexts spec §3.1](https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy)
  (checked 2026-08-19), origins whose host matches `127.0.0.0/8` or `::1/128`,
  and hosts `localhost`/`localhost.` under conforming name resolution, "return
  Potentially Trustworthy". So `http://localhost` is a secure context — service
  workers, Notification, and Push API are all _exposed_ there. Pass
  `{ origin: "http://localhost:<port>" }` (or set `permissions` on the project,
  which grants for all origins) — grants are origin-exact.
- Conflicting community report, noted for honesty:
  [playwright#23954](https://github.com/microsoft/playwright/issues/23954) claims
  "`Notification.permission` always evaluates to `denied`" — but that repro
  loaded a **local HTML file** (`file://`, with `--disable-web-security`) per the
  author's [repo](https://github.com/TomasHubelbauer/playwright-web-push-notification)
  (checked 2026-08-19), which is not an http origin a grant can target. Against a
  real `http://localhost` server, Playwright's own suite (above) is the
  authoritative evidence that it works.
- Separate caveat confirmed in
  [#23954](https://github.com/microsoft/playwright/issues/23954): permission
  `granted` does **not** mean a notification is ever _displayed_ — headless shows
  nothing, and even headed runs showed the `show` event without a visible OS
  notification.

### b. Can `pushManager.subscribe()` ever succeed in bundled Chromium?

**Confirmed: no — three independent blockers, each fatal on its own for the
default setup.**

1. **Chrome's push service is Google FCM, baked into Google builds.** The Chrome
   team's own blog states Chrome uses FCM/GCM as its push service
   ([Push Notifications on the Open Web](https://developer.chrome.com/blog/push-notifications-on-the-open-web),
   checked 2026-08-19), and
   [w3c/push-api#213](https://github.com/w3c/push-api/issues/213) confirms
   subscribe in Chrome yields an `fcm.googleapis.com` endpoint (checked
   2026-08-19). Features that use Google APIs require build-time API keys per
   [chromium.org api-keys](https://www.chromium.org/developers/how-tos/api-keys/)
   (checked 2026-08-19 — note: this page discusses keys generally; it does not
   name FCM explicitly, and the March 2021 private-API restriction announced on
   the Chromium blog targeted Sync et al.; its application to push is **not
   verified**). The dependency is stated most bluntly in
   [ungoogled-chromium#1020](https://github.com/ungoogled-software/ungoogled-chromium/issues/1020)
   (checked 2026-08-19): "Push API is implemented using FCM (a rebranding of
   GCM), which naturally doesn't work with Google's servers disabled."
   Playwright's bundled browser is an "open source Chromium build"
   ([playwright.dev/docs/browsers](https://playwright.dev/docs/browsers), checked
   2026-08-19). When the push-service leg fails, Chromium rejects subscribe with
   `AbortError: Registration failed - push service error` — this exact string
   family is Chromium's own (see the error-string catalog in
   [Chromium commit cd4efe3e](https://chromium.googlesource.com/chromium/src/+/cd4efe3e3063fdd2c8a387aea83fa71148d38ea0%5E!/):
   "Registration failed - …" statuses, checked 2026-08-19; the error as seen in
   the wild: [web-push-libs/web-push#574](https://github.com/web-push-libs/web-push/issues/574)).
   _Classification: the FCM dependency and the error string are confirmed; that
   Playwright's specific build lacks working keys is strongly inferred
   (open-source build + zero counterexamples), not directly documented._
2. **Playwright's default headless is the old headless shell, which has no push
   messaging at all.** Playwright 1.49+ runs bundled-chromium headless via
   `chromium-headless-shell` unless you opt into `channel: 'chromium'` (new
   headless, "the real Chrome browser") —
   [release notes v1.49](https://playwright.dev/docs/release-notes) and
   [docs/browsers](https://playwright.dev/docs/browsers), checked 2026-08-19. Old
   headless is a separate stripped embedder (since Chrome 132 shipped only as the
   standalone `chrome-headless-shell` binary; new headless is unified with headful
   Chrome since Chrome 112 —
   [developer.chrome.com/docs/chromium/headless](https://developer.chrome.com/docs/chromium/headless),
   checked 2026-08-19). Chrome's notifications/push owner Peter Beverloo, on
   [headless-dev](https://groups.google.com/a/chromium.org/g/headless-dev/c/i-aVV_pmc-E)
   (Mar 2017, checked 2026-08-19): "Neither notifications nor push messaging are
   currently supported on headless. Firebase Cloud Messaging for Web depends on
   both for its functionality." _(2017 statement about old headless; old headless
   never gained the //chrome-layer push service. New headless, being real Chrome,
   has the code — but blocker 1 still applies to unbranded builds.)_
3. **Playwright contexts are incognito-style, and Chrome denies push in incognito
   by design.** Playwright creates contexts via CDP
   [`Target.createBrowserContext`](https://chromedevtools.github.io/devtools-protocol/tot/Target/):
   "Similar to an incognito profile but you can have more than one" (checked
   2026-08-19). Chrome disabled the Notifications API in incognito in M49
   ([blink-dev PSA](https://groups.google.com/a/chromium.org/g/blink-dev/c/mmrrnhO5L80),
   checked 2026-08-19), and `pushManager.subscribe()` in incognito is rejected
   after a deliberate randomized-delay auto-deny
   ([crbug 476854 thread](https://groups.google.com/a/chromium.org/g/chromium-bugs/c/oQyTOiZv8OA),
   checked 2026-08-19). Community corroboration inside Playwright's tracker:
   [#23954 comment](https://github.com/microsoft/playwright/issues/23954) links
   the incognito limitation, and suggests `launchPersistentContext` as the
   escape. _Note: whether Playwright's `grantPermissions` override defeats the
   incognito auto-deny for the subscribe path specifically is unverified; even if
   it does, blocker 1 remains._

**Escape hatches, and what each buys:**

- **`channel: "chrome"`** — branded Google Chrome has FCM keys and a working push
  service (that is precisely what the branded/unbranded distinction means, per
  the sources in blocker 1). Playwright's docs recommend the channel when the
  site "relies on this kind of" Google-integrated functionality (their example is
  codecs) ([docs/browsers](https://playwright.dev/docs/browsers), checked
  2026-08-19). Branded Chrome under Playwright runs **new headless** since 1.49
  (release notes above), i.e., real Chrome — so headless per se no longer blocks.
  CI cost: Chrome must be installed on the runner
  (`npx playwright install chrome`), and the runner needs outbound access to
  Google's FCM/GCM endpoints. **However: no primary source (Playwright doc, issue
  resolution, or maintainer comment) confirming `subscribe()` succeeding under
  Playwright with channel chrome was found — could not verify.** Blocker 3
  (incognito context) presumably still applies to default contexts even in
  branded Chrome, pushing you to:
- **`launchPersistentContext`** — the only way to get a real, non-incognito
  profile (push registration state is per-profile; incognito auto-deny doesn't
  apply). Suggested in
  [#23954](https://github.com/microsoft/playwright/issues/23954) ("AFAIK that
  type of context is not incognito"). Cost: you lose the `browser`/`context`
  fixtures and worker-parallel isolated contexts. *Combination `channel:"chrome"`
  - persistent context + network = the only credible real-subscribe recipe;
    empirically unconfirmed.*
- **Headed vs headless** — irrelevant for new headless (same binary as headful
  since Chrome 112, cite above); fatal for the default chromium-headless-shell
  (no push messaging, Beverloo quote above).
- **Launch flags / fake push service** — **confirmed none exists.** Chromium's
  push tests make `subscribe()` succeed by injecting
  `gcm::FakeGCMProfileService` via a C++ testing factory in
  [push_messaging_browsertest.cc](https://chromium.googlesource.com/chromium/src/+/b9dabcc3e279cb499c74e7d7e57765af5c21d91e/chrome/browser/push_messaging/push_messaging_browsertest.cc)
  (checked 2026-08-19):
  `gcm::GCMProfileServiceFactory::GetInstance()->SetTestingFactoryAndUse(profile, &gcm::FakeGCMProfileService::Build)`
  — test-fixture-only, not reachable from any command-line switch. No
  `--push-api-*` or `--enable-features` switch providing a mock push service was
  found.

### c. CDP surface for injecting a push message

**Confirmed: `ServiceWorker.deliverPushMessage` exists, is what DevTools' "Push"
button uses conceptually, and does not require a subscription.**

- The CDP [ServiceWorker domain](https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/)
  (checked 2026-08-19) defines
  `deliverPushMessage(origin: string, registrationId: RegistrationID, data: string)`,
  plus `dispatchSyncEvent` and `dispatchPeriodicSyncEvent`. The `registrationId`
  comes from `ServiceWorker.enable` → `workerRegistrationUpdated` events.
- **The no-subscription question is settled by Chromium source.**
  [`content/browser/devtools/protocol/service_worker_handler.cc`](https://chromium.googlesource.com/chromium/src/+/main/content/browser/devtools/protocol/service_worker_handler.cc)
  (checked 2026-08-19): `DeliverPushMessage` parses the id and calls
  `browser_context_->DeliverPushMessage(GURL(origin), id, /*message_id=*/"", payload, …)`
  directly — **no push-subscription lookup or validation anywhere in the path**.
  It dispatches a real `push` event (with your string as `event.data`) to the
  registered service worker even if `pushManager.subscribe()` never ran. Failure
  conditions are only: domain not enabled, no browser context, unparseable
  registration id. No payload encryption is involved — the string arrives as-is.
- CDP `Browser.grantPermissions` has **no** `push` PermissionType (confirmed in
  (a)), and **no `PushMessaging` CDP domain exists** — the
  [protocol viewer](https://chromedevtools.github.io/devtools-protocol/) lists
  none (checked 2026-08-19). Event injection via the ServiceWorker domain is the
  entire CDP surface.
- Playwright can reach it: `context.newCDPSession(page)` then
  `send('ServiceWorker.enable')` / `send('ServiceWorker.deliverPushMessage', …)`
  — chromium-only, and the ServiceWorker domain is marked experimental in CDP, so
  treat as unstable API. DevTools' Application ▸ Service Workers "Push" input is
  the interactive twin of this command
  ([Chrome DevTools background services docs](https://developer.chrome.com/docs/devtools/javascript/background-services),
  checked 2026-08-19).
- General SW support status: Playwright's
  [service-workers docs](https://playwright.dev/docs/service-workers) — "Service
  workers are only supported on Chromium-based browsers"; SW network
  visibility/routing is the experimental part
  (`PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS` — the env var is no longer
  surfaced on the current docs page; SW-made requests are reported via
  context-level events, with routing caveats). Checked 2026-08-19. None of this
  blocks `deliverPushMessage`, which is plain CDP.

### d. Prior art

- **Page-level stubbing** is the de-facto community answer. The freshest comment
  on [playwright#23954](https://github.com/microsoft/playwright/issues/23954)
  (mhabsaoui, 2025-10-21) asks for exactly this as a feature: "could be useful to
  fully mock a Push Subscription/Notification... to be able to mock it in E2E
  tests without having to reach browser Push service." **No Playwright maintainer
  has answered #23954 (P3-collecting-feedback, still open)** — there is no
  official recommendation. Checked 2026-08-19. Pattern: `context.addInitScript`
  replacing `ServiceWorkerRegistration.prototype.pushManager` (or
  `PushManager.prototype.subscribe`) to return a canned
  `PushSubscription`-shaped object; the app then sends that fake subscription to
  the backend, which the test asserts on.
- **CDP `deliverPushMessage` in the wild**: scattered Puppeteer/Selenium bindings
  expose it (e.g.
  [Selenium's generated CDP wrapper](https://www.selenium.dev/selenium/docs/api/rb/Selenium/DevTools/V85/ServiceWorker.html),
  checked 2026-08-19); no widely-adopted Playwright helper library was found —
  teams hand-roll the three CDP calls.
- **Mock push servers**: Mozilla's
  [autopush-rs](https://mozilla-services.github.io/autopush-rs/) is Mozilla's
  production push server, MPL-2.0, explicitly self-hostable "for testing Push
  locally with Firefox" (checked 2026-08-19). This works because **Firefox's push
  server URL is a pref** (`dom.push.serverURL`) — Chromium has no equivalent knob
  (its push service is compiled-in FCM, see (b)).
- **Firefox in Playwright**: Playwright's Firefox build **disables push out of
  the box** —
  [`browser_patches/firefox/preferences/playwright.cfg`](https://github.com/microsoft/playwright/blob/main/browser_patches/firefox/preferences/playwright.cfg)
  sets `pref("dom.push.serverURL", "")` ("Turn off the Push service.") and
  `pref("dom.push.connection.enabled", false)` ("required to prevent non-local
  access to push.services.mozilla.com"). Checked 2026-08-19. Per
  [playwright#27773](https://github.com/microsoft/playwright/issues/27773) (fixed
  by PR #27840, v1.40), the pref can be overridden via `firefoxUserPrefs` — so
  Firefox + `dom.push.serverURL` → local autopush is the one path to a _fully
  hermetic real_ subscribe, but it's a different browser than this project tests.
- **web-platform-tests / Google's harness**: GoogleChromeLabs'
  [web-push-testing-service](https://github.com/GoogleChromeLabs/web-push-testing-service)
  drove _real_ browsers via Selenium to integration-test push libraries —
  **archived read-only since 2021-08-31** with no recommended replacement
  (checked 2026-08-19). Chromium's own coverage is the C++ browser-test fake
  described in (b); no runtime-reachable WPT mock for Chromium was found.

## The honest ceiling

| Tier                                                                            | What you get                                                                                                                                                                                                | What you don't                                                                                                                                                                                                      | Cost                                                                                                                     |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Bundled chromium + init-script stub** (current setup compatible)              | Full flow determinism: permission check (real, via `grantPermissions`), SW registration (real), subscribe (stubbed, instant — the 20 s timeout wrapper never fires), backend receives a canned subscription | No proof the real browser can mint a subscription; stub drifts if Chrome changes `PushSubscription` shape                                                                                                           | Zero. Hermetic, parallel-safe, works in headless shell                                                                   |
| **+ CDP `ServiceWorker.deliverPushMessage`**                                    | Everything above **plus** the service worker's real `push` handler runs against a real dispatched event (payload string of your choice), so notification-construction logic is exercised                    | Payload arrives unencrypted (skips the crypto path); ServiceWorker CDP domain is experimental; chromium-only                                                                                                        | Small: ~3 CDP calls, must read `registrationId` from `workerRegistrationUpdated`                                         |
| **`channel: "chrome"` + `launchPersistentContext` (+ network to FCM)**          | Plausibly a real `subscribe()` returning a real `fcm.googleapis.com` endpoint; could even round-trip a real encrypted push from the server                                                                  | **Unverified** — no primary source confirms this works under Playwright; test now depends on a live Google service (flake, firewalled CI runners, corporate proxies); loses context isolation and standard fixtures | High: install Chrome on runners, rework fixtures around persistent context, accept an external-network dependency in e2e |
| **Firefox + `firefoxUserPrefs: {"dom.push.serverURL": …}` + local autopush-rs** | The only fully hermetic _real_ subscribe+deliver loop                                                                                                                                                       | Different browser than the product's single-chromium test matrix; autopush is a service to operate                                                                                                                  | Out of scope for this project's config, listed for completeness                                                          |

## What the fidelity decision should weigh

1. **What bug class are you hunting?** The failure modes this app can actually
   own — permission-gating logic, SW registration, the subscribe _call site_ and
   its 20 s timeout handling, sending the subscription to the backend, and the SW
   `push` handler — are all covered by tier 1–2. The parts a real subscribe would
   additionally verify (FCM reachability, VAPID key acceptance by Google, payload
   decryption) are Google's and the browser's code, not ours.
2. **Timeout-wrapper behavior is testable _only_ with a stub or a real failure**:
   in bundled Chromium the un-stubbed call rejects
   (`AbortError: Registration failed - push service error`) or, in headless
   shell, worse — so an un-stubbed e2e can actually serve as a regression test
   for the _error path_, for free.
3. **Hermeticity vs. authenticity**: tier 3 converts an e2e suite that runs
   anywhere into one requiring a Google-serviced network path and a
   branded-browser install; per the project's CI posture (single chromium
   project, localhost, static export), that's a step-change in flake surface for
   coverage of code we don't own.
4. **Maintenance risk of stubs** is real but bounded: pin the stub to the
   `PushSubscription` interface (endpoint, `expirationTime`,
   `getKey('p256dh'/'auth')`, `toJSON`, `unsubscribe`) per
   [MDN PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).
   Note the DB-side guards a stubbed endpoint must clear: the endpoint-allowlist
   CHECK (`20260571_web_push_endpoint_allowlist.sql`) accepts an
   `https://fcm.googleapis.com/fcm/send/…`-shaped endpoint, and a before-insert
   trigger caps 20 rows per user.
5. **Playwright's trajectory offers no rescue**: the feature request (#23954) has
   sat maintainer-silent in P3 since 2023, `push` was removed from the permission
   list rather than implemented, and the CDP protocol has no push-permission or
   push-subscription surface to build on.

## Sources

- https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions — grantPermissions permission list (no `push`), origin param, caveat (checked 2026-08-19)
- https://github.com/microsoft/playwright/blob/v1.59.0/packages/playwright-core/src/server/chromium/crBrowser.ts — 1.59 permission→CDP map (checked 2026-08-19)
- https://github.com/microsoft/playwright/blob/main/tests/library/permissions.spec.ts — notifications-granted test (checked 2026-08-19)
- https://github.com/microsoft/playwright/issues/5631 — "Unknown permission: push" in Chromium (checked 2026-08-19)
- https://github.com/microsoft/playwright/issues/23954 — open feature request, no maintainer response (checked 2026-08-19)
- https://github.com/microsoft/playwright/issues/3301#issuecomment-1512005981 — notification-testing failure report (checked 2026-08-19)
- https://github.com/microsoft/playwright/issues/27773 — Firefox `dom.push.serverURL` override (checked 2026-08-19)
- https://github.com/microsoft/playwright/blob/main/browser_patches/firefox/preferences/playwright.cfg — push disabled in PW Firefox (checked 2026-08-19)
- https://playwright.dev/docs/browsers + https://playwright.dev/docs/release-notes (v1.49) — headless shell vs `channel:'chromium'` new headless; channel chrome guidance (checked 2026-08-19)
- https://playwright.dev/docs/service-workers — SW support chromium-only (checked 2026-08-19)
- https://playwright.dev/docs/emulation#permissions — permissions emulation examples (checked 2026-08-19)
- https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy — localhost potentially trustworthy (checked 2026-08-19)
- https://chromedevtools.github.io/devtools-protocol/tot/Browser/ — PermissionType enum, no push (checked 2026-08-19)
- https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/ — deliverPushMessage(origin, registrationId, data) (checked 2026-08-19)
- https://chromedevtools.github.io/devtools-protocol/tot/Target/ — createBrowserContext "similar to an incognito profile" (checked 2026-08-19)
- https://chromium.googlesource.com/chromium/src/+/main/content/browser/devtools/protocol/service_worker_handler.cc — deliverPushMessage does not check subscriptions (checked 2026-08-19)
- https://chromium.googlesource.com/chromium/src/+/b9dabcc3e279cb499c74e7d7e57765af5c21d91e/chrome/browser/push_messaging/push_messaging_browsertest.cc — FakeGCMProfileService is test-fixture-only (checked 2026-08-19)
- https://chromium.googlesource.com/chromium/src/+/cd4efe3e3063fdd2c8a387aea83fa71148d38ea0%5E!/ — Chromium "Registration failed - …" error strings (checked 2026-08-19)
- https://www.chromium.org/developers/how-tos/api-keys/ — Google API keys for Chromium builds (checked 2026-08-19)
- https://developer.chrome.com/blog/push-notifications-on-the-open-web — Chrome's push service is FCM/GCM (checked 2026-08-19)
- https://github.com/w3c/push-api/issues/213 — Chrome subscribe yields fcm.googleapis.com endpoints (checked 2026-08-19)
- https://github.com/ungoogled-software/ungoogled-chromium/issues/1020 — push is FCM, dead without Google servers (checked 2026-08-19)
- https://groups.google.com/a/chromium.org/g/headless-dev/c/i-aVV_pmc-E — Beverloo: no push in (old) headless (checked 2026-08-19)
- https://developer.chrome.com/docs/chromium/headless — new headless unified since 112; headless shell standalone since 132 (checked 2026-08-19)
- https://groups.google.com/a/chromium.org/g/blink-dev/c/mmrrnhO5L80 — Notifications disabled in incognito, M49 (checked 2026-08-19)
- https://groups.google.com/a/chromium.org/g/chromium-bugs/c/oQyTOiZv8OA — incognito subscribe auto-denied with delay (checked 2026-08-19)
- https://github.com/TomasHubelbauer/playwright-web-push-notification — community attempt, file:// caveat (checked 2026-08-19)
- https://github.com/GoogleChromeLabs/web-push-testing-service — archived 2021 real-browser push harness (checked 2026-08-19)
- https://mozilla-services.github.io/autopush-rs/ — self-hostable Mozilla push server for local Firefox testing (checked 2026-08-19)
- https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe — subscribe contract, error types (checked 2026-08-19)
- https://github.com/web-push-libs/web-push/issues/574 — "Registration failed - push service error" in the wild (checked 2026-08-19)
- https://developer.chrome.com/docs/devtools/javascript/background-services — DevTools background-services/push debugging (checked 2026-08-19)

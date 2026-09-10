# Web Deployment

This project should launch the browser app as a single-page Expo web export. Do not add a separate backend, analytics SDK, or server-rendered web stack for v1 unless a concrete requirement appears.

Recommended production shape:

- Domain registrar: Porkbun (`selftend.org`); DNS: Cloudflare (nameservers `daphne`/`moura.ns.cloudflare.com`)
- Frontend host: Cloudflare Workers (static assets)
- Backend: Supabase
- App routing: Expo Router, with `app/+not-found.tsx` handling unmatched routes at runtime

Cloudflare Workers serves the browser app and public policy pages as static assets. Supabase manages accounts, sessions, OAuth, and private app data for both web and native builds. Keep those responsibilities separate: do not add a custom web backend just to host the Expo app, and do not move the frontend into Supabase Edge Functions by default.

For self-hosted and bring-your-own-Supabase builds, see [self-hosting.md](self-hosting.md).

Official references:

- Expo publishing websites: <https://docs.expo.dev/guides/publishing-websites/>
- Cloudflare Workers static assets: <https://developers.cloudflare.com/workers/static-assets/>
- Workers `_headers` / `_redirects`: <https://developers.cloudflare.com/workers/static-assets/headers/>
- Workers custom domains: <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>
- Supabase redirect URLs: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase custom domains: <https://supabase.com/docs/guides/platform/custom-domains>
- Expo Linking createURL: <https://docs.expo.dev/linking/into-other-apps/>

## Domain Purchase

Use `selftend.org` as the canonical production domain if it is available.

When buying the domain:

- confirm the spelling is exactly `selftend.org`
- buy one year first
- enable auto-renew after purchase
- keep WHOIS privacy enabled
- enable registrar account 2FA
- do not buy bundled web hosting
- do not buy paid email hosting unless there is a separate reason

Porkbun's included email forwarding is enough for early aliases such as `support@selftend.org`, `privacy@selftend.org`, and `security@selftend.org`.

## Hosting Portability

Cloudflare Workers (static assets) is the production frontend host. It is not a backend dependency. Supabase remains the backend for auth, database, storage, and any future Supabase Edge Functions. The frontend stays portable — any static host that serves the exported files and answers unknown routes with `404.html` (a 404 status, as Cloudflare's `404-page` mode does; the file is the app shell and hydrates into the real screen) works — so the host can change without touching app code.

Do not move the frontend app into Supabase Edge Functions as the default plan. Supabase custom domains are for Supabase project URLs such as APIs, Auth, Storage, and Edge Functions; Supabase documents that custom domains are not intended to host frontend applications through Edge Functions.

The portable contract is:

- build the web app with `npm run export:web`
- deploy `dist` to a static frontend host
- require the frontend host to serve `index.html` for unknown navigation routes
- let Expo Router handle unmatched paths with `app/+not-found.tsx`
- keep app URLs in environment variables and Supabase dashboard configuration, not hard-coded into app flows

## Cloudflare Workers Deployment

GitHub Actions is the only deployer. It builds the Expo web export and publishes the prebuilt `dist/` to a Cloudflare Worker (static assets) via `wrangler` — Cloudflare never builds the project itself. Cloudflare Workers has **no per-deploy billing**, so deploys run on push:

- **Production** (`selftend.org` + `www.selftend.org`, Worker `selftend`): deploys on a **published Release** (`release.yml`, after the prod DB migration gate). Manual fallback: the `Web production deploy` (`web-deploy.yml`) workflow in the Actions tab.
- **Staging** (`staging.selftend.org`, Worker `selftend-staging`): deploys on **push to `dev`** (`staging.yml`, after the staging DB migration gate). Staging is served `noindex`.

The deploy step uses `cloudflare/wrangler-action@v3` on Node 22, selecting the config by environment:

- [`wrangler.toml`](../wrangler.toml) — production Worker `selftend`, assets from `dist/`, real 404s (`not_found_handling = "404-page"`, since [#2295](https://github.com/Selftend/selftend/issues/2295)): the eight files on the index list answer 200, and every other path — a gated screen, an auth screen, a typo — answers **404** with `dist/404.html`, which is the app shell and hydrates into the real screen.
- [`wrangler.staging.toml`](../wrangler.staging.toml) — staging Worker `selftend-staging`, the same fallback mode.

Build env comes from GitHub Actions **variables** (`EXPO_PUBLIC_*`); the deploy needs the `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets (see below). Security headers ship via `public/_headers` (copied into `dist/`), which Cloudflare Workers static assets applies natively; the staging deploy injects `X-Robots-Tag: noindex` into the existing `/*` block, deletes `dist/sitemap.xml` and strips the `Sitemap:` line from `dist/robots.txt` (the sitemap names production URLs; [indexability.md](indexability.md) § 6.7). It adds no `Disallow` — a disallowed URL is never fetched, so its `noindex` would never be read.

Custom-domain binding (one-time, dashboard): Cloudflare dash → Workers → the Worker → **Domains → Add Domain**. The zone must be on Cloudflare nameservers first, and any pre-existing DNS record for the hostname must be deleted before binding (Cloudflare refuses a custom domain over an existing record). Cloudflare provisions the edge TLS cert automatically.

Required build-time GitHub Actions **variables** (production Environment):

```text
EXPO_PUBLIC_SUPABASE_URL=<supabase-project-url>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
EXPO_PUBLIC_GITHUB_REPO_URL=https://github.com/Selftend/selftend
EXPO_PUBLIC_PUBLIC_APP_URL=https://selftend.org
EXPO_PUBLIC_SUPPORT_EMAIL=support@selftend.org
EXPO_PUBLIC_PRIVACY_EMAIL=privacy@selftend.org
EXPO_PUBLIC_SECURITY_EMAIL=security@selftend.org
EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<vapid-public-key>
```

Optional:

```text
EXPO_PUBLIC_EAS_PROJECT_ID=032dd368-6eae-4a70-bbe5-4ccef2fc06cb
```

`EXPO_PUBLIC_PUBLIC_APP_URL` is baked into the JavaScript bundle during export and is used as the explicit web auth callback base. If it changes or was missing, update the GitHub Actions variable and redeploy.

The three contact addresses are read by `/support`, `/security`, and — as of #2131 — the **FAQ** and the health-data consent gate, which interpolate them instead of hardcoding them. A build that leaves one unset falls back to the address above and logs a startup warning naming the variable — harmless here, since these values are this project's own, but it is the signal a fork needs.

⚠️ That is 6 of the 21 places these addresses appear in copy. The remaining **15** live in the `privacy`, `terms`, `cookies` and `accountDeletion` sections and are still literals, so setting these variables does **not** yet change what those four screens print. They are held back because they are hashed by `policy-content.test.ts` and moving one character costs a `policyVersion` bump, which re-presents the consent gate to every existing user. See [self-hosting.md](self-hosting.md) for what that means for a fork.

`EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` is also baked into the web bundle. Browser reminders stay disabled until this public key is present and the matching private key is configured in Supabase Edge Function secrets.

☠️ **Setting the variable is only half of it - the deploy has to forward it, and for months it did not** ([#2263](https://github.com/Selftend/selftend/issues/2263)). Expo inlines `EXPO_PUBLIC_*` at export time, so a name missing from the `env:` block in `.github/workflows/web-deploy.yml` reads as the empty string in the deployed app whatever the environment holds. Both environments carried the key from 2026-07-16 and both live bundles still carried `webPushVapidPublicKey:""`, with the reminder offer ending in "Reminders aren't configured for this app build" on every target. The workflow forwards it now, and `test/web-deploy-public-env.test.ts` fails if any `?? ""` reader in `src/lib/env.ts` stops being forwarded. Forwarding a name whose **value** is empty ships the same dead bundle, so the workflow's "Check deploy environment" step checks this one too - but only where it is expected: on `Selftend/selftend`, where both environments hold the key, an empty value fails the deploy; on a fork it prints a warning and the deploy continues, because a fork with no web push should still be able to deploy.

### Web Push Reminders

Web push reminders use the browser Push API, `public/selftend-push-worker.js`, the `web_push_subscriptions` table, and the `send-web-reminders` Supabase Edge Function. Native Android and iOS builds go through the same Edge Function, delivering to an Expo push token in `device_push_tokens` - nothing is scheduled locally on any platform.

The PWA head tags - the manifest link, the apple-touch icon, the theme colour - live in the web document, `app/+html.tsx`. Keep the manifest and push worker in `public/` so `npm run export:web` copies them to `dist`.

Before production web push testing:

1. Generate VAPID keys, for example with `npx web-push generate-vapid-keys`.
2. Set `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` on the `production` and `staging` GitHub Environments (the web deploy reads `vars.*` under the environment it is called with, and forwards this one into the export env since [#2263](https://github.com/Selftend/selftend/issues/2263)).
3. Apply the database migration so `web_push_subscriptions`, `pg_cron`, `pg_net`, and Vault are available:

```bash
npm exec supabase -- db push
```

4. Set Supabase Edge Function secrets:

```bash
npm exec supabase -- secrets set WEB_PUSH_VAPID_PUBLIC_KEY=<public-key>
npm exec supabase -- secrets set WEB_PUSH_VAPID_PRIVATE_KEY=<private-key>
npm exec supabase -- secrets set WEB_PUSH_VAPID_SUBJECT=mailto:support@selftend.org
npm exec supabase -- secrets set WEB_PUSH_CRON_SECRET=<random-secret>
```

5. Store matching database Vault secrets for the cron invoker:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'selftend_supabase_url');
select vault.create_secret('<same-random-secret>', 'selftend_web_push_cron_secret');
```

6. Deploy the Edge Function and schedule the cron job:

```bash
npm exec supabase -- functions deploy send-web-reminders
```

Then run in the Supabase SQL editor:

```sql
select public.schedule_send_web_reminders_cron();
```

iOS and iPadOS web push requires the user to install the web app to the Home Screen before enabling reminders. Normal Safari tabs should be treated as unsupported.

### GitHub Actions Web Deploy

The reusable `.github/workflows/web-deploy.yml` workflow (called by `release.yml` for prod and `staging.yml` for staging; also manually dispatchable):

- checks out the release tag (prod) or the triggering `dev` SHA (staging)
- installs dependencies and builds with Node `22.23.1`, runs `npm run export:web` (the Expo export, then the index-list step that prunes `dist/` to the nine HTML files and writes `sitemap.xml` — "Web Build" below)
- on staging only, appends `X-Robots-Tag: noindex` to `dist/_headers`, deletes `dist/sitemap.xml` and strips the `Sitemap:` line from `dist/robots.txt`
- switches to Node 22 and deploys `dist` (+ the `worker`-less static-assets config) via `cloudflare/wrangler-action@v3`, selecting `wrangler.toml` (prod) or `wrangler.staging.toml` (staging)

Required GitHub repository variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_GITHUB_REPO_URL
EXPO_PUBLIC_PUBLIC_APP_URL
EXPO_PUBLIC_SUPPORT_EMAIL
EXPO_PUBLIC_PRIVACY_EMAIL
EXPO_PUBLIC_SECURITY_EMAIL
EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
```

Optional GitHub repository variables:

```text
EXPO_PUBLIC_PLAY_STORE_URL
EXPO_PUBLIC_APP_STORE_URL
EXPO_PUBLIC_DISCORD_URL
```

`EXPO_PUBLIC_GITHUB_REPO_URL` is optional in app code because a default exists, but setting it in GitHub keeps the release environment explicit. `EXPO_PUBLIC_PLAY_STORE_URL` and `EXPO_PUBLIC_APP_STORE_URL` both **default in code to the live listings**, so they are overrides rather than requirements; both are also set explicitly in the production and staging environments and as repo variables, which keeps the release environment self-describing. Besides the store buttons, the Play URL powers the Android mobile-web download bar. Setting either to an empty string drops that store’s surfaces — the affordance a self-hosted fork uses, not a "coming soon" state. `EXPO_PUBLIC_PLAY_STORE_URL` also targets the **Android** in-app update offer — an empty value disables that offer entirely rather than falling back to any other store. `EXPO_PUBLIC_APP_STORE_URL` does not drive one: **iOS update offers stay disabled**, because nothing on the device can observe an App Store promotion. `EXPO_PUBLIC_DISCORD_URL` defaults to the maintainer's Discord invite; set it to an empty string to hide all Discord UI.

Every web deploy also writes `dist/version.json` (`{version, publishedAt}` from `package.json`) after the export step, served with `Cache-Control: no-cache` via `public/_headers`. The app compares it against its running version and **only the web build acts on it**, offering a refresh. The document records when the _web_ deployed, which is not evidence that a store release is installable, so it is not a native signal and never was — **Android instead asks Google Play directly** whether it is serving a newer build to that specific device, which is immune to rollout percentage, country restrictions and device targeting alike (see `src/lib/android-store-update.ts`). **iOS offers stay off**: a build reaches the App Store only after a human promotes it and Apple reviews it, and the device can observe neither. Every offer is the same quiet banner, dismissible per version.

Required GitHub secrets (per Environment — `production` and `staging`):

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

`CLOUDFLARE_API_TOKEN` is an "Edit Cloudflare Workers" template token scoped to the account; `CLOUDFLARE_ACCOUNT_ID` is the account id (not secret, stored alongside). Use GitHub repository or environment protection rules if more than one maintainer can run production deploys.

## Web Build

Build command:

```bash
npm run export:web
```

Equivalent raw command:

```bash
npm exec expo -- export -p web --clear
```

Output directory:

```text
dist
```

Local production smoke:

```bash
npm run serve:web:production
```

`npm run export:web` is the export the deploy runs (`.github/workflows/web-deploy.yml`, "GitHub Actions Web Deploy" above). It is two steps. The web build uses `web.output = "static"` in [app.config.ts](../app.config.ts) (since [#2293](https://github.com/Selftend/selftend/issues/2293)): `expo export` renders every route in Node and writes one HTML file per route - `dist/index.html`, `dist/faq.html`, `dist/crisis.html` and so on, some three hundred files including the whole signed-in tree and the auth screens - around the document in [app/+html.tsx](../app/+html.tsx), which replaced `public/index.html`. Each public file carries the page's own `<head>` and full body, so it reads without JavaScript; the head each file carries is specified in [indexability.md](indexability.md) § 4.

Then `node scripts/apply-index-list.js dist` applies the **index list** ([scripts/lib/index-list.js](../scripts/lib/index-list.js); [indexability.md](indexability.md) § 3, [#2295](https://github.com/Selftend/selftend/issues/2295)) - the one list of the public routes: `/`, `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/security`, `/account-deletion`. It deletes every other HTML file (the gated `(app)` tree, the `(auth)` screens, Expo's `_sitemap.html`), moves `+not-found.html` to `404.html`, and writes `dist/sitemap.xml` from the same list - absolute `https://selftend.org` URLs, the root with its slash and the rest without, no `lastmod`, `hreflang`, `priority` or `changefreq`. After it, `dist/` holds exactly nine HTML files: the eight plus `404.html`. The step fails the export if a listed file did not export, so a public page cannot silently drop out of a deploy. `public/robots.txt` (allow all, no `Disallow`, one `Sitemap:` line) is copied into `dist/` unchanged by the export; Cloudflare prepends its managed AI-crawler block to it at the edge, which is expected. `test/index-list.test.ts` pins the list to the route tree (every route file outside `(app)` and `(auth)` is on it, and nothing else), and pins `robots.txt`, both `wrangler*.toml` and the staging strip; `scripts/lib/index-list.test.js` covers the prune and the sitemap. Adding a public route means adding it to the list - the test fails until you do. The sitemap is submitted once in Search Console after the first production deploy that ships it ([indexability.md](indexability.md) § 9).

Two things to keep straight after that change:

- The production CSP in [public/\_headers](../public/_headers) allows exactly two inline scripts, by hash: the first-paint palette script in `app/+html.tsx`, and the one-line hydration flag (`globalThis.__EXPO_ROUTER_HYDRATE__=true;`) the static export writes into every page. `test/theme-web-surfaces.test.ts` recomputes both - the first from the rendered document, the second from the literal expo-router emits - so editing the script, or an expo-router upgrade changing the flag, fails `verify` rather than silently blocking a script in production. Without the flag's hash the browser refuses it and the app mounts with `createRoot` instead of `hydrateRoot`: the prerendered page is thrown away and rendered again from scratch, with nothing in the console to say so (measured on [#2293](https://github.com/Selftend/selftend/issues/2293)).
- Every path off the index list - a gated screen such as `/modules/cbt`, an auth screen such as `/sign-in`, a typo - is answered with `dist/404.html` and a **404 status** (`not_found_handling = "404-page"` in both Worker configs; [indexability.md](indexability.md) § 6.4). That file is the exported not-found route, which is the app shell: it hydrates, Expo Router matches the real path, and the visitor sees the real screen (or the not-found screen, [app/+not-found.tsx](../app/+not-found.tsx), when nothing matches). Only the status line differs from a listed page. Do not add provider-specific 404 pages, and do not point the fallback at `index.html` again - the two auth URLs leave Google's index by that status.

`npm run serve:web:production` serves the listed pages but does not fall back for unknown paths; to see the real fallback locally, run the Worker: `npx wrangler@4 dev --config wrangler.toml` serves `dist/` exactly as Cloudflare does, 200 for `/faq`, 404 with the app for `/modules/cbt`.

## Production Headers

[public/\_headers](../public/_headers) contains the security **and caching** headers (Cloudflare Workers static assets applies this file natively; it is copied into `dist/` by the export). Keep the Content Security Policy restrictive, but allow avatar images from:

- `https://*.supabase.co` for private Storage signed URLs
- `https://*.googleusercontent.com` for Google OAuth profile photos

If profile photo upload or Google photo restore reports success in production but the image does not render, verify the deployed `img-src` directive first.

### Caching

Two directories hold content-hashed build output, and both are cached for a year as `immutable`:

| Path              | Holds                           |
| ----------------- | ------------------------------- |
| `/assets/*`       | fonts and images                |
| `/_expo/static/*` | the entry JS bundle and the CSS |

Expo's web export fingerprints these filenames with an MD5 of their contents, so a changed file is always a changed URL and a cached copy can never go stale. **Both paths must be listed** — `/assets/*` does not cover `/_expo/static/*`, and a missing rule there is expensive but invisible: the entry bundle and stylesheet quietly fall back to Cloudflare's default `max-age=0, must-revalidate` and cost a revalidation round-trip on every page load (issue #393).

The HTML shell is deliberately left to that default. Do not add a rule for it:

- `/index.html` is never served — Cloudflare 307s it to `/` — so a rule on that path matches nothing.
- A rule on `/` would cover only the root, not `404.html`, which is served for every client route off the index list (`/journal`, `/settings/...`).

`max-age=0, must-revalidate` is already the correct behaviour for the shell, so a partial rule would buy nothing and mislead the next reader. [web-headers.test.ts](../web-headers.test.ts) pins this shape.

Verify against a deployed Worker with `curl -I`. This machine's DNS resolver can lag behind the Cloudflare records, so pin the IP:

```bash
curl -sI --resolve staging.selftend.org:443:<cloudflare-ip> \
  https://staging.selftend.org/_expo/static/js/web/index-<hash>.js
```

Caching rules only apply when the deploy is **assets-only**. Both `wrangler.toml` and `wrangler.staging.toml` are assets-only (no `main` script) and pin `wranglerVersion: "4"`; a Worker with a `main` script ignores `_headers` entirely.

### CSP `'unsafe-inline'` note

The `script-src` and `style-src` directives include `'unsafe-inline'`. This is required because:

- Expo web injects inline scripts during the bundle bootstrap.
- NativeWind generates inline `style` attributes for Tailwind classes at runtime.

Removing `'unsafe-inline'` breaks the web build. If Expo adds nonce-based CSP support in a future SDK version, revisit and tighten these directives.

### HSTS preload

The HSTS header includes the `preload` directive. After the first production deploy to `selftend.org`, submit the domain to <https://hstspreload.org> to be included in browser preload lists.

## Public Routes To Verify

These routes must be reachable without signing in. The eight on the index list answer **200** with their own file:

- `/` (the landing page)
- `/faq`
- `/crisis`
- `/privacy`
- `/terms`
- `/cookies`
- `/security`
- `/account-deletion`

Everything else answers **404** with `404.html`, which still loads the app:

- `/auth-callback` — 404 status, and the missing-link state renders after hydration
- a deliberately unknown route, such as `/missing-test` — 404 status, and the simple not-found screen with a home link renders
- a gated deep link, such as `/modules/cbt` — 404 status, and the real screen renders after hydration (for a signed-out visitor, whatever the app shows a signed-out visitor there)

`curl -sI https://selftend.org/faq` reads `HTTP/2 200`; `curl -sI https://selftend.org/missing-test` reads `HTTP/2 404`. `/sitemap.xml` is XML listing the eight, and `/robots.txt` is Cloudflare's managed block followed by the repo's three lines.

The Google Play privacy policy URL should use the production domain:

```text
https://selftend.org/privacy
```

The Google Play account deletion URL should be:

```text
https://selftend.org/account-deletion
```

## Supabase Auth Configuration

In Supabase Dashboard, open Authentication -> URL Configuration.

Set Site URL:

```text
https://selftend.org
```

Add redirect URLs:

```text
https://selftend.org/auth-callback
selftend://**
selftend-dev://auth-callback
http://localhost:8081/auth-callback
exp://**/--/auth-callback
```

Supabase recommends exact production redirect URLs instead of broad wildcards for production. Keep broad patterns limited to native deep links and preview/local workflows where they are needed. Supabase troubleshooting also recommends adding the exact URL used by `redirectTo` when a flow falls back to the Site URL; for Expo Go debugging, add the exact Metro callback shown for the current session, such as `exp://192.168.0.12:8081/--/auth-callback`.

The `exp://**/--/auth-callback` entry is only for short Expo Go development checks. Expo documents Expo Go callback URLs as development URLs and recommends a development build with the app scheme for stable auth callbacks. The Android development build returns through `selftend-dev://auth-callback`; the Play build returns through `selftend://auth-callback`.

## Google OAuth Configuration

In Google Auth Platform for the web OAuth client:

Authorized JavaScript origins:

```text
https://selftend.org
http://localhost:8081
```

Authorized redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Use the exact redirect URI shown by the Supabase Google provider page for the active project.

## Pre-Deployment Verification

Run:

```bash
npm run typecheck
npm test -- --runInBand
npm run export:web
npm run serve:web:production
```

Manual smoke:

- open `/privacy`, `/terms`, `/crisis`, and `/account-deletion`
- open `/auth-callback` directly and confirm the missing-link state renders
- open `/missing-test` and confirm the not-found screen renders (the status line reads 404; that is intended)
- sign in with Google on web
- create, edit, and archive a CBT record against the live Supabase project

### Account Deletion E2E Verification

Run this against a real Supabase instance (staging or production) to confirm the `delete_user_account()` RPC works with full privileges:

1. Sign up a throwaway test user (e.g., `delete-test@example.com`).
2. Accept policy consent so `user_preferences` row is created.
3. Create at least one thought record.
4. Upload a profile avatar.
5. Call data export and confirm the JSON contains profile, preferences, and thought records:
   ```sql
   select public.export_user_data();
   ```
6. Call account deletion from the app Settings screen, or directly:
   ```sql
   select public.delete_user_account();
   ```
7. Verify cleanup - all of the following should return zero rows:
   ```sql
   select * from auth.users where email = 'delete-test@example.com';
   select * from public.profiles where user_id = '<uid>';
   select * from public.user_preferences where user_id = '<uid>';
   select * from public.thought_records where user_id = '<uid>';
   ```
8. Verify Storage bucket `profile-pics/<uid>/` folder no longer contains files (check via Supabase Dashboard → Storage).

If step 6 fails with a permissions error, the function owner (usually `postgres`) does not have `DELETE` access on `auth.users`. In hosted Supabase this should work by default since `security definer` functions run as the function owner. If using a self-hosted setup, ensure the migration was run by a superuser role.

## Acceptance

Web launch is acceptable only when:

- the app loads over HTTPS on `https://selftend.org`
- unknown browser routes answer 404 and still render the app not-found screen
- public policy and account-deletion routes are reachable without signing in
- Supabase Google sign-in returns to `/auth-callback`
- authenticated CBT persistence works against the intended Supabase project
- support/privacy/security contacts are real operational inboxes
- crisis and legal copy has been reviewed for the target launch jurisdictions

## Troubleshooting

### Unknown routes return 404 instead of the app

A **404 status** on an unknown or gated route is the intended answer since [#2295](https://github.com/Selftend/selftend/issues/2295) (`not_found_handling = "404-page"`; [indexability.md](indexability.md) § 6.4): only the eight files on the index list answer 200, and every other path is served `dist/404.html` with a 404 - the app shell, which hydrates into the real screen. The failure is a 404 that shows Cloudflare's plain error page, a blank page, or a page that never becomes the app. Check in this order:

1. Confirm `dist/404.html` is in the deployed export. The index-list step (`node scripts/apply-index-list.js dist`, the second half of `npm run export:web`) moves `+not-found.html` there and fails the export if that file is missing; a deploy that ran `expo export` alone ships no `404.html`, and Cloudflare then answers with its own bare 404.
2. Confirm both [wrangler.toml](../wrangler.toml) and [wrangler.staging.toml](../wrangler.staging.toml) have `not_found_handling = "404-page"` under `[assets]` (`test/index-list.test.ts` pins it, so a drift fails `verify` first).
3. Confirm the deploy uploaded `dist/` (the pruned Expo web export), not an empty or wrong directory.
4. Confirm the latest `Web deploy` GitHub Actions run for the environment succeeded.
5. Re-run the deploy (`release.yml` for prod, push to `dev` / `staging.yml` for staging).

If instead a page that should answer 200 (`/faq`, `/privacy`, ...) answers 404, the route is missing from the index list ([scripts/lib/index-list.js](../scripts/lib/index-list.js)) - the route-tree test fails on that, so check `verify` on the deployed commit.

### Google sign-in returns to `localhost:8081`

This usually means Supabase fell back to its configured Site URL instead of completing at the production callback URL. Check in this order:

1. In Supabase Authentication -> URL Configuration, set Site URL to:

```text
https://selftend.org
```

2. In the same Supabase screen, make sure this exact redirect URL is present:

```text
https://selftend.org/auth-callback
```

3. Keep the local callback only as an additional development redirect, not as the Site URL:

```text
http://localhost:8081/auth-callback
```

4. In the GitHub Actions production variables, set and redeploy with:

```text
EXPO_PUBLIC_PUBLIC_APP_URL=https://selftend.org
```

5. After redeploy, retry from a fresh browser tab. If a token-bearing URL was exposed during testing, sign out of the app and revoke or expire that session before continuing.

### Expo Go sign-in opens the production site

This usually means the `redirectTo` URL generated by Expo Go was not allowed by Supabase, so Auth fell back to the configured Site URL.

Check in this order:

1. Confirm the app is running in Expo Go from a local Metro server.
2. In Supabase Authentication -> URL Configuration, add:

```text
exp://**/--/auth-callback
exp://<your-lan-ip>:8081/--/auth-callback
```

3. Retry Google sign-in from Expo Go and watch Metro for the `[auth] Google OAuth redirect` log. The `redirectTo` and `oauthRedirectTo` values should match an allowed Supabase redirect URL.
4. If the flow still does not return to Expo Go, switch to the Android development build and verify `selftend-dev://auth-callback` is allowed. Expo Go is not the reliable path for OAuth callback verification.

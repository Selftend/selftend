# What build identity an Expo web export on Cloudflare Workers can expose

> Research for [update-banner wayfinder ticket #385](https://github.com/Selftend/selftend/issues/385)
> (map [#381](https://github.com/Selftend/selftend/issues/381)), resolved 2026-07-27.
> **Facts only.** The mechanism decision is [#386](https://github.com/Selftend/selftend/issues/386);
> nothing here recommends one.

## Method

Three evidence classes, kept distinct throughout:

- **Repo** — `app.config.ts`, `.github/workflows/web-deploy.yml`, `.github/workflows/release.yml`,
  `.github/workflows/staging.yml`, `wrangler.toml`, `wrangler.staging.toml`, `public/_headers`,
  `public/index.html`, `src/lib/env.ts`, `src/lib/notifications.ts`, `src/providers/app-providers.tsx`,
  `package.json`.
- **Live probes** — `curl` against `https://selftend.org` (Worker `selftend`, build of `v0.6.1`) and
  `https://staging.selftend.org` (Worker `selftend-staging`), 2026-07-27. These are the actual deployed
  artefacts, so they beat any doc reading where the two disagree.
- **A local export** — `npm run export:web` run in a clean worktree, to read `dist/` directly.
- **Primary docs / source** — Expo docs and the `expo/expo` CLI source; Cloudflare Workers docs.

Where a claim could not be confirmed it says **unconfirmed** rather than guessing.

---

## 1. What `expo export --platform web` produces per build

The app config sets `web.bundler: "metro"`, `web.output: "single"` (`app.config.ts`), so the export is a
single-page app: one `index.html`, no per-route HTML.

A local `npm run export:web` produced 98 files. Its own summary:

```
› web bundles (3):
_expo/static/css/web-c369630eb2af1026b0c4ec6871d35b1d.css  (48KB)
_expo/static/js/web/index-60076808c631aef0e236ab1ed555e1bc.js  (7.6MB)
_expo/static/js/web/index-e26d466a0b3ef3a43637cee53b788100.js  (814KB)

› Files (3):
favicon.ico  (15KB)
index.html   (1.6KB)
metadata.json  (49B)
```

plus 86 files under `dist/assets/` (split into `dist/assets/assets/**` for repo assets and
`dist/assets/node_modules/**` for dependency assets), and the copied `public/` files.

`dist/` shape, cross-checked against production:

| Path                                                    | Content-hashed? | Notes                                                                                                              |
| ------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `index.html`                                            | n/a             | Rendered from `public/index.html`; names the **entry** JS bundle and the CSS                                       |
| `_expo/static/js/web/index-<32 hex>.js`                 | **yes**         | two of them: the entry (7.6 MB) and one async chunk (814 KB)                                                       |
| `_expo/static/css/web-<32 hex>.css`                     | **yes**         | e.g. `web-c369630eb2af1026b0c4ec6871d35b1d.css`                                                                    |
| `assets/{assets,node_modules}/**/<name>.<32 hex>.<ext>` | **yes**         | e.g. `assets/assets/branding/google-logo.db3c6e2a61cf942d0cbdff8effe23a12.png`                                     |
| `metadata.json`                                         | n/a             | See the negative result below                                                                                      |
| `favicon.ico`                                           | no              | Generated from `web.favicon`                                                                                       |
| everything in `public/`                                 | no              | `favicon.png`, `favicon-512.png`, `manifest.webmanifest`, `selftend-push-worker.js`, `.well-known/assetlinks.json` |

The hash is a 32-char lowercase MD5 of the bundle contents — `fileNameFromContents()` /
`hashString()` in
[`@expo/metro-config/src/serializer/exportPath.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/metro-config/src/serializer/exportPath.ts)
and [`utils/hash.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/metro-config/src/utils/hash.ts).

`public/` is copied into `dist/` verbatim
([Expo CLI reference](https://docs.expo.dev/more/expo-cli/)) — including `_headers` (`diff public/_headers
dist/_headers` is empty). Wrangler 4 then consumes `_headers` at upload time instead of publishing it:
`GET /_headers` on production returns the SPA fallback (`200 text/html`, index.html's ETag), i.e. it is
not in the asset manifest. Anything else dropped in `public/` **is** published as-is, which is the
mechanism a `version.json` would use.

### `metadata.json` is empty on web — the important negative result

Production and staging both serve, byte-identically:

```json
{ "version": 0, "bundler": "metro", "fileMetadata": {} }
```

That is by design, not a misconfiguration: `createMetadataJson()` returns early on
`platform === 'web'`, and the file exists only because `exportApp.ts` writes it "for EAS Update"
whenever any SPA platform is exported
([`createMetadataJson.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/export/createMetadataJson.ts),
[`exportApp.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/export/exportApp.ts)).
It carries **zero build identity**. It would also disappear entirely if `web.output` ever moved to
`"static"` or `"server"` (same source: the write is gated on `spaPlatforms.length`, and
`spaPlatforms` excludes web in those modes) — as would `assetmap.json` from `--dump-assetmap`.

### So what already differs between deploys, with no code change

1. **The entry bundle filename** (`index-<md5>.js`), readable only by fetching `/` and parsing the
   `<script src>` out of the HTML. `index.html` names only the entry bundle, not the async chunk — but
   the chunk's hashed filename appears _inside_ the entry bundle (verified by grep), so the entry hash
   transitively covers chunk changes.

   It is a **content** hash, not a build id: two deploys of the same commit produce the same hash, and
   a different commit that serializes identically produces the same hash too. That is not theoretical —
   the local export from this research branch emitted
   `_expo/static/css/web-c369630eb2af1026b0c4ec6871d35b1d.css`, **byte-for-byte the same filename
   production is serving from `v0.6.1`**, while the JS hash differed. Any "has the build changed?"
   check keyed on a single artefact's hash will miss changes that do not touch that artefact.

2. **`index.html`'s ETag**, generated by Cloudflare as a hash of the file
   ([Workers static-assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)).
   Since the bundle URL is embedded in the HTML, this changes exactly when (1) changes. Verified:
   `GET /` → `ETag: "5314b2774bb2e2438e4464e706cf0dbd"`, and a conditional `If-None-Match` request
   returns `304 Not Modified`.
3. **`Constants.expoConfig.version`** — already inlined into the web bundle and already read at
   `src/providers/app-providers.tsx:40` as the React Query persist `buster`. It is `package.json`'s
   version (`app.config.ts` sets `version: appVersion` from `package.json`, bumped by release-please),
   so it is `0.6.1` today. It changes only on a release, so it does **not** distinguish two deploys of
   the same version — including every staging deploy, which is every push to `dev`.

`expo-updates` is not a dependency and
[does not support web](https://docs.expo.dev/versions/latest/sdk/updates/) (platform list is Android /
iOS / tvOS). There is no Expo-supplied update channel on web.

---

## 2. Can the build inject its own identity?

**Yes, two mechanisms, both already partly in use.**

### `EXPO_PUBLIC_*` — the existing plumbing

`.github/workflows/web-deploy.yml` sets **13** `EXPO_PUBLIC_*` values in the job `env:` block. Most are
consumed in `src/lib/env.ts` as literal `process.env.EXPO_PUBLIC_X` member expressions with a fallback;
`EXPO_PUBLIC_EAS_PROJECT_ID` and `EXPO_PUBLIC_PUBLIC_APP_URL` are additionally read in `app.config.ts`
at export time. Rules that matter, from
[Environment variables in Expo](https://docs.expo.dev/guides/environment-variables/):

- Values are **inlined** at export time — the compiled bundle contains the literal string.
- The reference must be static dot notation. `process.env['EXPO_PUBLIC_X']` and destructuring are
  **not** inlined.
- Code inside `node_modules` is never substituted.
- `EXPO_NO_CLIENT_ENV_VARS=1` disables inlining entirely; neither workflow sets it.
- Everything inlined is public, in plain text, in the shipped bundle.

**The constraint the ticket asks about:** all 13 existing values come from `vars.*` — GitHub
_Environment_ variables, which are static per environment. A per-build value **cannot** come from
`vars.*`. It has to be a computed expression in the job `env:` block, e.g.

```yaml
EXPO_PUBLIC_BUILD_ID: ${{ inputs.ref }}
```

That is a one-line workflow edit, but it is a different source class from every existing variable, and
the `Check deploy environment` guard loop (`web-deploy.yml` lines 74–94) would need it added if it is
to be required rather than best-effort.

What is actually available at export time in that job:

| Value                          | Production                                    | Staging                                       |
| ------------------------------ | --------------------------------------------- | --------------------------------------------- |
| `inputs.ref`                   | release tag, e.g. `v0.6.1` (`release.yml:85`) | the triggering commit SHA (`staging.yml:161`) |
| `github.sha`                   | SHA of the workflow ref                       | same                                          |
| `github.run_id` / `run_number` | unique per run                                | unique per run                                |

Note the asymmetry: on production `inputs.ref` is a **tag**, so a re-run of the same release deploys the
same identity string; on staging it is already a per-commit SHA.

**Local exports get nothing.** `npm run export:web` is
`npm exec expo -- export --platform web --clear` — no `--env-file`, unlike `npm start` which passes
`--env-file=.env.local`. There is no committed `.env`. So outside CI every `EXPO_PUBLIC_*` falls back
to the defaults in `src/lib/env.ts`, and a build-id variable would be empty. Any consumer has to
tolerate an empty value.

### Getting a per-build _file_ into `dist/` (as opposed to a value into the bundle)

Two placements exist, and the workflow already demonstrates the second:

- write the file into `public/` **before** `npm run export:web`, and the export copies it into `dist/`;
- write it into `dist/` **after** the export — exactly what the "Mark staging as noindex" step does
  today (`web-deploy.yml:106` appends to `dist/_headers` between the export and the deploy).

Either way `wrangler deploy` uploads whatever is in `dist/`. No extra tooling is needed for a
per-build file to exist; the open questions are only which identity it carries and how it is read.

### `extra` via `expo-constants` — works on web, and is already used

`babel-preset-expo`'s
[`expo-inline-manifest-plugin`](https://github.com/expo/expo/blob/main/packages/babel-preset-expo/src/plugins/expo-inline-manifest-plugin.ts)
replaces `process.env.APP_MANIFEST` with a string literal of the public app config, gated on
`platform === 'web' || isReactServer` — i.e. **web only**; native is explicitly excluded.
`ExponentConstants.web.ts` reads that, so `Constants.expoConfig.version`, `.runtimeVersion` and
`.extra` are all readable on web and frozen at bundle time. `extra` is not in the plugin's
`RESTRICTED_MANIFEST_FIELDS` strip list.

Two caveats:

- `app.config.ts` is evaluated in Node during export, **after** `loadEnvFiles(projectRoot)` runs
  (`exportApp.ts`), so it can read `process.env.*` — including non-`EXPO_PUBLIC_` names. Values are
  read there, not inlined there.
- Whether a changed `app.config.ts` value reliably busts Metro's Babel transform cache is
  **unconfirmed** (the inline-manifest plugin memoises the config in a module-level variable). In this
  repo it is moot for deploys: `export:web` already passes `--clear`.

---

## 3. Cloudflare Workers static assets: what is served, and how it is cached

### The current setup is assets-only — there is no Worker script

`wrangler.toml` (prod, Worker `selftend`) and `wrangler.staging.toml` (staging, Worker
`selftend-staging`) are three lines each:

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

No `main`, no `binding`, no `html_handling` override, no `run_worker_first`. The complete set of
`[assets]` keys is `directory`, `binding`, `html_handling`, `not_found_handling`, `run_worker_first`
([Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)) — **there
is no `headers` key.** Response headers are configured only by the `_headers` file.

### `_headers` _is_ honoured — the recorded gotcha is narrower than remembered

The project memory records "Cloudflare does not honour `_headers` the way Netlify did." The live site
says otherwise, and `web-deploy.yml` lines 115–129 explain why: **Wrangler 3.90 uploaded `_headers` as a
plain asset; Wrangler 4.x applies it.** The workflow pins `wranglerVersion: "4"` and runs the whole job
on Node 22 for that reason. Four independent confirmations from production/staging today:

| Probe                                                | Result                                                        | Which `_headers` rule                       |
| ---------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| `GET https://selftend.org/`                          | full CSP, HSTS, `X-Frame-Options: DENY`, `Permissions-Policy` | `/*`                                        |
| `GET https://staging.selftend.org/`                  | additionally `x-robots-tag: noindex`                          | the staging-only append in `web-deploy.yml` |
| `GET /assets/assets/branding/google-logo.<hash>.png` | `Cache-Control: public, max-age=31536000, immutable`          | `/assets/*`                                 |
| `GET /selftend-push-worker.js`                       | `Cache-Control: no-cache`                                     | `/selftend-push-worker.js`                  |

**The last row is the direct answer to the ticket's third bullet: a single named path already gets its
own `Cache-Control: no-cache` in this exact setup, and it works.** The knob is a rule block in
`public/_headers`; documented limits are 100 header rules and 2,000 characters per line
([Workers `_headers`](https://developers.cloudflare.com/workers/static-assets/headers/)).

### The default is already `no-cache`-ish

Everything not matched by a `_headers` rule comes back as:

```
Cache-Control: public, max-age=0, must-revalidate
ETag: "<hash of the file>"
```

Confirmed on `/`, `/manifest.webmanifest`, `/metadata.json`, `/.well-known/assetlinks.json`, and — the
interesting one — on `/_expo/static/js/web/index-<hash>.js` and the CSS. This matches Cloudflare's
documented default. Two consequences:

- **There is no aggressive default cache to fight.** A stable-named `version.json`-style file would be
  browser-revalidated on every request without any `_headers` rule at all; a rule would only be
  belt-and-braces.
- **The content-hashed JS/CSS are _not_ served immutable** — `/assets/*` in `_headers` does not cover
  `/_expo/static/*`, so the bundles pay a revalidation round-trip on every load. That is a latent
  performance gap, unrelated to this ticket but worth its own issue.

### Two dead or imprecise rules in the current `_headers`

- `/index.html` → `Cache-Control: no-cache` is a **no-op**. Cloudflare's default
  `html_handling: "auto-trailing-slash"` makes `GET /index.html` a `307` redirect to `/`; the rule lands
  on the redirect, not on the document. The document at `/` gets the platform default (which is
  equivalent in effect, so nothing is broken).
- `/assets/*` does not cover `/_expo/static/*` (above).

### Blocking constraint: `not_found_handling = "single-page-application"` masks 404s

Verified: `GET https://selftend.org/version.json` — a path that does not exist — returns
**`200 OK` with `Content-Type: text/html`** and index.html's body and ETag, not a 404. Same for
`/assetmap.json`, `/_expo/manifest.json`, and any other missing path.

Anything that polls a JSON file therefore has to treat a non-JSON `200` as "no information available",
never as an error and never as something to `JSON.parse` unguarded. This also covers the rollback case:
after a rollback to a build that predates the file, the poll silently starts receiving HTML.

### Edge cache vs browser cache

`CF-Cache-Status: HIT` is present on asset responses, so there is a Cloudflare edge layer in front of
the browser layer. Whether `wrangler deploy` immediately invalidates the edge copy of a **stable-named**
file is **not documented by Cloudflare** and is therefore unconfirmed; the static-assets docs describe
automatic and tiered caching but say nothing about deploy-time invalidation semantics. Empirically the
site does serve fresh content after deploys, so this is a "verify with two deploys before relying on
it" item, not a known blocker. It applies equally to a `version.json` and to `/` itself, since both
have stable names.

### CSP does not need to change

`public/_headers` already sets `connect-src 'self' https://*.supabase.co https://accounts.google.com`,
so any same-origin poll — `fetch("/version.json")`, or a `HEAD`/conditional `GET` on `/` — is already
allowed. `worker-src 'self'` is also already present.

---

## 4. Service workers

### Expo ships none — but **this app already has one, registered for every web visitor**

`expo export --platform web` emits no service worker; Expo's
[Progressive Web Apps guide](https://docs.expo.dev/guides/progressive-web-apps/) treats it as a manual,
opt-in Workbox step and carries an explicit warning:

> Be careful adding service workers as they are known to cause unexpected behavior on web. If you
> accidentally ship a service worker that aggressively caches your website, users cannot request
> updates easily.

Selftend nonetheless has one: `public/selftend-push-worker.js`, served from the root and therefore at
**scope `/`**. It is registered **unconditionally on every web page load**, not only when push is
enabled — `src/providers/app-providers.tsx:51` calls `void registerWebPushServiceWorker()` in the mount
effect, which calls `navigator.serviceWorker.register("/selftend-push-worker.js")`
(`src/lib/notifications.ts:168-180`). Push _subscription_ is separately gated on consent and a VAPID
key; registration is not.

What that worker does: `push` and `notificationclick` handlers only. **It has no `fetch` handler**, so
it intercepts and caches nothing — none of the "SW pins a stale app forever" failure mode exists today.

### What introducing update-detection via a service worker would actually cost

The usual first cost — deciding to have a service worker at all, shipping the file, root scope, CSP
`worker-src 'self'`, and a `_headers` `no-cache` rule so the script itself is picked up — is **already
paid**. What is not paid:

- A `fetch` handler, which is what turns a service worker into a caching layer and creates exactly the
  update trap Expo warns about. Update detection via `registration.update()` / `updatefound` /
  `waiting` / `skipWaiting` does not strictly require one, but the lifecycle wiring and its tests are
  new surface.
- **A scope collision.** A registration is keyed by scope, and both the push worker and any new worker
  would want scope `/`. The app calls `register()` with the push worker's URL on every load, so a
  second `register()` with a different script at `/` would have the two fighting over the same
  registration on every page load. Any root-scope service worker introduced for update detection has to
  **absorb the existing `push` and `notificationclick` handlers** — otherwise web reminders stop being
  displayed — or be scoped somewhere other than `/`, which limits what it can observe. This is the one
  finding here that can rule an option out on its own.
- Browsers cap service-worker script freshness independently (max ~24h), so SW-based detection has its
  own latency floor regardless of `Cache-Control`.

Cloudflare publishes nothing about Workers static assets interacting with a browser service worker at
root scope — **unconfirmed**, though nothing observed suggests a problem. (Cloudflare's own "service
worker syntax" for Worker scripts is an unrelated naming collision.)

---

## Corrections to premises worth carrying into #386

1. **`metadata.json` is useless for web.** It is present and served, and it is empty on every build.
2. **Cloudflare sends no `immutable` by default.** Everything is `max-age=0, must-revalidate` + ETag,
   hashed or not. There is no aggressive default cache to defeat; if anything the gap runs the other
   way, at `/_expo/static/*`.
3. **`_headers` works.** The recorded gotcha is specifically Wrangler 3.90 vs 4.x, and the pin is
   already in `web-deploy.yml`. Per-path `Cache-Control` is proven live on `/selftend-push-worker.js`.
4. **A missing file returns `200 text/html`, not `404`,** because of SPA fallback.
5. **A root-scope service worker already exists and is registered on every load.** "Introducing a
   service worker" is not the decision; "changing the one we have" is.
6. **Per-build identity cannot come from `vars.*`.** It has to be a computed expression in
   `web-deploy.yml`'s `env:` block, and it will be empty for local exports.
7. **On production the natural build identity is a release tag, not a SHA** — stable across re-runs of
   the same release. Staging already gets a per-commit SHA.

## Sources

- Expo — [Environment variables](https://docs.expo.dev/guides/environment-variables/)
- Expo — [Publishing websites](https://docs.expo.dev/guides/publishing-websites/)
- Expo — [Progressive Web Apps](https://docs.expo.dev/guides/progressive-web-apps/)
- Expo — [Expo CLI reference](https://docs.expo.dev/more/expo-cli/)
- Expo — [`expo-constants`](https://docs.expo.dev/versions/latest/sdk/constants/),
  [`expo-updates`](https://docs.expo.dev/versions/latest/sdk/updates/)
- `expo/expo` source —
  [`exportApp.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/export/exportApp.ts),
  [`createMetadataJson.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/export/createMetadataJson.ts),
  [`exportPath.ts`](https://github.com/expo/expo/blob/main/packages/%40expo/metro-config/src/serializer/exportPath.ts),
  [`expo-inline-manifest-plugin.ts`](https://github.com/expo/expo/blob/main/packages/babel-preset-expo/src/plugins/expo-inline-manifest-plugin.ts)
- Cloudflare — [Static assets](https://developers.cloudflare.com/workers/static-assets/),
  [Headers (`_headers`)](https://developers.cloudflare.com/workers/static-assets/headers/),
  [Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/),
  [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
  [Advanced routing changelog, 2025-06-17](https://developers.cloudflare.com/changelog/2025-06-17-advanced-routing/)
- Live probes of `https://selftend.org` and `https://staging.selftend.org`, 2026-07-27

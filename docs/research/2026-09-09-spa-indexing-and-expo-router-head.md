# How crawlers handle a JS-only SPA, and what Expo Router and Cloudflare offer for a per-route head

Date: 2026-09-09 · Map: #2281 · Ticket: #2284 (research)

Everything below was read on 2026-09-09 from primary sources only: Google Search Central,
the Bing Webmaster Blog, Cloudflare's Workers static-assets docs, docs.expo.dev, and the
installed Expo source in the main checkout's `node_modules` (`expo` 57.0.7, `expo-router`
57.0.7, `@expo/cli` 57.0.9, `@expo/router-server` 57.0.3, `expo-server`). Pages that could
not be fetched are named as such rather than paraphrased from memory.

## Headline

- **Google renders JavaScript and indexes a runtime-set `<title>`/description.** Its own
  wording: "You can use JavaScript to set or change the meta description as well as the
  `<title>` element." The cost is the render queue - every `200` page waits in it, "a few
  seconds, but it can take longer" - and that until rendered, every route on selftend.org is
  the same `public/index.html`: one title, one description, an empty `<div id="root">`.
- **Bing renders with an evergreen Edge, but says itself it cannot do so "at scale on every
  page of every website"** and recommends prerendered static HTML for JS-heavy sites. Bing
  has no statement on runtime-set titles that could be found; its help pages are themselves
  JS-rendered and returned no body to the fetcher.
- **`expo-router/head` works at runtime under `web.output: "single"`** - on web it is a thin
  wrapper over vendored `react-helmet-async`, and the provider is mounted unconditionally in
  the entry. What `single` cannot do is put those tags in the HTML file: `expo export` writes
  one `index.html` from the `public/index.html` template without rendering React at all. The
  config reference is blunt: `single` "has no statically indexable HTML".
- **`web.output: "static"` renders the whole app tree in Node once per route** and writes
  `<route>.html` with the Helmet tags baked in. Route enumeration comes from the file tree,
  not from what a layout chooses to render - the `(app)/…` files WILL be exported, and each
  one will contain whatever `ProtectedLayout` renders while `useSession()` is `"loading"`
  (the spinner), not the screen. `+not-found` exports as `+not-found.html`; the HTTP status is
  the host's business.
- **`web.output: "server"` cannot run on Cloudflare's assets-only Worker.** It needs a request
  handler; `expo-server` ships a `workerd` adapter, so it CAN run on Workers - but only with a
  `main` script, which `wrangler.toml` does not have today.
- **Cloudflare: a real 404 for unknown paths needs `not_found_handling = "404-page"` plus a
  `404.html`** (Expo writes `+not-found.html`, so a rename is a custom post-export step). The
  current `"single-page-application"` value answers every unknown path with `index.html` and
  `200`. `_redirects` cannot do `www` → apex ("Domain-level redirects" is a ❌ in the support
  table); that is a zone-level Redirect Rule.
- **"Prerender only the public routes" is not a documented Expo path.** It is a `static` export
  plus a post-export step (delete the gated HTML files, choose the fallback behaviour), and the
  two Cloudflare fallback modes force a choice between "real 404s" and "SPA deep links".

## 1. What crawlers do with a JS-only SPA

### Google

| Claim                                                                                                                                                                                                     | Source (checked 2026-09-09)                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Three phases: crawling, rendering, indexing. "Googlebot queues all pages with a `200` HTTP status code for rendering, unless a robots `meta` tag or header tells Google not to index the page."           | [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)                  |
| "The page may stay on this queue for a few seconds, but it can take longer than that."                                                                                                                    | same                                                                                                                                   |
| "Google Search runs JavaScript with an evergreen version of Chromium."                                                                                                                                    | same                                                                                                                                   |
| "You can use JavaScript to set or change the meta description as well as the `<title>` element."                                                                                                          | same                                                                                                                                   |
| "Google can only discover your links if they are `<a>` HTML elements with an `href` attribute." Use the History API, not fragments.                                                                       | same                                                                                                                                   |
| Non-`200` pages (e.g. `404`) may skip rendering entirely.                                                                                                                                                 | same                                                                                                                                   |
| "During the crawl, Google renders the page and runs any JavaScript it finds using a recent version of Chrome."                                                                                            | [How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works)                                            |
| Soft 404 in a SPA: "Use a JavaScript redirect to a URL for which the server responds with a `404` HTTP status code", or "Add a `<meta name="robots" content="noindex">` to error pages using JavaScript." | [Fix Search-related JavaScript problems](https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript) |
| "When Google encounters the `noindex` tag, it may skip rendering and JavaScript execution" - so JS cannot reliably REMOVE a noindex.                                                                      | same                                                                                                                                   |
| "WRS does not retain state across page loads: Local Storage and Session Storage data are cleared across page loads. HTTP Cookies are cleared across page loads."                                          | same                                                                                                                                   |
| "Googlebot caches aggressively ... WRS may ignore caching headers." Fingerprint filenames.                                                                                                                | same                                                                                                                                   |
| "Google doesn't index URLs that return a `4xx` status code, and URLs that are already indexed and return a `4xx` status code are removed from the index." A `2xx` on an error page → "soft 404".          | [HTTP status codes](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)                                   |
| `301` is "a strong signal that the redirect target should be processed"; `302`/`307` are "a weak signal".                                                                                                 | same                                                                                                                                   |
| "Dynamic rendering was a workaround and not a long-term solution"; the alternatives named are server-side rendering, static rendering, hydration.                                                         | [Dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)                          |

**`<noscript>`:** none of the pages above says anything about how noscript content is
treated - not in the JS basics, the fix-JS page, the lazy-loading page, nor How Search Works.
Treat "the noscript text is what a no-JS crawler indexes" as unsupported by Google's docs.

**What a crawler gets from selftend.org before rendering (any route):** the `public/index.html`
shell - one static `<title>`, one `description`, one set of `og:`/`twitter:` tags with no
`og:url` (deliberately, see the comment in `public/index.html`), the
`<noscript>You need to enable JavaScript to run this app.</noscript>`, and an empty
`<div id="root"></div>`. Status `200` for every path, because `wrangler.toml` sets
`not_found_handling = "single-page-application"`. So pre-render, `/faq`, `/crisis` and
`/some-garbage` are byte-identical documents; post-render, only what the app mutates at
runtime differs - and today nothing does, because nothing in `app/` or `src/` imports
`expo-router/head` (grep, 2026-09-09).

### Bing

| Claim                                                                                                                                                                                                                          | Source (checked 2026-09-09)                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "bingbot is generally able to render JavaScript" but it is "difficult for bingbot to process JavaScript at scale on every page of every website, while minimizing the number of HTTP requests at the same time".               | [bingbot Series: JavaScript, Dynamic Rendering, and Cloaking](https://blogs.bing.com/webmaster/october-2018/bingbot-Series-JavaScript,-Dynamic-Rendering,-and-Cloaking-Oh-My), 2018 |
| Recommends dynamic rendering for "websites relying heavily on JavaScript": detect the bingbot user agent and serve prerendered static HTML. Not cloaking "as long as you make a good faith effort to return the same content". | same                                                                                                                                                                                |
| "Bingbot will be evergreen as we are committing to regularly update our web page rendering engine to the most recent stable version of Microsoft Edge."                                                                        | [The new evergreen Bingbot](https://blogs.bing.com/webmaster/october-2019/the-new-evergreen-bingbot-simplifying-seo-by-leveraging-microsoft-edge), 2019-10-09                       |

**Not fetchable:** the Bing Webmaster Guidelines
(`bing.com/webmasters/help/webmaster-guidelines-30fba23a`) and "Which crawlers does Bing use"
(`.../which-crawlers-does-bing-use-8c184ec0`) returned only a page title to the fetcher - the
help centre is itself a JS-rendered app. **No Bing statement about indexing a runtime-set
`<title>` was found.** Assumption: a rendered page's DOM title is what an Edge-based renderer
sees, so it should be picked up when Bing renders - but Bing's own 2018 post says rendering is
not guaranteed at scale, so a JS-only title is best treated as unreliable on Bing.

## 2. Expo Router's options (SDK 57)

Repo state: `web.output: "single"` (`app.config.ts`), `expo-router` plugin with no options,
`public/index.html` as the shell (Expo substitutes only `%WEB_TITLE%` and `%LANG_ISO_CODE%` -
`@expo/cli/build/src/start/server/webTemplate.js:80-82`), gate in
`src/components/app/protected-layout.tsx` (renders an `ActivityIndicator` while
`status === "loading"`, the auth landing when there is no session), `dangerouslySingular` on
the auth and legal screens (`app/(auth)/_layout.tsx`, `src/components/app/app-shell.tsx`).

The three values, per the config reference
([app config: `web.output`](https://docs.expo.dev/versions/latest/config/app/), checked
2026-09-09): `single` "outputs a Single Page Application (SPA), with a single `index.html` in
the output folder, and has no statically indexable HTML"; `static` "statically renders HTML
files for every route in the `app/` directory"; `server` "outputs static HTML, and API Routes
for hosting with a custom Node.js server".

| Output   | What a no-JS crawler gets per route                                                                                                   | Host needs                                                                                                           | Gated `(app)/…` routes at export                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `single` | The one `public/index.html`: same title/description for every path, empty `#root`, `200` via SPA fallback                             | Static files + SPA fallback (today's `wrangler.toml`)                                                                | Nothing is rendered at export; the gate runs only in the browser                                                                                         |
| `static` | A per-route HTML file rendered in Node: the route's own Helmet tags in `<head>`, the server-rendered DOM of whatever the tree renders | Static files; `+not-found.html` needs a host rule to become a `404`                                                  | Enumerated from the file tree and rendered; content = the `"loading"` branch of `ProtectedLayout` (spinner), unless something in the tree throws in Node |
| `server` | Same per-route HTML as `static` (SSR is a separate opt-in), plus API routes; `+not-found` served with a real `404`                    | A request handler on a WinterCG runtime - on Cloudflare that is a Worker script (`main`) using the `workerd` adapter | As `static`                                                                                                                                              |

### `single` + `expo-router/head`

- **Works at runtime, independent of output mode.** `expo-router/build/head/ExpoHead.js`
  (the web file) is: `Head = ({children}) => useIsFocused() ? <Helmet>{children}</Helmet> : null`,
  with `Head.Provider = HelmetProvider` from `expo-router/vendor/react-helmet-async`. The
  provider is mounted around `ExpoRoot` in `expo-router/build/qualified-entry.js:20` for every
  web build. Nothing in the file checks the output mode. Only the focused screen's `<Head>`
  contributes, so a stack of screens does not fight over the title.
- **Does nothing at export under `single`.** `@expo/cli/build/src/export/exportApp.js:285-303`
  writes `index.html` from `createTemplateHtmlFromExpoConfigAsync` - a string template over
  `public/index.html` - and the static-render path (`exportFromServerAsync`) only runs when
  `useServerRendering` is true, i.e. `static` or `server` (`exportApp.js:352-388`).
- **The docs' `Head` section lives on the static-rendering page** and shows it as the way to
  add "page-specific metadata"; the page does not say it is static-only, and the source
  confirms it is not
  ([Static rendering › Meta tags](https://docs.expo.dev/router/reference/static-rendering/),
  checked 2026-09-09).
- Net: under `single`, `<Head>` gives Google a per-route title/description AFTER rendering
  (which Google documents as indexable), and gives Bing and every no-JS fetcher nothing.

### `static`

Source: `@expo/cli/build/src/export/exportStaticAsync.js` and
`@expo/router-server/build/static/renderStaticContent.js` (both under
`node_modules/expo/node_modules/@expo/cli/`), plus
[Static rendering](https://docs.expo.dev/router/reference/static-rendering/) and
[Protected routes](https://docs.expo.dev/router/advanced/protected/), checked 2026-09-09.

- **Per-route HTML.** `getHtmlFiles()` walks the linking manifest and emits one entry per leaf
  screen; with `includeGroupVariations: !exportServer` (`exportStaticAsync.js:122`) it also
  emits every group-segment variation of a path via `getPathVariations`. Each becomes
  `<path>.html` (`exportStaticAsync.js:444-461`); `*not-found` is written as `+not-found`,
  so the unmatched route exports as `+not-found.html`.
- **What runs at export.** `renderAsync` → `getStaticContent(location)` →
  `ReactDOMServer.renderToString(<Head.Provider context={headContext}><InnerRoot><ExpoRoot
location=… wrapper={Root › <div id="root">}/>…)` (`renderStaticContent.js:71-96`). That is
  the whole app - `app/_layout.tsx` and everything under it - executed in Node once per
  route. The Helmet output collected in `headContext` is spliced in after `<head>`
  (`mixHeadComponentsWithStaticResults`, lines 126-134), then CSS, `expo-font` resources,
  favicon and the hydration scripts.
- **`app/+html.tsx`** is the `Root` above: `getRootComponent()` takes the single default export
  from the `+html` context, else the built-in `Html` (`getRootComponent.js`). The doc:
  "This file is web-only and used to configure the root HTML for every web page during static
  rendering"; "The contents of this function only run in Node.js environments and do not have
  access to the DOM or browser APIs"; global CSS imports are unsupported there. `public/index.html`
  is NOT the template in this mode - its inline first-paint script and the `og:` block would
  have to move into `+html.tsx`.
- **Gated routes.** The documented exclusion is for `Stack.Protected`: "Protected screens are
  evaluated on the client side only. During static site generation, no HTML files are created
  for protected routes. However, if users know the URLs of these routes, they can still request
  the corresponding HTML or JavaScript files directly." Selftend's gate is not `Stack.Protected` -
  it is a component-level branch in `ProtectedLayout` - and `getHtmlFiles` reads the file tree,
  so every `(app)/…` route is enumerated and rendered. At that moment `SessionProvider` starts
  at `status: "loading"` (`src/providers/session-provider.tsx:37`), so `ProtectedLayout`
  returns its spinner branch (`protected-layout.tsx:100-105`): each gated HTML file would carry
  the spinner and the root layout's chrome, and hydrate into the real gate in the browser. That
  is a private-data-safe outcome (nothing user-specific exists at export), but it is an
  **assumption until a spike runs `expo export` with `static`** - the root layout calls
  `Sentry.wrap`, `SplashScreen.preventAutoHideAsync`, `useFonts`, i18n and the Supabase client
  at module scope, and any of those may throw in Node. The auth reference says the same in
  general terms: "Expo Router on the web currently only supports build-time static generation
  and has no support for custom middleware or serving"
  ([Authentication](https://docs.expo.dev/router/reference/authentication/), checked
  2026-09-09).
- **`dangerouslySingular`** is a navigator option - "When enabled, the navigator will reuse an
  existing screen instead of pushing a new one", "Only supported when used inside a Layout
  component" ([Stack](https://docs.expo.dev/versions/latest/sdk/router/stack/), checked
  2026-09-09). The export code never references it (grep of `exportStaticAsync.js` and
  `@expo/router-server/build/static/`), so it has no effect on which files are written.
- **`+not-found` and a real 404.** The static export writes `+not-found.html` and nothing else;
  Expo's static-rendering page has no sentence containing "404" or "+not-found" (fetched and
  searched, 2026-09-09). The "Not-found routes will be served last with a 404 status code"
  line on the [error-handling page](https://docs.expo.dev/router/error-handling/) sits in a
  "Route priority" list that also includes API routes, and the `404` is implemented in
  `expo-server` (`build/cjs/vendor/abstract.js:118-137, 199-212`) - i.e. it describes the
  `server` runtime, not a static host. On a static host the status is whatever the host's
  not-found rule says (§3).
- **`origin` / `headOrigin`.** Plugin options documented as: `origin` - "Production origin URL
  where assets in the public folder are hosted"; `headOrigin` - "A more specific origin URL used
  in the `expo-router/head` module for iOS handoff"
  ([Router config plugin](https://docs.expo.dev/versions/latest/sdk/router/), checked
  2026-09-09). In source both are read only by `expo-router/build/head/url.js:37-67`
  (`headOrigin ?? origin ?? generatedOrigin`, to build the `NSUserActivity.webpageUrl` for
  Handoff) and by `rsc/router/host.js:57` (RSC). The static/server export path does not read
  either (grep of `exportStaticAsync.js` and `renderStaticContent.js`): **neither option
  writes a canonical or `og:url` tag** - that stays the job of `<Head>` per screen.
- **`_sitemap`.** "Expo Router currently injects a `/_sitemap` automatically that provides a
  list of all routes in the app. This is useful for debugging"; disable with
  `["expo-router", { "sitemap": false }]`
  ([Sitemap](https://docs.expo.dev/router/reference/sitemap/), checked 2026-09-09). The page
  does not say it is dev-only, so under `static` expect a `_sitemap.html` unless disabled
  (assumption - not verified by running an export).

### `server`

- Output is `dist/client` + `dist/server`; "Server features require a custom server, which can
  be deployed to EAS or most other hosting providers"; the runtime must be WinterCG-compliant
  and the adapters live in `expo-server` (SDK 54+)
  ([API routes](https://docs.expo.dev/router/reference/api-routes/), checked 2026-09-09).
- Installed adapters (`node_modules/expo-server/build/cjs/vendor/`): `bun`, `eas`, `express`,
  `http`, `netlify`, `vercel`, **`workerd`**. `workerd.js` exports
  `createRequestHandler(params, setup)` returning a `(request, env, ctx)` fetch handler - a
  Worker script, not an asset.
- Per-route HTML under `server` is the same build-time render as `static`
  (`exportFromServerAsync`, `skipHtmlPrerendering` only when `unstable_useServerRendering` is
  on); request-time SSR is the separate `unstable_useServerRendering` plugin flag.
- **Cloudflare static assets without a Worker script cannot host it.** The assets-only Worker
  serves files; the `server` output's routes manifest, API routes and `404` for
  `notFoundRoutes` are all executed by the request handler. Wrangler's reference: "The `main`
  key is optional for assets-only Workers" - `server` output needs `main`
  ([Wrangler configuration › assets](https://developers.cloudflare.com/workers/wrangler/configuration/#assets),
  checked 2026-09-09). Adding `main` is an architecture change under the control-tower rule.

## 3. Cloudflare Workers static assets

All checked 2026-09-09.

**`html_handling`**
([HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)):

| Value                           | Behaviour (redirects are `307`)                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auto-trailing-slash` (default) | `/file` → `200` from `file.html`; `/file.html` and `/file/` → `307` to `/file`; `/folder` → `307` to `/folder/`; `/folder/` → `200` from `folder/index.html` |
| `force-trailing-slash`          | Everything canonical WITH a slash; `/file` → `307` to `/file/`                                                                                               |
| `drop-trailing-slash`           | Everything canonical WITHOUT a slash; `/folder/` → `307` to `/folder`                                                                                        |
| `none`                          | "disable the built-in HTML handling entirely"; only exact file paths return `200`                                                                            |

So a `static` export's `faq.html` serves `/faq` with `200` under the default - the URLs the
app already uses.

**`not_found_handling`**
([Wrangler configuration › assets](https://developers.cloudflare.com/workers/wrangler/configuration/#assets),
[SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/),
[SSG routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)):

| Value                                  | Unknown path returns                                                                                                        | Real `404`? |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `none` (default)                       | No special handling; the SPA page notes a missing `/index.html` yields "`404 Not Found` response with a null body"          | Yes, empty  |
| `404-page`                             | "the contents of the nearest `404.html` file with a `404 Not Found` status" - looked up from the request's directory upward | Yes         |
| `single-page-application` (repo today) | "the contents of the `/index.html` file with a `200 OK` status"                                                             | No          |

The value is per-Worker, so it is one or the other: real 404s for junk paths (`404-page`, needs
a `404.html` - Expo writes `+not-found.html`, so a copy/rename is a custom post-export step)
or SPA deep links for paths with no file (`single-page-application`). The only way to have
both is a Worker script with `run_worker_first` deciding per path - the SPA page's own
example returns `new Response(null, { status: 404 })` from a script. Navigation requests
(`Sec-Fetch-Mode: navigate`) skip the Worker script by default from compatibility date
2025-04-01, which the repo's `2026-07-01` is past.

**`_redirects`**
([Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)): format
`[source] [destination] [code?]`; codes `301, 302, 303, 307, 308` plus `200` proxying; "302 is
used as the default status code"; limits "2,000 static redirects and 100 dynamic redirects, for
a combined total of 2,100", 1,000 characters per line; splats and placeholders ✅;
**"Domain-level redirects" ❌**, as are query-parameter, country and cookie conditions.
So `www.selftend.org` → `selftend.org` is not a `_redirects` job. Cloudflare's documented
route for it is a zone-level Redirect Rule - the "Redirect from WWW to Root" example: wildcard
`https://www.*` → `https://${1}`, status `301`, preserve query string
([example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/)).
Note `app.config.ts` declares `applinks:www.selftend.org` on the assumption that BOTH hosts
serve the app directly with no redirect; a `www` → apex redirect changes that assumption and
should be checked against Universal Links before it ships.

**`_headers`**
([Headers](https://developers.cloudflare.com/workers/static-assets/headers/)): 100 rules per
file, 2,000 characters per line; "Redirects execute before headers, so in the case of a request
matching rules in both files, the redirect will win out"; not applied to responses generated by
Worker code. The doc says nothing about whether `_headers` rules apply to the
`not_found_handling` fallback response - the repo's `_headers` comment records the observed
behaviour (fallback comes back `max-age=0, must-revalidate`), which is an observation, not a
documented guarantee.

## 4. Prerendering only the public routes

Not a documented Expo path. Expo's route enumeration is all-or-nothing from the file tree
(§2 `static`), the only documented exclusion is `Stack.Protected`, and the deployment section
of the static-rendering page says the opposite of "hybrid": "You don't need to add
Single-Page Application styled redirects to your static hosting service. The static website is
not a single-page application." Google's own list of acceptable approaches is "server-side
rendering, static rendering, hydration" - prerendering the public surface IS static rendering
of a subset, so it is on the right side of that line; the question is only tooling.

What it would take, as a custom export step:

1. `web.output: "static"`, `app/+html.tsx` carrying what `public/index.html` carries today
   (first-paint palette script, `og:` block, CSP-hashed inline script), `<Head>` on each
   public screen (`index`, `faq`, `crisis`, `privacy`, `terms`, `cookies`, `security`,
   `account-deletion`).
2. Prove the tree renders in Node at all (the spike from §2).
3. After `expo export`: delete the `(app)/…` and `(auth)/…` HTML files if their spinner shells
   are unwanted, copy `+not-found.html` to `404.html`.
4. Pick the fallback: `404-page` gives search engines real 404s and breaks nothing for public
   URLs (each has a file), but a deep link to a deleted gated route becomes a `404` page that
   hydrates into the app - it works, with a `404` status. `single-page-application` keeps
   `200` everywhere and forfeits real 404s. Either is a one-line `wrangler.toml` change.

Alternatively, `Stack.Protected` around `(app)` and `(auth)` in `AppShell` would make Expo do
step 3's deletion itself ("no HTML files are created for protected routes") - but that
replaces the gate's component-level branch with a navigator guard, which is a product-facing
change (`#1027`'s `dangerouslySingular` rule, the auth landing, the age/consent gates all sit
in that branch) and out of this ticket's scope.

## Open questions

- Does `expo export` with `static` complete against this tree in Node (Sentry, splash,
  fonts, i18n, Supabase at module scope)? Spike, not research.
- Bing's position on runtime-set titles: no primary statement found; the help centre is not
  fetchable by a plain HTTP client.
- Whether `_headers` rules apply to the `not_found_handling` fallback response: undocumented;
  only observed.
- A `www` → apex redirect versus the `applinks:www.selftend.org` Universal Links declaration.

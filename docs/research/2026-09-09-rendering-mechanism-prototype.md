# The rendering mechanism, built rough and measured

Date: 2026-09-09 · Map: #2281 · Ticket: #2286 (prototype)

Three candidates for giving each public route its own `<head>`, each built on this branch
(`prototype/2286-rendering-head`, cut from `dev` at `4b3cfdcb`) and measured with the scripts
under `docs/research/2026-09-09-rendering-mechanism-prototype/`. Nothing here is argued from
the docs; every claim below was read off an export or a browser DOM. All exports ran
`expo export --platform web --clear` with the e2e Supabase env baked in, on the same tree.

**Throwaway.** The branch is linked from the ticket, never merged; the `<Head>` copy on the
FAQ route is deliberately labelled `PROTOTYPE-…` so it can never leak.

## Headline

| Candidate                                   | `/faq` without JS (what Bing, unfurlers, `curl` get)                | `/` without JS                                                    | Gated `(app)/…` route without JS               | Junk path                               | Export      | `dist/`            |
| ------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------- | ----------- | ------------------ |
| baseline (`single`, today)                  | one shared title/description, empty body, `200`                     | same shell                                                        | same shell                                     | shell, `200`                            | 106 s       | 27.6 MB, 102 files |
| **A** `single` + runtime `<Head>`           | **identical to baseline** - the shell; per-route tags only after JS | shell                                                             | shell                                          | shell, `200`                            | 59 s\*      | 27.6 MB, 102 files |
| **B** `static`                              | **own title, description, canonical, og:title + the full FAQ text** | the loading spinner (B) / **the full landing** (B2, one-line fix) | a spinner page with the app chrome, ×303 files | `+not-found.html`; status is the host's | 98 s / 87 s | 37.0 MB, 404 files |
| **C** `static` + prune to the public routes | as B                                                                | as B2                                                             | **no file** → the host's not-found rule        | `404.html`, `404`                       | B + <1 s    | 28.0 MB, 111 files |

\* the A export hit a warm Metro cache; B's log says "Bundler cache is empty, rebuilding" and
still came in under the baseline. Export time is not a differentiator: **`static` renders
303 routes in Node in the same wall time as the SPA build.**

**The Node render works.** The unverified premise from #2284 - that Sentry, the splash, fonts,
i18n and the Supabase client at module scope might throw under `renderToString` - is false
for the production export: 303 HTML files, no warnings in the log. (The `--dev --no-minify`
export does fail, in `tslib` interop inside `@expo/router-server`'s Node bundle, so a readable
hydration trace is not available by that route - see § Hydration.)

## A. Runtime head under `single`

`app/faq.tsx` wraps the screen in `<Head>` with a title, description, `og:title`, canonical
and `<html lang>`. The export is byte-for-byte the baseline apart from bundle hashes.

- **A no-JS fetch of `/faq` is the shell**: `<title>Selftend</title>`, the site description,
  body text `You need to enable JavaScript to run this app.` (46 chars). Bing's crawler, every
  link unfurler (Discord, Slack, WhatsApp, iMessage) and Google's _pre-render_ pass all see this.
- **After JS (Playwright, Chromium)**: `document.title` is the FAQ title, the canonical is
  present, and Google documents that it indexes exactly this.
- ☠️ **Helmet appends, it does not replace.** With the shell's static `description` and
  `og:title` left in `public/index.html`, the DOM after hydration carried **two** description
  tags and **two** `og:title` tags - the shell's first, Helmet's second. So A is not "add
  `<Head>` to eight screens": the shell's copy block must move out of `public/index.html` into a
  site-default `<Head>` in the root layout, which Helmet then dedupes (proven in B, where the
  root default and the FAQ override yield exactly one of each in file and DOM). That moves the
  description off the surface `test/positioning-copy.test.ts` scans, so the gate needs the
  layout file added to its surfaces.
- `lang`: `%LANG_ISO_CODE%` is `en` in the shell; `<html lang={i18n.language}>` inside `<Head>`
  flips it to `bg` for a Bulgarian-preference visitor at runtime (measured under B, same
  runtime), and only on screens that set it.
- Tests: all four (theme-web-surfaces, web-headers, positioning-copy, i18n-key-coverage)
  pass unchanged on A's tree. Nothing about the first-paint script or the CSP moves.
- What A cannot do, at any cost: a per-route unfurl card, a real `404`, anything Bing reads.

## B. `output: "static"`

`app.config.ts` → `output: "static"`; `public/index.html` deleted; `app/+html.tsx` carries the
first-paint palette script, theme-color, manifest and icon links and the style reset; the root
layout carries a site-default `<Head>` (title, description, `og:*`, `twitter:card`) that the
FAQ route's `<Head>` overrides.

- **`faq.html`**: `<title>Questions about Selftend - the FAQ</title>`, the FAQ description,
  `<link rel="canonical" href="https://selftend.org/faq">`, its own `og:title`, and **3,887
  characters of body text** - every question and answer, the crisis callout, the parents'
  letter. `crisis.html` (1,141 chars) and `privacy.html` (15,861 chars) carry their full prose
  under the site defaults. Exactly one description and one `og:title` per file.
- **The first-paint script is byte-identical** in every exported page (2,370 chars, diff
  empty) and its SHA-256 is the one already in `public/_headers`
  (`cp6uvOq7d5oXEI6cYviENOOu6LvvSgkGYbIK4vHOhiE=`). The CSP does not move. `_headers`,
  `manifest.webmanifest`, the push worker and the favicons are copied as before.
- ☠️ **`/` exports as the loading spinner** ("Loading / Preparing your workspace…", 247
  chars) because `SessionProvider` starts at `status: "loading"`. **B2** seeds it `"ready"`
  when `typeof window === "undefined"` (one line in `src/providers/session-provider.tsx`) and
  `index.html` becomes the full landing page: hero, eyebrow, the three entry buttons, 1,651
  chars. Cost: a signed-in visitor sees the landing HTML for the instant before hydration
  redirects them - today they see the spinner for that instant instead.
- ☠️ **Every gated route is exported.** 303 HTML files: 141 under `(app)/…`, 6 under
  `(auth)/…`, and a bare copy of each (`settings.html`, `modules/cbt/index.html`,
  `routines/[id].html`, …), plus `_sitemap.html` (empty) and `+not-found.html`. Each gated file
  is the `ProtectedLayout` spinner ("Restoring your session…", 245 chars) inside the app
  chrome and the cookie banner - nothing private, but 290 near-identical thin pages that a
  crawler can reach, 9.4 MB of HTML. `settings.html` is still the spinner under B2 (the gate's
  own loading branch, not the session's).
- **Hydration.** Chromium logs React error #418 ("hydration failed … this tree will be
  regenerated on the client") on every prerendered public page; the page then renders
  correctly. The server-vs-client DOM diff on `/faq` in English shows exactly two sources:
  the header logo (`Image` renders no `src`/`background-image` in Node) and every
  `@expo/vector-icons` glyph (`Icon` renders an empty `<div>` in Node, the glyph and its font
  styles only in the browser). Text, headings, classes and fonts match. Fixable later (render
  the glyph and the image source on the server); until then the cost is one client re-render
  per public page, which a crawler never sees. A Bulgarian-preference visitor mismatches on
  every text node too, by design - the file is English.
- **`<html lang="en" lang="en">`** on `faq.html`: `+html.tsx` sets it and Helmet injects its
  own. One of the two must own it.
- Tests: `test/theme-web-surfaces.test.ts` and `test/positioning-copy.test.ts` fail at import
  (`ENOENT public/index.html`); both read the shell off disk and need re-pointing at
  `app/+html.tsx` (script literal, theme-color, icon hrefs) and at the layout's `<Head>` copy.
  `web-headers.test.ts` and `test/i18n-key-coverage.test.ts` pass. `tsc --noEmit`: 0 errors.
  ESLint on the changed files: clean.
- **Playwright e2e**: `landing-page`, `guest-chrome`, `lateral-navigation`,
  `account-deletion` - **11 passed** against the static tree, unchanged suite. The e2e static
  server serves `index.html` for every extensionless path (it looks for `/faq`, not
  `faq.html`), so the suite exercises the SPA path over the rendered root page; it never saw a
  per-route file and needs no change.

## C. Prerender only the public routes

B2 plus a 40-line post-export step (`prune.js`): keep `index`, `faq`, `crisis`, `privacy`,
`terms`, `cookies`, `security`, `account-deletion` and `+not-found`; delete the other 294
HTML files; copy `+not-found.html` to `404.html`.

- `dist/`: 28.0 MB, 111 files, 10 HTML - the SPA build plus nine pages.
- Served with Cloudflare's `404-page` semantics (`serve.js … 404`): `/faq` → `200` with the
  full page; `/modules/cbt`, `/settings`, `/nonexistent-path` → **`404`** with the not-found
  page, which then **hydrates into the real screen** - `/modules/cbt` rendered the CBT module
  home for a fresh guest, status `404` notwithstanding. Deep links keep working; their HTTP
  status is what changes.
- Served with today's `single-page-application` semantics instead: every unknown path is the
  rendered `index.html` (the landing) with `200`, hydrating into the right screen - real 404s
  forfeited. **Which of the two is the URL-hygiene ticket's call**, not this one's; both are a
  one-line `wrangler.toml` change on top of C.
- The keep-list is a second place that knows which routes are public. A test can pin it to
  the route tree (every `app/*.tsx` outside `(app)`/`(auth)` must be listed).

## Decision

**C - a static export pruned to the public routes**, with B2's export-time session status.

- **A loses on the unfurl and on Bing.** The measurement that kills it is the no-JS fetch:
  identical to today for every route. Per-route titles reach Google's renderer and nothing
  else - no link preview ever changes, Bing indexes the shell, and `/faq` and `/crisis` stay
  byte-identical to `/some-garbage`. It also turns out not to be "no shell change": the
  duplicate-tag finding means the shell's copy block moves regardless.
- **B loses on the 290 thin pages.** The whole gated tree exported as spinner pages, twice
  over, is an indexing liability (near-duplicate thin content) that would need a `noindex`
  on every one or a robots block - work that C makes unnecessary by not writing them.
- **C costs**, over today: `app/+html.tsx` replacing `public/index.html` (script byte-identical,
  hash unchanged); two tests re-pointed; a site-default `<Head>` in the root layout and one
  per public screen; one line in the session provider; the prune step in the export pipeline
  (`scripts/`, run after `expo export` in the deploy workflow) with a test pinning its list;
  the hydration re-render on public pages until the icon/image server rendering is fixed;
  and a decision on the fallback mode that belongs to #2288.

## Open for the next tickets

- Per-route copy, `lang` ownership, `og:image`, `noindex` on the `(auth)` pages if they are
  ever kept: #2287.
- Fallback mode (`404-page` vs `single-page-application`), `404.html`, the sitemap that the
  nine files now make trivial: #2288.
- Server rendering of icons and the logo (the hydration mismatch): a build ticket after the
  spec, not a decision.

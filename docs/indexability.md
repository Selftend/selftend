# Indexability spec - selftend.org readable by search engines

**Status:** Decided spec, assembled 2026-09-10 from wayfinder map [#2281](https://github.com/Selftend/selftend/issues/2281) on its last ticket, [#2290](https://github.com/Selftend/selftend/issues/2290). Every section links the ticket whose resolution comment holds the full reasoning and the owner's ruling. **Built so far:** § 10 items 1 and 2 - the two landing keys, the static export with `app/+html.tsx`, the root layout's site-default `<Head>` as the sole `lang` owner, and the landing's own `<Head>` (§ 2, § 4.1 for `/`, § 4.2-4.4) - on [#2293](https://github.com/Selftend/selftend/issues/2293); the other public files carry the landing's title and description as a stopgap until item 3 ([#2294](https://github.com/Selftend/selftend/issues/2294)); and items 5 and 6 - the index list in `scripts/lib/index-list.js`, the prune to the nine files, `sitemap.xml` from the same list, `public/robots.txt`, the staging strip and `not_found_handling = "404-page"` in both Worker configs (§ 3, § 6.4-6.7, the three new tests of § 7) - on [#2295](https://github.com/Selftend/selftend/issues/2295). Items 3, 4 and 7-9 in § 10 are not built. `/to-tickets` sliced § 10 into implementation tickets ([#2293](https://github.com/Selftend/selftend/issues/2293)-[#2298](https://github.com/Selftend/selftend/issues/2298)); when the build lands, this file becomes the as-built reference for the public website's index, and the standing operational parts are repeated in [deployment.md](deployment.md).
**Audience:** Developers and product contributors; the owner for the dashboard steps in § 9.
**The word:** the site is made **readable** - it tells a crawler truthfully what each page already says - and never **pursued**. That distinction is the marketing plan's ([marketing-plan.md](marketing-plan.md) § 4, square 3, from [#2289](https://github.com/Selftend/selftend/issues/2289)), and it bounds this spec: no new copy, no new page, no choice made for a query.

---

## 0. What this spec is, and how to read it

- **A decided spec, not a proposal.** Four owner rulings were taken while charting the map (its body, _Owner rulings at charting_: Ahrefs on a paid plan, Search Console in scope, English-only indexing, existing public routes only) and six decision tickets ruled the rest with the owner: [#2286](https://github.com/Selftend/selftend/issues/2286) rendering, [#2287](https://github.com/Selftend/selftend/issues/2287) per-route head, [#2291](https://github.com/Selftend/selftend/issues/2291) structured data, [#2288](https://github.com/Selftend/selftend/issues/2288) URL hygiene, [#2289](https://github.com/Selftend/selftend/issues/2289) the marketing-plan ruling, [#2290](https://github.com/Selftend/selftend/issues/2290) this assembly. Two research tickets fed them ([#2283](https://github.com/Selftend/selftend/issues/2283) Ahrefs tiers, [#2284](https://github.com/Selftend/selftend/issues/2284) how crawlers handle a JavaScript-only site) and two tasks measured the ground ([#2285](https://github.com/Selftend/selftend/issues/2285) the baseline, [#2282](https://github.com/Selftend/selftend/issues/2282) the instruments). Their findings live on throwaway `research/*` and `prototype/*` branches that are **never merged**; the branch name is the citation.
- **Where this file and a resolution comment disagree, the comment wins and this file has a defect** - with one exception: Appendix A lists the premises the assembly found wrong and the corrections [#2290](https://github.com/Selftend/selftend/issues/2290) ruled, and there the appendix wins.
- **Written against `origin/dev` on 2026-09-10.** Line numbers are not quoted; file paths and key names were verified that day.
- **Two rules and one term.** The term is in `CONTEXT.md`; the rules live here because they are rules, not vocabulary:
  - **Index list** - the one list of public routes that decides which files the export keeps, what the sitemap lists, and therefore what is indexable (§ 3).
  - **Own what names the page, inherit only what names the site** - every exported file carries its own title, description, `og:title`, `og:description`, `og:url` and canonical; the root layout carries only site-wide constants (§ 4).
  - **A public route file exists iff it is indexable** - `noindex` is expressed by a file's absence, never by a tag on production (§ 3, § 6).

---

## 1. What a crawler sees today, and what it will see

Measured once and dated on [#2285](https://github.com/Selftend/selftend/issues/2285) (2026-09-09; the table is on branch `research/indexability-baseline`, `docs/research/2026-09-09-indexability-baseline.md`, never merged and never edited). The largest defect is one identical `<head>` on every URL of every host.

| Surface                                       | 2026-09-09                                                                                                                                                                                                      | After this spec                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Google, public routes indexed                 | 2 of 9 (`/` and `/sign-up`); the other seven never crawled                                                                                                                                                      | 8 of 8 on the index list; `/sign-up` and `/sign-in` leave by status                                                  |
| Google, homepage snippet                      | the `<noscript>` text, "You need to enable JavaScript to run this app."                                                                                                                                         | the landing description                                                                                              |
| Google, duplicate hosts                       | `www` and `http://` homepages held as "duplicate without user-selected canonical"                                                                                                                               | one origin, `https://selftend.org`, 301 from `www`, HTTPS forced                                                     |
| Search Console                                | domain property since 2026-07-28; 2 clicks, 21 impressions, position 16.1 since 27 July; 10 external links, all reddit.com → `www`; no sitemap; `robots.txt` "6,054 bytes, 89 errors" on all four origins       | sitemap submitted once; `robots.txt` parses; the coverage read joins the 2026-12-10 sitting                          |
| `/robots.txt` at the edge                     | Cloudflare's managed AI-crawler block **with the whole HTML shell appended** (origin has none, the SPA fallback answers, Cloudflare prepends)                                                                   | the managed block prepended to `public/robots.txt`; the shell gone                                                   |
| Ahrefs Site Audit, raw (JavaScript off) crawl | 9 pages, one duplicate group, no H1, no words, no links, title "Selftend", description "too long", Open Graph "incomplete" (no `og:url`); health 44 %                                                           | eight pages each with its own head; no duplicates                                                                    |
| Ahrefs Site Audit, rendered crawl             | 18 pages (`/sign-up`, `/sign-in` and the `www` twins); duplicates become eight apex/`www` pairs; `<head>` identical everywhere; health 38 %                                                                     | eight pages; `www` redirects; auth routes answer 404                                                                 |
| Ahrefs Site Explorer                          | DR 0; 359 of 367 referring domains spam-tagged; none of GitHub, Reddit, AlternativeTo, PeerPush or the stores in the index; 0 organic keywords. Search Console's Links report, not Ahrefs, is the links reading | unchanged by this spec - readability is not pursuit                                                                  |
| Bing                                          | `site:` returns nothing useful; the plain domain query shows `/` and `/crisis`; Bing cannot render JavaScript "at scale"                                                                                        | the static export is exactly what Bing can read; Bing Webmaster Tools imports the Search Console property once (§ 9) |
| Status codes                                  | four origins answer 200; plain `http://` never redirected; unknown paths 200; `/sitemap.xml` returns the HTML shell; `/index.html` 307 → `/`                                                                    | the eight files 200; everything else a real 404 that still hydrates into the app; `/sitemap.xml` is XML              |
| Guest accounts                                | web never mints a guest at load (`src/providers/session-provider.tsx` gates `signInAnonymously` on `Platform.OS !== "web"`), so rendering crawlers create no auth users                                         | unchanged; the export runs in Node with no session at all                                                            |

---

## 2. The rendering mechanism - C, a static export pruned to the public routes

Decided on [#2286](https://github.com/Selftend/selftend/issues/2286) (owner, 2026-09-09) from three mechanisms each built rough and measured on branch `prototype/2286-rendering-head` (findings: `docs/research/2026-09-09-rendering-mechanism-prototype.md` on that branch; never merged).

**Chosen: `web.output = "static"` in `app.config.ts`, plus a post-export prune to the files on the index list.** Expo Router renders the whole route tree in Node, one HTML file per route, in the same wall time as today's single-page build (303 files before the prune). `SessionProvider` seeds the session status `"ready"` when `typeof window === "undefined"`, so `/` prerenders as the landing page rather than the loading spinner.

**Rejected, with the measurement that lost each:**

- **A - a runtime `<Head>` under today's `single` output.** A fetch of `/faq` with JavaScript off is byte-for-byte today's shell: 46 characters of body text, one shared title and description, no per-route unfurl card, nothing for Bing, `/faq` indistinguishable from `/garbage` until Google renders it. And its "no shell change" premise was false: `expo-router/head` is the vendored `react-helmet-async`, which **appends** to the shell rather than replacing it, so the shell's meta block moves into a root `<Head>` either way.
- **B - plain `static` with no prune.** 303 HTML files, 290 of them near-identical spinner pages for the gated `(app)` and `(auth)` routes (9.4 MB of HTML) that a crawler can reach and that would each need a `noindex` or a robots block. The prune C adds costs under a second and about forty lines.

**Facts the build relies on, all measured:**

- `app/+html.tsx` replaces `public/index.html`. The inline first-paint script is carried over byte-identical, so its CSP hash in `public/_headers` (`sha256-cp6uvOq7d5oXEI6cYviENOOu6LvvSgkGYbIK4vHOhiE=`) does not change; the theme colour meta tag and the `expo-reset` style block move with it.
- A site-default `<Head>` in `app/_layout.tsx`; each public screen's `<Head>` overrides it. Helmet dedupes by `name` / `property`, so each exported file carries exactly one of each tag (§ 4).
- `<html lang>` has **one** owner (§ 4.4); setting it in both `+html.tsx` and a `<Head>` yields a duplicate attribute.
- The prune keeps `index`, `faq`, `crisis`, `privacy`, `terms`, `cookies`, `security`, `account-deletion` and moves `+not-found.html` to `404.html`; a test pins that list to the route tree (§ 3).
- The Cloudflare fallback mode is [#2288](https://github.com/Selftend/selftend/issues/2288)'s ruling (§ 6.4), one line in each `wrangler*.toml`.
- **Build chore, not a decision:** the hydration mismatch on public pages is exactly the header logo `Image` and the `@expo/vector-icons` glyphs rendering empty in Node. **As built on [#2293](https://github.com/Selftend/selftend/issues/2293), that premise was incomplete.** The glyphs were the one fatal mismatch (the browser draws them on its first render; fixed by loading the icon font through the root `useFonts`, so Node draws them too); the logo was never a mismatch, only absent from the file (`defaultSource`); and two more first-render differences had to be held back until React has matched the file - the device colour scheme (React leaves a mismatched attribute as the file had it, so a dark device kept the light inline tokens) and the Android download bar - behind one `useIsHydrated` hook. The export also writes a second inline script, the hydration flag, which the CSP has to allow by hash or production never hydrates at all (`public/_headers`).
- Playwright e2e needs no change (11 of 11 on the static tree); the e2e static server serves the rendered `index.html` for every extensionless path.

---

## 3. The index list

**One list, in the export step, decides three things at once**: which HTML files survive the prune, what the sitemap lists, and therefore what is indexable. Because the sitemap and the files come from the same list they cannot drift ([#2288](https://github.com/Selftend/selftend/issues/2288) § 6). Membership today:

| Route               | Exported file           | Screen                                                    |
| ------------------- | ----------------------- | --------------------------------------------------------- |
| `/`                 | `index.html`            | the long-form landing page (`app/index.tsx`)              |
| `/faq`              | `faq.html`              | Common questions                                          |
| `/crisis`           | `crisis.html`           | Crisis guidance                                           |
| `/privacy`          | `privacy.html`          | Privacy policy                                            |
| `/terms`            | `terms.html`            | Terms of service                                          |
| `/cookies`          | `cookies.html`          | Cookie policy                                             |
| `/security`         | `security.html`         | How we protect your data                                  |
| `/account-deletion` | `account-deletion.html` | Account deletion                                          |
| _(not a route)_     | `404.html`              | `+not-found` - served for every path off the list (§ 6.4) |

**The invariant: a public route file exists iff it is indexable** ([#2287](https://github.com/Selftend/selftend/issues/2287) § 7). No `noindex` tag anywhere on production; `noindex` is expressed by the prune. So `/account-deletion` and `/cookies` are indexed (harmless; "delete Selftend account" is a query a person legitimately makes) and `/crisis` is indexed (the safety surface, pointing outward). The `(auth)` screens have no file, so their crawl answer is the fallback response, a real 404 (§ 6.4). `404.html` is the one exception: it is not a route, it is served for every unknown path in Cloudflare's 404-page mode and then hydrates into the real app, so it carries a meta `noindex` - the one signal that survives whichever fallback mode is set.

**A test pins the list to the route tree**: every `app/*.tsx` outside `(app)` and `(auth)`, minus `_layout`, `+html` and `+not-found`, is on the list, and nothing else is. A new public route cannot be silently dropped from the index, and a gated route cannot be silently added. The prototype flagged the list as "a second place that knows which routes are public"; the test is the answer.

---

## 4. Per-route head

Decided on [#2287](https://github.com/Selftend/selftend/issues/2287) (owner, 2026-09-09, thirteen rulings). **Own what names the page, inherit only what names the site.**

### 4.1 What every exported file owns

`title`, `description`, `og:title`, `og:description`, `og:url`, `<link rel="canonical">` - all derived from **two strings plus the path**. Nothing route-specific is inherited: an unfurl of `/crisis` says crisis.

| Route               | `<title>` and `og:title`                  | `description` and `og:description` (verbatim, the existing on-page subline)                                                                                                                                                                                                                                                                                | Source keys (`en` and `bg`)                                      |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/`                 | Selftend - private mental health tools    | Selftend is a set of free, private mental health tools: everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want one. Open source, no ads, no subscriptions. _(213 characters - the 218 this spec first said was a miscount, found on [#2293](https://github.com/Selftend/selftend/issues/2293))_ | `auth:landingPage.metaTitle`, `auth:landingPage.metaDescription` |
| `/faq`              | Common questions - Selftend               | What Selftend is, what it isn't, and what happens to what you write.                                                                                                                                                                                                                                                                                       | `policies:faq.pageTitle` / `.pageDescription`                    |
| `/crisis`           | Crisis guidance - Selftend                | This app is not emergency support and is not monitored. If you are in danger, contact local emergency services.                                                                                                                                                                                                                                            | `policies:crisis.pageTitle` / `.pageDescription`                 |
| `/privacy`          | Privacy policy - Selftend                 | How Selftend handles your account, preference, and private CBT record data.                                                                                                                                                                                                                                                                                | `policies:privacy.pageTitle` / `.pageDescription`                |
| `/terms`            | Terms of service - Selftend               | Terms of service for Selftend, a set of free, private mental health tools.                                                                                                                                                                                                                                                                                 | `policies:terms.pageTitle` / `.pageDescription`                  |
| `/cookies`          | Cookie policy - Selftend                  | How the web version of Selftend uses browser storage.                                                                                                                                                                                                                                                                                                      | `policies:cookies.pageTitle` / `.pageDescription`                |
| `/security`         | How we protect your data - Selftend       | Plain-language summary of the technical and procedural safeguards we use to keep your entries private.                                                                                                                                                                                                                                                     | `security:page.pageTitle` / `.pageDescription`                   |
| `/account-deletion` | Account deletion - Selftend               | How to permanently delete your Selftend account and all associated data.                                                                                                                                                                                                                                                                                   | `policies:accountDeletion.pageTitle` / `.pageDescription`        |
| `404.html`          | Page not found - Selftend, plus `noindex` | none                                                                                                                                                                                                                                                                                                                                                       | the not-found screen's H1 through the template                   |

- **Titles.** Non-landing routes compose through **one template key**, `"{{page}} - Selftend"` (a `bg` twin of the same shape), from the route's existing H1 key: hyphen, page word first. The landing's `<title>` and `og:title` are the decided short-form card title from [#2007](https://github.com/Selftend/selftend/issues/2007): a search-result title is effectively capped at about 60 visible characters, and positioning's answer at a cap is the short form.
- **Descriptions.** The page's existing on-page subline, verbatim, as both `description` and `og:description` - one source, no drift, already translated and already gated by `test/positioning-copy.test.ts`. `/crisis` included: calm, honest, pointing outward. The landing keeps today's 213-character description as is: Google's ~155-160 character snippet is a truncation, not a cap, and the binding rule is positioning's frame-carrier rule (the description must carry "CBT programme").
- **The landing's two keys are new keys carrying old strings** (Appendix A.1, ruled on [#2290](https://github.com/Selftend/selftend/issues/2290)). Today both strings are literals in `public/index.html` and no key holds either. `auth:landingPage.metaTitle` and `auth:landingPage.metaDescription` receive them verbatim in `en`; the `bg` description is the existing `bg` `landingPage.heroSupport` sentence plus the Bulgarian for "Open source," - a translation of shipped copy, not new copy. Both keys join the copy gate's frame-carrier list (§ 7). The structured-data block reads `metaDescription` (§ 5).
- **Canonical and `og:url`.** `https://selftend.org` + path, from **one hardcoded constant**: not `EXPO_PUBLIC_PUBLIC_APP_URL` (an app-links value that may diverge) and not `expo-router`'s `origin`. No trailing slash on any path; the root carries its slash (`https://selftend.org/`) because an origin's root path is always `/` and the structured-data ruling already wrote it so. Staging carries canonicals pointing at production - standard for a `noindex` mirror.

### 4.2 What the root layout owns - and only this

`og:type` `website` · `og:site_name` `Selftend` · `og:image` `https://selftend.org/favicon-512.png` with `og:image:width` 512, `og:image:height` 512, `og:image:alt` "The Selftend app icon" · `og:locale` **`en_GB`** · `twitter:card` `summary`. The 512 px icon stays the share image until the artwork exists (§ 11); a wide card would letterbox a square icon. **`twitter:title`, `twitter:description` and `twitter:image` are dropped**: every unfurler falls back to `og:*`.

### 4.3 Where the `<Head>` is emitted

`PolicyPageLayout` - which `InfoScreen`, `/faq` and `/security` all render through - emits the per-route `<Head>` itself, web-only, from the title and subline props it already receives. No route file can forget it, and "document title = on-page H1" is structural, pinnable by one test. The landing screen emits its own `<Head>` (it also carries § 5's block). The prototype's `<Head>` inside `app/faq.tsx` was prototype placement, not the design.

### 4.4 `lang`

The root layout `<Head><html lang={i18n.language} /></Head>` is the **sole owner**; `app/+html.tsx` sets no `lang` and `%LANG_ISO_CODE%` is gone. The exported file reads `en` (i18next's default in Node, matching English-only indexing); a Bulgarian-preference visitor gets `bg` after hydration, an accessibility duty independent of search. The same holds for the description and the structured-data block: English in the file, the visitor's language after hydration.

### 4.5 The `(auth)` screens at runtime

They have no file and search never sees them, but the same invariant reaches them at runtime: document title = the screen's H1 through the template, following the state where the H1 is state-dependent (`auth-callback`'s four states, `update-password`'s expired state, sign-up's conversion variant). A person on `/sign-in` has a tab title, a history entry and a screen-reader document title regardless of indexing. Extending the invariant to the gated `(app)` screens is out of scope (§ 11).

---

## 5. Structured data - `Organization` and `WebSite` on `/`, nothing anywhere else

Decided on [#2291](https://github.com/Selftend/selftend/issues/2291) (owner, 2026-09-09). One `<script type="application/ld+json">` block holding an `@graph` of two nodes, **in the landing screen's own `<Head>`** (never the root layout), so it lands in `index.html` only; `/faq`, `/crisis`, the five policy pages and `404.html` carry none.

- **`Organization`:** `name` "Selftend" · `url` `https://selftend.org/` · `logo` `https://selftend.org/favicon-512.png` (512 px clears Google's 112 px floor; the same file as `og:image`) · `description` = `auth:landingPage.metaDescription`, the same key the meta description reads · `sameAs` = the GitHub repository, r/Selftend and the YouTube channel, from `env.githubRepoUrl`, `env.redditUrl`, `env.youtubeUrl` in `src/lib/env.ts`.
- **`WebSite`:** `name` "Selftend" · `url` · `publisher` pointing at the Organization by `@id`. No `alternateName`, no `SearchAction` (the sitelinks search box was removed 2024-11-29 and the site has no search).
- **Never**, each a decision: `nonprofitStatus` (no registered entity exists - `docs/costs.md`, checked 2026-08-20 - so a schema.org `NonprofitType` would be a false legal claim); a `founder` or `Person` node; `email` or `contactPoint`; the store URLs; anything implying outcomes, ratings, reviews or a category noun positioning refuses.
- **Refused types, so nobody re-derives them:** `FAQPage` - Google stopped showing the FAQ rich result on 2026-05-07 and removed its documentation on 2026-06-15. `SoftwareApplication` - its rich result requires `aggregateRating` or `review`, which Selftend has none of and may not invent; refused, not deferred. No health or medical type exists in Google's gallery, and claiming one walks into the "not a diagnosis engine" guardrail.
- **CSP is unchanged.** A JSON-LD block is a data block: the HTML spec's _prepare the script element_ returns before the CSP inline check for any non-JavaScript type. Verified 2026-09-09 against the live `Content-Security-Policy` of `selftend.org` with a probe page: one violation (the inline test script), the block parsed intact. `public/_headers` does not change and the pinned first-paint hash is untouched.
- **A test pins** `Organization.description` to the rendered meta description and `logo` to `og:image`, so the block cannot disagree with the visible page. Validation in the Rich Results Test or Search Console's _Enhancements_ is a check, not a goal - no rich result is expected; the win is the logo and site-name association. Bing reads JSON-LD; nothing engine-specific to add.

---

## 6. URL hygiene - one origin, real 404s, a truthful `robots.txt`, a sitemap from the one list

Decided on [#2288](https://github.com/Selftend/selftend/issues/2288) (owner, 2026-09-09, nine rulings). This section is that ticket's resolution, lightly reordered.

### 6.1 Canonical host - `https://selftend.org` is the only serving origin

A **zone-level Cloudflare Redirect Rule**, set in the dashboard, not the repo (`_redirects` cannot do domain-level redirects on Workers static assets):

- expression: `http.host eq "www.selftend.org" and not starts_with(http.request.uri.path, "/.well-known/")`
- target: `concat("https://selftend.org", http.request.uri)` - `http.request.uri` carries path **and** query; fragments never reach a server and the browser carries them across
- status: **301**

The custom-expression form rather than Cloudflare's one-line `https://www.*` wildcard, because of the `/.well-known/` carve-out in § 6.3.

### 6.2 Plain HTTP - Always Use HTTPS on for the zone

SSL/TLS → Edge Certificates → Always Use HTTPS. Covers apex, `www` and staging, and is the setting the `Strict-Transport-Security … preload` header in `public/_headers` already presumes. `http://www` may take two hops (HTTPS first, then apex); acceptable. **No submission to the HSTS preload list** - irreversible in practice and nothing here needs it; the `preload` token stays as it is.

### 6.3 The app-links claim on `www` - spared now, dropped at the next native release

- **Now:** the rule spares `/.well-known/*` on `www`, so `apple-app-site-association` keeps answering 200 there. Necessary, not cautious: Apple requires the file served "with no redirects" ([Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)); Google's Digital Asset Links says "301 or 302 response codes are not followed" ([Create a statement](https://developers.google.com/digital-asset-links/v1/create-statement)). Android is unaffected either way: its intent filter in `app.config.ts` names the apex host only.
- **Next native release:** `applinks:www.selftend.org` leaves `ios.associatedDomains` in `app.config.ts`, and the carve-out is retired in the same change. A build still carrying the old entitlement loses nothing: a tapped `www` link opens Safari, follows the 301, and the apex web app completes `/auth-callback` as it does today; a tapped link with the app installed never touches the website at all.
- The build rewrites `docs/launch/app-links-runbook.md` ("both hosts serve the app directly rather than redirecting") and the matching comment above `associatedDomains` in `app.config.ts`, both of which state the reason the redirect removes.
- **Falsified premise:** "an old email link may carry `www`". Supabase's Site URL is `https://selftend.org`, the redirect allow-list holds only `https://selftend.org/auth-callback`, and `getWebAuthRedirectUrl` builds from the same apex value. No email link ever meets the redirect; a `www` URL is only ever typed or shared, and a 301 keeps its query anyway.

### 6.4 Status codes - `not_found_handling = "404-page"`

In both `wrangler.toml` and `wrangler.staging.toml` (`"single-page-application"` until [#2295](https://github.com/Selftend/selftend/issues/2295)). The prune moves `+not-found.html` to `404.html`. The eight files answer 200; **everything else - gated `(app)`, `(auth)`, unknown - answers a real 404 with the not-found file, which hydrates into the real screen.** Measured on the rendering prototype: `/modules/cbt` rendered the CBT module home for a fresh guest, status 404 notwithstanding. The research ticket's "a real 404 and deep links are mutually exclusive without a Worker script" is falsified for this build - the not-found file _is_ the shell.

Consequences: the two `(auth)` URLs Google holds fall out of the index by status, not by a tag; Ahrefs' rendered crawl stops filing them as pages; `404.html` keeps its `noindex`, now doubly moot. Cost: a gated deep link's status line reads 404 while the screen renders normally; nothing in the app, the push worker or the e2e suite reads that status. `docs/deployment.md` § _Troubleshooting_ ("Unknown routes return 404 instead of the app") describes today's failure mode and is rewritten.

### 6.5 `robots.txt` - allow everything, point at the sitemap, block nothing

`public/robots.txt`:

```
User-agent: *
Disallow:

Sitemap: https://selftend.org/sitemap.xml
```

**No `Disallow` lines.** A URL Google may not fetch can stay indexed as a bare URL, so blocking `/sign-up` would keep the stale entry alive, while letting Google fetch it shows the 404 that removes it. Nothing on the site is hidden from a crawler. **No `_headers` rule**: the extension gives the content type and the default revalidating cache is right.

**Cloudflare's managed AI-crawler block stays on.** It is prepended, never replaced: with an origin `robots.txt` answering 200, Cloudflare combines its managed file and ours into one response ([managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)). The `Sitemap:` line survives, the HTML shell no longer follows, and Search Console's 89 parse errors vanish. No repo file records that Cloudflare setting today; § 6.8 fixes that.

### 6.6 Sitemap - written at export from the index list

Produced by the same prune step, from the same list (§ 3). Absolute apex URLs; the eight entries; **no `lastmod`** (Google uses it only when consistently truthful, and stamping every page with each release date would claim every page changed), **no `hreflang`** (English-only indexing is an owner ruling), no `priority`, no `changefreq`. Submitted **once** in Search Console after the first production deploy that ships it - the domain property already covers every host.

### 6.7 Staging - the `noindex` header holds; the sitemap is stripped; no `Disallow`

The deploy-time `X-Robots-Tag: noindex` appended by `.github/workflows/web-deploy.yml` ("Mark staging as noindex") stays as it is - the baseline found no staging URL in Google's index. The staging deploy step **deletes `dist/sitemap.xml` and removes the `Sitemap:` line** from `robots.txt`: a staging sitemap would list production URLs from another host. **No `Disallow: /`** - a disallowed URL cannot be fetched, so its `noindex` is never read.

### 6.8 Where the zone settings are recorded

`docs/deployment.md` gains a **"Cloudflare zone settings"** section: the redirect rule (expression, target, status), Always Use HTTPS, the managed robots.txt toggle - each with the date verified. A **control-tower issue** is filed by the build per the architecture rule (a redirect rule changes a public URL; the `www` claim's retirement changes the app-links inventory).

---

## 7. Tests - what pins each piece

| Piece                                        | Today                                                                                                                                                                                                                             | After the build                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The shell's first-paint script and CSP hash  | `test/theme-web-surfaces.test.ts` reads `public/index.html`, `app.config.ts`, `public/manifest.webmanifest` and `public/_headers`; pins the palette, the theme colour meta tag and the CSP hash                                   | **re-points** the `public/index.html` reads at `app/+html.tsx`; the hash assertion is unchanged                                                                                                                                                                                                                          |
| The frame sentence on the declaring surfaces | `test/positioning-copy.test.ts` builds its frame corpus from `public/index.html`'s `description`, `og:description`, `twitter:description` plus the manifest, and scans `auth:landing.subtitle` and `auth:landingPage.heroSupport` | **re-points**: the three meta reads become the two new keys `auth:landingPage.metaTitle` and `auth:landingPage.metaDescription`; `public/index.html` leaves the declaring-surface list and `app/+html.tsx` does not join it (it carries no copy); the `docs/positioning.md` _What binds this document_ table row follows |
| `version.json` cache rule in `_headers`      | `test/update-surface-conventions.test.ts`                                                                                                                                                                                         | unchanged                                                                                                                                                                                                                                                                                                                |
| `web-headers.test.ts`                        | **does not exist** (the map's Notes said it did; corrected on [#2288](https://github.com/Selftend/selftend/issues/2288))                                                                                                          | not created                                                                                                                                                                                                                                                                                                              |
| The index list ↔ the route tree              | -                                                                                                                                                                                                                                 | **new**: every `app/*.tsx` outside `(app)` and `(auth)`, minus `_layout`, `+html`, `+not-found`, is on the list and nothing else is                                                                                                                                                                                      |
| `robots.txt`                                 | -                                                                                                                                                                                                                                 | **new**: present in the export, one `Sitemap:` line, its URL equals the sitemap's                                                                                                                                                                                                                                        |
| The sitemap                                  | -                                                                                                                                                                                                                                 | **new**: written from the index list, absolute apex URLs, no `lastmod`/`hreflang`/`priority`; stripped from the staging deploy                                                                                                                                                                                           |
| Document title = on-page H1                  | -                                                                                                                                                                                                                                 | **new**: one test on `PolicyPageLayout`; `404.html` carries "Page not found - Selftend" and `noindex`                                                                                                                                                                                                                    |
| The structured-data block                    | -                                                                                                                                                                                                                                 | **new**: `Organization.description` equals the rendered meta description; `logo` equals `og:image`; the block appears in `index.html` only                                                                                                                                                                               |
| The two new keys in both locales             | `test/i18n-key-coverage.test.ts` and `src/i18n/locale-parity.test.ts`                                                                                                                                                             | unchanged - they already fail on a missing `bg` twin                                                                                                                                                                                                                                                                     |
| e2e                                          | Playwright, 11 specs                                                                                                                                                                                                              | unchanged (measured on the prototype)                                                                                                                                                                                                                                                                                    |

---

## 8. Documents the build touches

- `docs/deployment.md` - the new "Cloudflare zone settings" section (§ 6.8); "Web Build" (`static` output, the prune, the sitemap); "Public Routes To Verify" gains `/faq`, `/cookies` and `/security` and describes the 404 answer for an unknown route; "Troubleshooting → Unknown routes return 404 instead of the app" is rewritten for the new fallback mode; the Search Console sitemap submission as a one-time step.
- `docs/stack.md` - "Data, Web, And Observability": the web output mode and that the public routes are prerendered.
- `docs/launch/app-links-runbook.md` and the `associatedDomains` comment in `app.config.ts` - § 6.3.
- `docs/positioning.md` _What binds this document_ - the declaring-surfaces row (§ 7).
- `docs/analytics.md` - one line: Search Console and Ahrefs Site Audit read the site from outside; no script is added (the map's Notes; `docs/analytics.md` and the privacy policy promise no analytics tracking services, pinned to `policyVersion`).
- `README.md` - only if a setup command changes; the export command may.
- This file - Status flips to as-built, section by section, as the slices land.

The marketing-plan side ([#2289](https://github.com/Selftend/selftend/issues/2289)) is **already applied** in the same change as this spec: `docs/marketing-plan.md`, `docs/costs.md`, `docs/operations-runbook.md`.

---

## 9. Instruments, and the owner's steps

Both instruments were live before the map ([#2282](https://github.com/Selftend/selftend/issues/2282), control-tower [#131](https://github.com/vasilyoshev/control-tower/issues/131)). Neither adds a script to the site; both read it from outside.

- **Google Search Console** - domain property `selftend.org`, DNS-verified, since 2026-07-28; covers every host and scheme. It is the coverage reading (are the eight files indexed, is anything else) and the links reading. Impressions and clicks are a standing-surface reading in the plan's words - never an arrival, never a window judgement.
- **Ahrefs** - project 10345616 (Site Audit with Execute JavaScript on; URL sources: the website plus a custom list of the eight routes; monthly audit on the 9th), verified 2026-09-08 on Free, **Starter at $29/month since 2026-09-10**, next billing 2026-10-10, on the owner's individual account. Starter paid for the demand read the channel ruling needed and for the first audit of the readable site. Web Analytics is off and stays off. **Owner action: downgrade to Free before 2026-10-10** unless the 2026-12-10 call promotes a pond search serves (`docs/costs.md`).
- **Bing Webmaster Tools** - one owner step, added by [#2290](https://github.com/Selftend/selftend/issues/2290): import the Search Console property (no site script, no DNS work) and submit the same sitemap once. **No reading duty** - the plan gains no line and the 2026-12-10 sitting stays one sitting.

**Owner steps, in order, all after the release that ships the export:**

1. Cloudflare → Rules → Redirect Rules: the `www` → apex rule of § 6.1 (verify with `curl -I https://www.selftend.org/faq` → 301 to the apex, and `curl -I https://www.selftend.org/.well-known/apple-app-site-association` → 200).
2. Cloudflare → SSL/TLS → Edge Certificates → Always Use HTTPS on (verify `curl -I http://selftend.org/` → 301).
3. Cloudflare → Security → Bots → managed robots.txt: already on; confirm and record the date in `docs/deployment.md`.
4. Search Console → Sitemaps: submit `https://selftend.org/sitemap.xml` once.
5. Bing Webmaster Tools: import from Search Console; submit the sitemap once.
6. Ahrefs: re-run the Site Audit on the readable site (the first audit Starter paid for), then downgrade to Free before 2026-10-10.

---

## 10. The build, in dependency order

For `/to-tickets`. The order is the dependency order, not a schedule; items with no arrow between them are independent.

1. **The two landing keys** - `auth:landingPage.metaTitle` and `auth:landingPage.metaDescription` in `en` and `bg`, carrying today's literals verbatim; the copy gate's frame-carrier list re-pointed at them (§ 4.1, § 7). Depends on nothing; every head item below reads them.
2. **The static export** - `web.output = "static"`; `app/+html.tsx` replacing `public/index.html` with the first-paint script byte-identical; the session `"ready"` seed at export; the root layout's site-default `<Head>` (§ 4.2) as the sole `lang` owner (§ 4.4); `test/theme-web-surfaces.test.ts` and `test/positioning-copy.test.ts` re-pointed. The hydration-mismatch chore (§ 2) rides here or immediately after.
3. **Per-route heads** - the template key; `PolicyPageLayout` emitting the `<Head>`; the landing's own `<Head>`; the `(auth)` runtime titles; `404.html`'s title and `noindex`; the title = H1 test (§ 4).
4. **The structured-data block** in the landing `<Head>` with its pinning test (§ 5). Depends on 3.
5. **The index list, the prune, the sitemap and `robots.txt`** - one export step, the route-tree test, the robots and sitemap tests, the staging strip (§ 3, § 6.5-6.7). Depends on 2.
6. **`not_found_handling = "404-page"`** in both `wrangler*.toml`, with `docs/deployment.md`'s troubleshooting entry rewritten (§ 6.4). Depends on 5 (needs `404.html`).
7. **Docs** - `docs/deployment.md` (zone settings section, public routes, web build), `docs/stack.md`, `docs/analytics.md`, this file's Status (§ 8). Lands with the release, and the control-tower issue is filed with it (§ 6.8).
8. **The release**, then the owner steps of § 9 the same day. **Timing rule from the plan** ([#2289](https://github.com/Selftend/selftend/issues/2289) ruling 8): the indexability release lands **before the fresh signup baseline is read (mid-October 2026) or in an interval between windows - never inside one**. In practice: ship in September and let the crawl settle before the baseline.
9. **Next native release** - `applinks:www.selftend.org` leaves `ios.associatedDomains`; the `/.well-known/` carve-out is retired from the redirect rule in the same change; `docs/launch/app-links-runbook.md` and the config comment rewritten (§ 6.3). Bound to a native release, not to the web release.

---

## 11. Not in this spec, and where each thing went

**Deferred, with the trigger that reopens it** - none needs a new map when it fires:

- **Bulgarian URLs and `hreflang`.** English-only indexing is an owner ruling; Bulgarian stays preference-only on the same URLs, with `lang` correct after hydration. Reopens on either finding named in the plan ([#2289](https://github.com/Selftend/selftend/issues/2289) ruling 4): the 2026-12-10 call promotes a pond search serves, or Search Console shows Bulgarian queries reaching the site. The 2026-09-10 demand read puts Bulgarian self-help queries in the low hundreds a month.
- **A real share image** (1200×630, per route or one for the site). The mechanism exists - `og:image` in a screen's `<Head>` lands in that screen's file - and what is missing is the artwork, an owner call. Until then the 512 px icon and a `summary` card. `Organization.logo` stays the square icon regardless: a logo is not a share image.

**Out of scope of the map, recorded on it** - work beyond the destination, returning only as a fresh effort:

- A content programme (new public pages written to rank) · store keyword work · any analytics script on the site · link building or outreach · rewriting the landing page's body copy · browser-tab titles for the gated `(app)` screens · **Core Web Vitals as a ranking input** - performance work done for ranking is pursuit by the plan's definition ("ranking as a target"), and performance work done for people is product work with its own review.

---

## Appendix A - premises corrected while assembling

1. **"The landing description is read from an `auth` key."** Both [#2287](https://github.com/Selftend/selftend/issues/2287) and [#2291](https://github.com/Selftend/selftend/issues/2291) assumed it. On `origin/dev` the 213-character description and the short-form title are literals in `public/index.html` only; the nearest key, `auth:landingPage.heroSupport`, is the same sentence without "Open source,". **Ruled on [#2290](https://github.com/Selftend/selftend/issues/2290):** two new keys carry today's strings verbatim (§ 4.1). "No new copy" stays true: the strings existed, only their home moves.
2. **"`web-headers.test.ts` pins `_headers`."** It does not exist; `_headers` is pinned by `test/theme-web-surfaces.test.ts` and `test/update-surface-conventions.test.ts` ([#2288](https://github.com/Selftend/selftend/issues/2288)).
3. **"The repo has no `robots.txt`, so the edge serves none."** The edge serves Cloudflare's managed AI-crawler block with the HTML shell appended ([#2285](https://github.com/Selftend/selftend/issues/2285)).
4. **"A real 404 and SPA deep links are mutually exclusive on static assets."** The not-found file is the shell and hydrates into the real screen ([#2286](https://github.com/Selftend/selftend/issues/2286), [#2288](https://github.com/Selftend/selftend/issues/2288)).
5. **"`X-Robots-Tag` lives in `_headers` or a meta tag."** It is appended at deploy time by `web-deploy.yml` for staging only ([#2287](https://github.com/Selftend/selftend/issues/2287)).
6. **"Old email links may carry `www`."** Site URL and the redirect allow-list are apex-only ([#2288](https://github.com/Selftend/selftend/issues/2288)).
7. **"`FAQPage` markup is restricted to government and health sites."** The rich result is gone for everyone since 2026-05-07 ([#2291](https://github.com/Selftend/selftend/issues/2291)).
8. **"Helmet replaces the shell's tags."** It appends; the shell's meta block moves into a root `<Head>` under every mechanism ([#2286](https://github.com/Selftend/selftend/issues/2286)).

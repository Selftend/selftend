# Indexability baseline - what Google, Search Console, Bing and Ahrefs see of selftend.org on 2026-09-09

Baseline for [The baseline - what Google, Search Console and Ahrefs see of selftend.org today, taken once and dated](https://github.com/Selftend/selftend/issues/2285), under map [selftend.org readable by search engines](https://github.com/Selftend/selftend/issues/2281).

**Taken once on 2026-09-09 and never edited afterwards.** Times are Europe/Sofia unless marked UTC. Instruments: the Search Console domain property `sc-domain:selftend.org` (DNS-verified 28 July 2026), Ahrefs project 10345616 (`https://*.selftend.org/*`, Free plan since 8 September 2026), `curl -sI`, and Google and Bing result pages in the owner's signed-in Chrome.

**Production at the time of reading:** v0.18.0, published 2026-09-09 12:50 UTC (15:50 Sofia). Its shell is 7,060 bytes with 17 `<meta>` tags - the description, Open Graph and Twitter tags landed on production with that release. Ahrefs' first crawl at 00:50 Sofia ran against the previous shell (bundle `index-a6f02574…js`, no description, no Open Graph); everything after 15:50 ran against the new one (`index-ce478448…js`). Both states are recorded below because the difference is itself a baseline fact.

## 1. What Google has indexed

Search Console Pages report, last updated 2026-09-04:

| State       | Reason                                                                                 | Pages | URLs (last crawled)                                                                 |
| ----------- | -------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| Indexed     | -                                                                                      | 2     | `https://selftend.org/` (20 Aug 2026), `https://selftend.org/sign-up` (23 Jul 2026) |
| Not indexed | Duplicate without user-selected canonical (source: website, first detected 2026-08-05) | 2     | `https://www.selftend.org/` (29 Aug 2026), `http://selftend.org/` (20 Aug 2026)     |
| Not indexed | Page with redirect (first detected 2026-08-05)                                         | 1     | `http://www.selftend.org/` (5 May 2026 - stale: it answers 200 today, see §5)       |

Google knows five URLs of the site. Seven of the nine public routes - `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/security`, `/account-deletion` - appear nowhere in Search Console: never crawled, never reported. The one route beside the homepage that Google did index is the sign-up screen.

`site:selftend.org` on Google (English UI, 2026-09-09): "About 2 results".

| Result                           | Title Google shows | Snippet Google shows                                                                                                                                                       |
| -------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://selftend.org`           | Selftend           | **"You need to enable JavaScript to run this app."** - the `<noscript>` text, not the meta description                                                                     |
| `https://selftend.org › sign-up` | Selftend           | "Already have an account? Sign in. Your entries stay private to your account - encrypted in transit and on our servers. How we protect your data." - rendered sign-up copy |

Both `www` and apex URLs are known to Google; it chose the apex as the canonical for `/`. `staging.selftend.org` appears neither in Search Console's five URLs nor in the `site:` results - the `X-Robots-Tag: noindex` holds.

## 2. Search Console performance

Sixteen-month view; data begins 2026-07-27, the property's age. Last update 8.5 hours before reading.

| Metric            | Value |
| ----------------- | ----- |
| Total clicks      | 2     |
| Total impressions | 21    |
| Average CTR       | 9.5 % |
| Average position  | 16.1  |

| Page                           | Clicks | Impressions |
| ------------------------------ | ------ | ----------- |
| `https://selftend.org/`        | 1      | 19          |
| `https://www.selftend.org/`    | 1      | 2           |
| `https://selftend.org/sign-up` | 0      | 1           |

Queries: one shown, `selfevents` (0 clicks, 1 impression); the rest are anonymised. Countries: Bulgaria 2 clicks / 2 impressions; United States 0 / 5; Chad 0 / 3; Mexico 0 / 3; Australia, Finland, Saudi Arabia, Brazil, Bangladesh, Vietnam 0 / 1 each.

Other Search Console reports read the same day:

- **Sitemaps:** none submitted, none discovered.
- **Links:** external links total 10, all to `https://www.selftend.org/`, all from `reddit.com`, anchor text "https selftend org" and "selftend org". Internal links total 1.
- **robots.txt report:** four origins (`https://www`, `http://apex`, `https://apex`, `http://www`), each "Fetched, 6,054 bytes, 89 errors, 1 warning", checked 25-29 August 2026. The 6,054-byte body is the pre-v0.18.0 SPA shell served at `/robots.txt` (§5 has today's body).

## 3. Ahrefs Site Audit

Project settings as found: URL sources = Website (`https://selftend.org/`) plus a **Custom URL list** of eight routes (`/`, `/faq`, `/crisis`, `/privacy`, `/terms`, `/security`, `/cookies`, `/account-deletion`); auto-detected sitemaps, specific sitemaps and backlinks off. Crawl settings: Execute JavaScript **off**; check images, CSS and JavaScript on; follow links on non-canonical pages and nofollow links on; external-link status off; scheduled monthly on the 9th. Free plan: 5,000 crawl credits a month, 4,955 left after the day's four crawls (a raw crawl of the seed list bills 9 pages, a rendered one 18). `/sign-up`, Google's second indexed URL, is not in the seed list; `www.selftend.org/` entered the crawl via the Website seed.

Four crawls ran on 2026-09-09: three without JavaScript (A, B, C below) and one with it (D). Each raw crawl found the same 16 URLs: 9 internal HTML pages (`www.selftend.org/`, `selftend.org/`, `/account-deletion`, `/crisis`, `/privacy`, `/faq`, `/security`, `/terms`, `/cookies`), 4 resources (the one JS bundle and one CSS file on each host), and nothing else. Health score 44 % on each raw crawl; all 9 HTML pages carry errors.

Per page, on each raw crawl: status 200; title "Selftend" (8 characters); 0 words; no H1; 0 outgoing links; 0 incoming internal links; depth 0; indexable; no canonical; no `hreflang`; `lang="en"` (no localisation issue raised). All nine form one duplicate group without a canonical.

### Crawl A - 00:50, JavaScript off, previous shell

117 issues (27 errors, 36 warnings, 54 notices).

| Issue                                           | Pages |
| ----------------------------------------------- | ----- |
| Duplicate pages without canonical               | 9     |
| Orphan page (no incoming internal links)        | 9     |
| Page has no outgoing links                      | 9     |
| H1 tag missing or empty                         | 9     |
| Low word count (0 words)                        | 9     |
| **Meta description tag missing or empty**       | 9     |
| Title too short (< 15 characters)               | 9     |
| **Open Graph tags missing**                     | 9     |
| **X (Twitter) card missing**                    | 9     |
| Indexable page not in sitemap                   | 9     |
| Inconsistent AI training bot policy             | 9     |
| Indexable page blocked from some AI search bots | 9     |

### Crawl B - 19:14, JavaScript off, today's shell

117 issues (27 errors, 45 warnings, 45 notices). Against crawl A: the description is now present on all nine ("Meta description changed" 9) but flagged **"Meta description too long"** on all nine - the 218-character frame sentence; the Content report's own length bucket calls the same value "Optimal: 100-300 ch.", so this is Ahrefs' warning threshold, not a defect the spec adopts. Open Graph moved from "missing" to **"incomplete"** on all nine - `og:type`, `og:site_name`, `og:title`, `og:description`, `og:image` (+ width, height, alt) are read; `og:url` is the absent one. The X card issue cleared. New notice: "Changed pages not submitted to IndexNow" 9. Everything else in crawl A's table is unchanged.

### Crawl C - 19:20, still JavaScript off (a failed toggle), today's shell

Identical to crawl B (11 issues once the two "changed" notices cleared). Recorded because it was meant to be the rendered crawl: a scripted `click()` on the settings form's Save button raises no error and persists nothing - three attempts read "off" after a reload. A real click on the same button persisted the setting at the first attempt. Execute JavaScript **is** available on the Free plan; the tiers research left that unverified.

### Crawl D - 19:36, JavaScript on, today's shell

Crawl 1m33s + processing (4m45s total). **29 URLs: 18 internal HTML pages, 8 resources** (the bundle, the stylesheet, the 640 KB `icon.png` and the Google sign-in logo on each host); 18 billed. Health score **38 %**; 158 issues (18 errors, 54 warnings, 86 notices); 18 of 18 HTML pages with errors.

The renderer found the routes the raw crawl could not: from the landing page's 7 outgoing links it reached `/sign-up` and `/sign-in` on both hosts, plus the `www` twins of `/faq`, `/crisis`, `/privacy`, `/terms` and `/cookies`. Pages crawled: apex `/`, `/faq`, `/crisis`, `/privacy`, `/terms`, `/security`, `/cookies`, `/account-deletion`, `/sign-up`, `/sign-in`; `www` `/`, `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/sign-up`, `/sign-in`. Inlinks: apex `/` 9, `www` `/` 7, every other page exactly 1; `/security` and `/account-deletion` 0 - nothing on the site links to them, the seed list is the only reason Ahrefs sees them.

| Issue                                                                  | Pages                                | vs crawl B   |
| ---------------------------------------------------------------------- | ------------------------------------ | ------------ |
| H1 tag missing or empty                                                | 0                                    | −9 (cleared) |
| Low word count                                                         | 0                                    | −9 (cleared) |
| Page has no outgoing links                                             | 0                                    | −9 (cleared) |
| Orphan page                                                            | 2 (`/security`, `/account-deletion`) | −7           |
| Page has only one dofollow incoming internal link                      | 14                                   | new          |
| Title too short ("Selftend" on all 18)                                 | 18                                   | +9           |
| Meta description too long (the same 218 characters on all 18)          | 18                                   | +9           |
| Open Graph tags incomplete (no `og:url`)                               | 18                                   | +9           |
| Duplicate pages without canonical                                      | 16                                   | +7           |
| Indexable page not in sitemap                                          | 18                                   | +9           |
| Inconsistent AI training bot policy / blocked from some AI search bots | 18 / 18                              | +9 / +9      |
| Changed pages not submitted to IndexNow                                | 18                                   | notice       |

Content report for the rendered pages: title - one per page, all 18 "too short"; description - one per page, all 18 "optimal 100-300"; **H1 - one per page on all 18** (13 under 20 characters, 5 in the 20-70 band). Word counts are no longer zero. **The duplicate groups moved from "every route is the same page" to "every route is its own page, twinned across hosts"**: 16 pages with no canonical = 8 apex/`www` pairs; the two routes without a `www` twin in the crawl are the two that are not duplicates.

So the rendered view (what Google and Bing see) and the raw view (what Ahrefs, and any engine that does not render, sees) differ on H1, words and links, and agree on everything the `<head>` controls: one title, one description, no canonical, no `og:url`, no sitemap - for every URL on both hosts.

Setting left as found by the owner would be "off"; it is left **on** (the tiers research's recommendation), so the scheduled monthly audit on the 9th renders. A rendered crawl of this seed list bills 18 credits of the 5,000.

## 4. Ahrefs Site Explorer

Target `selftend.org`, subdomains mode, 2026-09-09.

| Metric                                                                     | Value                                      |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| Domain Rating                                                              | 0                                          |
| URL Rating                                                                 | 0                                          |
| Ahrefs Rank                                                                | 134,224,363                                |
| Backlinks                                                                  | 524 live (768 all-time)                    |
| Referring domains                                                          | 367 live (529 all-time), 30-day change −92 |
| Organic keywords                                                           | 0 ("No results found")                     |
| Organic traffic                                                            | 0                                          |
| Paid keywords / ads / traffic                                              | 0                                          |
| AI responses (AI Overviews, AI Mode, ChatGPT, Gemini, Perplexity, Copilot) | 0                                          |

**Referring domains.** 359 of the 367 carry Ahrefs' own SPAM tag - SEO-service link farms on `.shop`, `.store`, `.site` and `.agency` (e.g. `fiverr-seo-for-small-businesses.site` DR 68, `seogrow.agency` DR 67, then some 300 `seoexpress-*`, `link-baron-*`, `outrank-hq-*` and `rank-forge-*` `.store` domains at DR 31-32). The top 50 by DR are all spam except `appagg.com`. The eight untagged domains: `appagg.com` (DR 50, an app aggregator, links to `/?from=AppAgg.com`), `seogeko.shop` (30), `premium-backlinks-usa.shop` (24), `reddlx.com` (0.6, a Reddit mirror), `plavo.shop`, `plurio.shop`, `bunto.shop`, `shadowgraph.io` (0). The report paged all 367 rows at 100 per page; no Free-plan row cap bit.

**The known candidates are absent.** None of `github.com`, `reddit.com`, `alternativeto.net`, `peerpush.net`, `play.google.com` or `apps.apple.com` appears as a live referring domain in Ahrefs - while Search Console credits `reddit.com` with all ten external links it knows, and Bing lists GitHub, the App Store and AlternativeTo among the top results for the domain name. The two link indexes disagree, and neither has GitHub.

**Best by links:** `https://selftend.org/` - 366 referring domains, 522 backlinks; `/?from=AppAgg.com` - 1; `/crisis` - 1 (first seen 2 September 2026). Ahrefs has no link to a `www` URL at all; Search Console has links only to `www`.

## 5. The duplicate-host check

`curl -sI`, 2026-09-09 around 18:40 Sofia, user agent `Mozilla/5.0 (compatible; baseline-2285)`.

| URL                                                      | Status                        | What came back                                                                                                             |
| -------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `https://selftend.org/`                                  | 200                           | `text/html`, ETag `d92977a1…`, `Cache-Control: public, max-age=0, must-revalidate`, CSP, `nosniff`, `CF-Cache-Status: HIT` |
| `https://www.selftend.org/`                              | 200                           | the identical document (same ETag) - no redirect either way                                                                |
| `http://selftend.org/`                                   | 200                           | **served the shell over plain HTTP** - no redirect to HTTPS, no HSTS header                                                |
| `http://www.selftend.org/`                               | 200                           | the same                                                                                                                   |
| `https://selftend.org/index.html`                        | 307 → `/`                     | Cloudflare `html_handling`                                                                                                 |
| `https://www.selftend.org/index.html`                    | 307 → `/`                     |                                                                                                                            |
| `https://selftend.org/faq`                               | 200                           | the same document as `/` (same ETag)                                                                                       |
| `https://selftend.org/this-path-does-not-exist-2285`     | 200                           | the shell - the single-page-application fallback                                                                           |
| `https://www.selftend.org/this-path-does-not-exist-2285` | 200                           | the shell                                                                                                                  |
| `https://selftend.org/sitemap.xml`                       | 200 `text/html`               | the shell                                                                                                                  |
| `https://selftend.org/robots.txt`                        | 200 `text/plain`, 8,896 bytes | see below                                                                                                                  |
| `https://staging.selftend.org/`                          | 200                           | `x-robots-tag: noindex` present; different ETag                                                                            |

**robots.txt today.** Cloudflare's "Managed content" block (1,836 bytes) followed by the whole 7,060-byte HTML shell. The origin has no `robots.txt`, so the single-page fallback answers the request and Cloudflare prepends its managed block to whatever the origin returns - which is why Search Console counts 89 parse errors. The same body is served on `www` and on `staging`. The managed block says:

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot        Disallow: /
User-agent: Applebot-Extended  Disallow: /
User-agent: Bytespider       Disallow: /
User-agent: CCBot            Disallow: /
User-agent: ClaudeBot        Disallow: /
User-agent: CloudflareBrowserRenderingCrawler  Disallow: /
User-agent: Google-Extended  Disallow: /
User-agent: GPTBot           Disallow: /
User-agent: meta-externalagent  Disallow: /
```

So the zone already carries a Cloudflare-managed AI-crawler policy (search allowed, AI training refused, nine AI user agents disallowed) that no repo file records. Ahrefs' two "AI discoverability" issues are this block. The map's charting note "no robots.txt" was true of the origin and false of the edge.

**Other hosts under the name** (from Bing, §6): `selftend.com` and `www.selftend.com` answer 200 with a parked-domain lander (not the project's); `yoshevbot.uk` is listed by Bing with the title "Selftend" and refused connections on 2026-09-09.

## 6. Bing

`site:selftend.org` returned no selftend.org URL - Bing substituted "About 52 results" from an unrelated German school portal. The plain query `selftend.org` returned, in order: `https://selftend.org/` (title "Selftend"), `www.selftend.com` (the parked domain), `https://selftend.org/crisis` (title "Selftend", snippet "This app is not monitored by crisis responders and cannot provide emergency help." - rendered page text, so Bing executed the bundle for this URL), `yoshevbot.uk` (title "Selftend"), `github.com/Selftend/selftend`, the App Store listing, `alternativeto.net/software/selftend/about/`, `apkpure.com`, the GitHub README, `apppage.net`. Bing has at least two selftend.org URLs and shows the same one-word title for both.

## 7. One fact for the rendering question

A JavaScript-executing crawler creates no accounts: the guest sign-in in `src/providers/session-provider.tsx` is gated on `Platform.OS !== "web"`, so a headless browser loading any public route never calls `signInAnonymously`. Nothing in this baseline minted an auth user.

## 8. The largest defect

**Every URL on every host serves one identical `<head>` - the same eight-character title, the same description, no canonical, no `og:url` - so nothing but rendered body text distinguishes `/faq` from `/crisis` from `/`, and after six weeks with a verified property Google has indexed two of nine public routes (one of them the sign-up screen), shows the `<noscript>` fallback as the homepage snippet, and has never seen the other seven; a non-rendering crawler files all nine as one duplicate page with no H1, no words and no links; a rendering one files them as eight host-twinned pairs; and Bing shows the same one-word title for everything it has.** The host hygiene (four origins answering 200, `http://` never redirected, `www` never redirected, unknown paths 200, `robots.txt` = a Cloudflare block glued to the HTML shell, no sitemap) is the second defect, and the one Search Console already reports as "duplicate without user-selected canonical".

## Falsified premises

- "No `robots.txt`" - true of the repo and the origin; false at the edge. Cloudflare serves a managed block on every host and appends the shell to it.
- "Both instruments live" already covered #2282; this baseline adds that the Ahrefs project's Execute JavaScript setting **is** available and persists on the Free plan when saved by a real click (a scripted `click()` on Save silently does nothing - three attempts read "off" after reload, one real click read "on").
- The tiers research recorded "Free + Search Console answers the indexability spec"; the baseline agrees, with one gap: Ahrefs' link index is missing every referring domain the project actually knows about, so Site Explorer is not the instrument for "who links to us" - Search Console's Links report is.
- Ahrefs' first crawl and Search Console's robots.txt readings both describe the pre-v0.18.0 shell; readings taken before 15:50 Sofia on 2026-09-09 are of a site that no longer exists.

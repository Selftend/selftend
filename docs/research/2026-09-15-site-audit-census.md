# Census: what the Ahrefs Site Audit of selftend.org finds, and which of it is real

**Ticket:** [#2420](https://github.com/Selftend/selftend/issues/2420) on map [#2419](https://github.com/Selftend/selftend/issues/2419). **Taken:** 2026-09-15. **Never edited after this commit** - a later census is a new file. Site read against `origin/dev` at `9ca84482` (the branch point) and the live site at the times below.

## Headline

**43 findings across 11 issue types. Zero real build defects against `docs/indexability.md`.** 5 issue types (17 findings) are **by design**; 2 types (16 findings) are the instrument's AI-bot taxonomy reading an intended policy; 1 type (8 findings) is a pure **instrument artefact** of the project's own settings; 3 types (7 findings) are **true readings the spec is silent on** - two real orphans and five single-inlink pages - and the two orphans are the only findings that cost Health Score without a decision already made.

| Classification | Types | Findings | Health Score cost |
| --- | --- | --- | --- |
| By design (the spec says so) | `404 page`, `4XX page`, `Page has links to broken page`, `3XX redirect`, `Meta description too short`, `Meta description too long` | 12 | 3 of the 5 error URLs |
| By design, read through the instrument's bot taxonomy | `Inconsistent AI training bot policy`, `Indexable page blocked from some AI search bots` | 16 | none (notices) |
| Instrument artefact (project settings) | `Indexable page not in sitemap` | 8 | none (notice) |
| Real reading, spec-silent | `Orphan page` (error), `Page has only one dofollow incoming internal link` (notice) | 7 | 2 of the 5 error URLs |
| Real build defect | - | **0** | - |

**Health Score 71** = 12 internal URLs without an Error-severity issue / 17 crawled internal URLs (the denominator counts the three `robots.txt` fetches and the three static resources, not only pages). The 5 URLs with errors: `/sign-up`, `/sign-in` (404), `/` (links to them), `/security`, `/account-deletion` (orphans). Arithmetic for the policy ticket: turning off the three by-design error issues → 15/17 = **88**; also clearing the two orphans (a link, or a turn-off) → 17/17 = **100**.

## The crawl this census reads

- **Started by this ticket** at 15:45 local (Europe/Sofia, UTC+3) on 2026-09-15; finished 15:47; duration 0:02:19; stop reason "No more urls to crawl". 17 URLs crawled, 8 billed pages, 14,978 crawl credits left afterwards.
- Identical per-issue counts to the scheduled crawl of 2026-09-11 09:34 (which charting read): the 11 Sep crawl was **not** the artefact - it did not run on stale `www` seeds.
- Overview after the crawl: Health Score 71 ("Good"); crawled URLs 14 = 11 internal + 3 resources; issues 43 = 7 errors, 7 warnings, 29 notices (11 Sep: 44 with 30 notices - the one-notice difference does not show in the per-issue table, whose counts are identical); error distribution 17 = 12 without / 5 with; HTTP status 14 × 2xx, 2 × 4xx, 1 × 3xx.

### Crawl log, verbatim (15:45:30 - 15:45:58)

| Time | Status | Type | Size | Outlinks | URL |
| --- | --- | --- | --- | --- | --- |
| 15:45:30 | 200 | text/plain | 909 | 0 | `https://selftend.org/robots.txt` |
| 15:45:31 | 200 | text/plain | 876 | 0 | `http://selftend.org/robots.txt` |
| 15:45:31 | 200 | text/plain | 876 | 0 | `https://www.selftend.org/robots.txt` |
| 15:45:32 | 200 | text/html | 12.2K | 7 | `https://selftend.org/` |
| 15:45:34 | 301 | text/html | 167 | 0 | `https://www.selftend.org/` |
| 15:45:36 | 200 | text/html | 12.7K | 1 | `https://selftend.org/faq` |
| 15:45:38 | 200 | text/html | 10.8K | 1 | `https://selftend.org/crisis` |
| 15:45:40 | 200 | text/html | 17.1K | 1 | `https://selftend.org/privacy` |
| 15:45:42 | 200 | text/html | 12.9K | 1 | `https://selftend.org/terms` |
| 15:45:44 | 200 | text/html | 11.6K | 1 | `https://selftend.org/security` |
| 15:45:46 | 200 | text/html | 11.6K | 1 | `https://selftend.org/cookies` |
| 15:45:48 | 200 | text/html | 10.9K | 1 | `https://selftend.org/account-deletion` |
| 15:45:50 | 404 | text/html | 1.4K | 0 | `https://selftend.org/sign-up` |
| 15:45:52 | 404 | text/html | 6.8K | 0 | `https://selftend.org/sign-in` |
| 15:45:54 | 200 | text/javascript | 6.8K | 0 | `/_expo/static/js/web/index-292d0139….js` |
| 15:45:56 | 200 | text/css | 5.5K | 0 | `/_expo/static/css/web-fff293f6….css` |
| 15:45:58 | 200 | image/png | 639.6K | 0 | `/assets/assets/icon.415df6c5….png` |

No `sitemap.xml` fetch appears in the log (see issue 11). The `www` host is the crawler's own seed - target mode *Subdomains* - not a link on the site.

### Crawl settings as found (project 10345616, read 2026-09-15 before the crawl; nothing changed)

- **Audit type** Scheduled audit; **schedule** Monthly, 9th, 12:00-12:59 AM (GMT+03:00 Sofia); always-on audit: No (Pro-only).
- **Scope** scheme `https`, domain or path `selftend.org/`, target mode **Subdomains**.
- **URL sources**: ☑ Website · ☐ Auto-detected sitemaps · ☐ Specific sitemaps · ☑ **Custom URL list** · ☐ Backlinks.
- **Custom URL list, verbatim (8 lines, no `www`)**: `https://selftend.org/`, `/faq`, `/crisis`, `/privacy`, `/terms`, `/security`, `/cookies`, `/account-deletion` (each absolute on the apex).
- **Speed** 30 URLs/min. **Settings**: Execute JavaScript Yes; check images / CSS / JavaScript Yes; follow links on non-canonical pages Yes; follow nofollow links Yes; check HTTP status of external links No; remove URL parameters No.
- **Limits**: max internal pages 5000; max crawl duration 48 h; max depth from seed 16; max folder depth 16; max URL length 2048; max query parameters 12.
- **Robots**: ignore robots.txt No; user agent `AhrefsSiteAudit (Mobile)` - `Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.173 Mobile Safari/537.36 (compatible; AhrefsSiteAudit/6.1; +http://ahrefs.com/robot/site-audit)`.
- HTTP authentication off; no custom headers; IndexNow API key empty, auto-submit off; AI content detection off.

## The live site, read the same afternoon (curl, 2026-09-15 ~15:20 local)

- All 8 index-list routes: **200**, `Content-Type: text/html`, `Cache-Control: public, max-age=0, must-revalidate`, no `X-Robots-Tag`, each with its own `<link rel="canonical">` to the apex URL and its own `<meta name="description">`. `/sign-up`, `/sign-in`: **404**. `https://www.selftend.org/` and `/faq`: **301** → apex. `http://selftend.org/`: **301** → https. `/index.html` and `/faq/`: 307 → the clean path. `/sitemap.xml`: 200 `application/xml`, exactly the 8 index-list locs in index-list order. `/robots.txt`: 200 `text/plain`, Cloudflare's managed AI-crawler block **prepended** to the repo's `User-agent: * / Disallow: / Sitemap:` lines.
- ⚠️ **Observation outside the issue table:** `https://www.selftend.org/robots.txt` and `http://selftend.org/robots.txt` both answer **200 with only Cloudflare's managed block** (1836 bytes) - no `Sitemap:` line and none of `public/robots.txt` (the apex file is 1903 bytes; the diff is exactly our four lines). Cloudflare's managed robots.txt answers at the edge before the `www` redirect rule and Always Use HTTPS run. Harmless for the index (every page on those origins is a 301, and Google reads the sitemap from the apex file and Search Console), but it is a fact `docs/deployment.md` § *Cloudflare zone settings* does not state; the spec assembly ticket can decide whether it records it.
- **Link graph of the exported HTML** (the crawler executes JavaScript, but the exported files already carry the anchors): `/` links `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/sign-up`, `/sign-in` (7 - matches the crawl's 7 outlinks). Each of the other 7 pages links only `/`. **No public page carries an `href` to `/security` or `/account-deletion`.**

## The eleven issues

Severity is Ahrefs'. "Closing it" names the smallest action that makes the row disappear; whether to take it is the health-score policy ticket's decision, not this file's.

| # | Issue (severity) | Count | URLs | Classification | Evidence | Closing it would take |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `404 page` (error) | 2 | `/sign-up`, `/sign-in` - depth 1, first found at `/`, 1 inlink each, "Is indexable: No" | **By design** | indexability.md § 6.4: the `(auth)` screens have no file, `not_found_handling = "404-page"` in both `wrangler*.toml`, so they leave Google's index by status; `scripts/lib/index-list.js` `INDEX_LIST` omits them; live curl 404. Ahrefs' panel: "indicates that the requested URL does not exist … remove these links or replace them … or set 301 redirects" - every fix it offers contradicts § 6.4 | Nothing on the site. Per-issue turn-off in the project (Health Score counts errors per URL - #2421) |
| 2 | `4XX page` (error) | 2 | the same two URLs | **By design** | same as 1; Ahrefs' panel adds "pages that changed their response code to 4xx will be removed from Google's index" - which is the intent | Same lever. ⚠️ A second, separate issue on the same URLs: turning off `404 page` alone leaves these two URLs in error |
| 3 | `Orphan page (has no incoming internal links)` (error) | 2 | `/account-deletion`, `/security` - 0 href / redirect / canonical / hreflang / pagination / CSS / IMG / JS inlinks; "Referenced in sitemaps: 0" | **Real reading, spec-silent** (not an artefact: they are seeds only because the custom list names them, and the live HTML confirms no public page links them) | Ahrefs' definition: "URLs that have no incoming internal links. These pages were either specified as seeds for the crawl or were found in the sitemap file." On `origin/dev` the only ways in are `app/privacy.tsx:25` (a `Button onPress={() => pushWithOrigin("/security")}` - a press handler, **not an anchor**, so no `href` reaches the export), `src/components/app/sign-up-form.tsx:461` (same pattern, on a 404 route) and `app/(app)/legal.tsx:66` (`/account-deletion`, gated). indexability.md § 3 makes both indexable and lists them in the sitemap but never requires an internal link; Google reaches them via the sitemap | Either an `href` from a public page (e.g. the privacy page's existing security button rendered as a link; a link to `/account-deletion` from `/privacy` or the landing's legal row) - a site change that is not keyword copy - or accept + per-issue turn-off. **Decision for #2424** |
| 4 | `Page has links to broken page` (error) | 1 | `/` → `/sign-in` 404, `/sign-up` 404 (2 internal outlinks to 4xx, 0 external) | **By design** | `src/components/app/landing/landing-screen.tsx:99` and `:102` - the landing's two `LinkButton`s to `/(auth)/sign-up` and `/(auth)/sign-in`; § 6.4 and the map's Notes: the landing must link to them | Per-issue turn-off. ⚠️ Observed: this issue is **independent** of issues 1-2 - it stays reported on `/` regardless of what happens to the 404 rows, so clearing the landing's error needs its own turn-off (#2421's open question, now half-answered: the row exists on its own; whether it survives after 1-2 are turned off is still to be observed on the next crawl) |
| 5 | `3XX redirect` (warning) | 1 | `https://www.selftend.org/` → 301 → `https://selftend.org/` (200); not a loop; **0 inlinks**, 0 redirect inlinks | **By design** | § 6.1's zone-level redirect rule, live since 2026-09-11 - hence "New" on the 11 Sep 09:34 crawl. Nothing on the site links the `www` host; the crawler seeded it itself (target mode Subdomains) | Nothing on the site. Either accept (warnings never touch the score), per-issue turn-off, or narrow the crawl's target mode so `www` is not seeded - the last also removes the `www` `robots.txt` fetch from the denominator |
| 6 | `Meta description too short` (warning) | 5 | `/privacy` 75 · `/faq` 68 · `/terms` 74 · `/cookies` 53 · `/account-deletion` 72 (Ahrefs' counts, apostrophe decoded; text below) | **By design** | § 4.1: the description is the page's existing on-page subline verbatim, one source, gated by `test/positioning-copy.test.ts`; positioning.md: a length warning is not a reason to write copy. Keys: `policies.json` `pageDescription` at lines 7 (privacy), 187 (terms), 338 (account-deletion), 367 (cookies), 412 (faq) in `src/i18n/locales/en/`. **Not flagged**: `/security` 102, `/crisis` 111 - so Ahrefs' "short" threshold sits between 76 and 102 characters (its help centre does not publish the number) | Nothing. Accept or turn off |
| 7 | `Meta description too long` (warning) | 1 | `/` - 213 characters | **By design** | § 4.1 keeps "today's 213-character description as is: Google's ~155-160 character snippet is a truncation, not a cap"; the binding rule is positioning's frame-carrier rule. Key `auth:landingPage.metaDescription` (`auth.json:174`) | Nothing. Accept or turn off |
| 8 | `Inconsistent AI training bot policy` (notice) | 8 | all 8 index-list pages | **By design, read through Ahrefs' taxonomy** | What Ahrefs compared, per page: *Blocked AI training bots* = `Applebot-Extended`, `ClaudeBot`, `GPTBot`, `Google-Extended`, `Meta-ExternalAgent`; *Allowed AI training bots* = **`DeepseekBot`, `anthropic-ai`, `xAI-Bot`** - three agents Cloudflare's managed block does not name, so a plain `User-agent: *` allow reaches them. The policy itself (block training, allow search: `Content-Signal: search=yes,ai-train=no,use=reference`) is § 6.5's - "Cloudflare's managed AI-crawler block stays on" | Nothing in this map. Either accept / turn off, or add the three agents to `public/robots.txt` - a **content-policy decision, not search operations**; the census only names it |
| 9 | `Indexable page blocked from some AI search bots` (notice) | 8 | all 8 index-list pages | **By design, read through Ahrefs' taxonomy** | *Blocked AI search bots* = **`Amazonbot`** (Cloudflare's list disallows it; Ahrefs classes it as an AI *search* bot). *Allowed AI search bots* = 16, incl. `Amzn-SearchBot`, `Amzn-User`, `Applebot`, `ChatGPT-User`, `Claude-SearchBot` | Nothing in this map; same fork as 8 (the managed list is Cloudflare's, not the repo's) |
| 10 | `Page has only one dofollow incoming internal link` (notice) | 5 | `/crisis`, `/privacy`, `/faq`, `/terms`, `/cookies` - 1 dofollow, 0 nofollow inlink each | **Real reading, spec-silent** | The live link graph: each is linked from `/` and nowhere else. Not in charting's list (it read the overview's top-10; this is the eleventh type, and the 43 sums only with it) | Nothing required; no score effect. Any cross-linking is a product-surface question, not this map's |
| 11 | `Indexable page not in sitemap` (notice) | 8 | all 8 index-list pages - "Is in sitemap: No" on every row | **Instrument artefact** | The project's URL sources are *Website* + *Custom URL list*; **both sitemap sources are unchecked**, so the crawl never fetched `sitemap.xml` (none in the crawl log; "Referenced in sitemaps: 0" everywhere). The live sitemap lists exactly these 8 URLs. Not a stale-seed effect: the custom list has no `www` twin | Tick *Auto-detected sitemaps* (or *Specific sitemaps* = `https://selftend.org/sitemap.xml`) in project settings → Site Audit → URL sources, then re-crawl. Also lets the audit report the sitemap-side issues it currently cannot see. The runbook's line "URL sources: the website plus the custom list" would then be amended |

### The five short descriptions, verbatim (Ahrefs' length)

- `/privacy` (75): How Selftend handles your account, preference, and private CBT record data.
- `/faq` (68): What Selftend is, what it isn't, and what happens to what you write.
- `/terms` (74): Terms of service for Selftend, a set of free, private mental health tools.
- `/cookies` (53): How the web version of Selftend uses browser storage.
- `/account-deletion` (72): How to permanently delete your Selftend account and all associated data.

Unflagged, for the threshold: `/security` (102): Plain-language summary of the technical and procedural safeguards we use to keep your entries private. · `/crisis` (111): This app is not emergency support and is not monitored. If you are in danger, contact local emergency services.

## Charting's premises, verified

| Premise (2026-09-15 charting) | Verdict |
| --- | --- |
| The custom URL list may still carry `www` twins from before the redirect | **False.** Eight apex URLs, nothing else |
| The 8 "not in sitemap" notices mean the crawl's URL set is not the index list, or the sitemap was not fetched | **The sitemap was never fetched** - both sitemap URL sources are off. The URL set *is* the index list |
| `3XX redirect` ×1 is the `www` → apex rule | **True**, and self-seeded by the crawler |
| `Orphan page` ×2 - which two, and live or seed-only | `/security`, `/account-deletion`; **orphans on the live site**, not a seed effect |
| The AI-bot notices compare Cloudflare's managed block to something | To Ahrefs' own bot taxonomy: three training agents the block does not name, and `Amazonbot` filed as a search bot |
| 44 issues = 7 E / 7 W / 30 N | 43 = 7 / 7 / 29 today, same per-issue counts; the 11th type (`only one dofollow inlink` ×5) was missing from charting's list |
| The 11 Sep crawl ran hours after the redirect and may be stale | Its counts are identical to a fresh crawl; not stale |

## What this hands on

- **To the health-score policy ticket:** the three by-design error issues and the lever arithmetic (71 → 88 → 100); the orphan decision (a public `href` or a turn-off); whether `www` leaves the crawl scope; whether the two AI-bot notices and the two description warnings are turned off or simply accepted; and that the sitemap source is a settings fix, not a site fix.
- **To the standings ticket / runbook:** the monthly audit's "what to ignore" list is exactly issues 1, 2, 4, 5, 6, 7 (by design), 8-9 (taxonomy), 11 (until the sitemap source is on); a regression is any *new* issue type or any change in the eight pages' 200 / canonical / description rows.
- **Outside this map, named only:** whether `public/robots.txt` should also name `DeepseekBot`, `anthropic-ai`, `xAI-Bot`; whether deployment.md records that Cloudflare's managed robots.txt answers on `www` and `http` before the redirects.

## Method notes

- Ahrefs via Chrome: issue rows on *All issues* open a `data-explorer` page whose text carries every column; the "Why and how to fix" side panel appends its text to the page (captured for issues 1-2; for 3 and 5 the help-centre articles were read instead: [Orphan page](https://help.ahrefs.com/en/articles/2694175-orphan-page-error-in-site-audit), [3xx redirect](https://help.ahrefs.com/en/articles/2754202-3xx-redirect-warning-in-site-audit)). The project-settings page reports "unsaved changes" after merely switching its tabs; nothing was saved.
- Live reads: `curl -sI` per URL; descriptions and canonicals from the exported HTML with `grep`; the link graph from every `href=` in each page's HTML.

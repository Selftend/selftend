# How the Ahrefs Health Score is computed, and what moves it

Date: 2026-09-15 · Map: #2419 · Ticket: #2421 (research) · Hands to: #2424 (health-score policy)

Every claim below is against an Ahrefs primary source (help centre, developer docs, Ahrefs blog,
Ahrefs plan pages), read on **2026-09-15**. Help-centre articles show only "Updated over a week
ago"; where a page carries a real date it is given. "No documentation found" means the sources
listed under Sources were read and are silent — the silence is the finding.

## Summary

1. **Formula.** Health Score = (crawled internal URLs with no Error-importance issue ÷ total crawled
   internal URLs) × 100; only red **Error** issues count, Warnings and Notices never; it is
   per-URL, so a URL with two Errors is one bad URL; Ahrefs does not document whether redirecting
   or robots-blocked URLs sit in the denominator, but an internal 4xx URL is itself an Error, so it
   is both in the denominator and counted bad.
2. **Levers.** Turning an Error issue off (per-issue, for a project or globally) raises the score
   and Ahrefs says so in as many words; lowering an issue's importance below Error does the same;
   scope, exclude patterns, seed sources and max-depth change what is crawled and therefore the
   denominator; **no per-URL ignore is documented anywhere**.
3. **Deliberate 404s.** A URL excluded from the crawl cannot carry the "4XX page" Error, but Ahrefs
   never says whether an excluded target is still fetched as a link and whether "Page has links to
   broken page" still fires on the page that links to it — no documentation found either way.
4. **Free tier after 2026-10-10** (the project's own Starter billing date per #2308, not an Ahrefs
   date): 5,000 crawl credits per verified project per month (identical to Starter for verified
   projects), scheduled crawls, all 170+ issues and the per-issue turn-off, 12-month audit
   retention; **lost**: export rows (0/month on Free _and_ Starter), unverified projects, Always-on
   audit; Looker Studio was never available below Advanced, so nothing changes there.
5. **Google.** Ahrefs' own blog states "Google doesn't take any third-party metric into account as
   a ranking factor"; no Ahrefs page ties the Health Score to Search Console; a 71 is an internal
   consistency number over Ahrefs' own crawl, nothing more, by Ahrefs' own account.

## 1. The formula

**Definition (help centre, [HS]):** "Health Score reflects the proportion of internal URLs crawled
by Site Audit that don't have errors." The worked examples are (10 − 2) ÷ 10 × 100 = 80 and
(100 − 80) ÷ 100 × 100 = 20. The Academy page [ACAD] and the SEO-score blog post [SEOSCORE] repeat
the same sentence: "we take the number of internal URLs without an error, divide it by the total
number of internal URLs and multiply it by 100 to get a percentage."

**API definition ([API]),** which is the tightest wording Ahrefs publishes: Health Score "reflects
the proportion of internal URLs on your site that do not have errors, based on the last finished
crawl"; the companion fields are `Total` = "number of total crawled internal URLs",
`URLs with Errors` = "number of internal URLs with errors", plus URLs with Warnings and URLs with
Notices as separate counts.

**Which severities count ([HS], [PRESET]):** "Only 'Error' (red) issues lower health score.
Warning (yellow) and Notice (blue) issues are not as severe, and thus do not affect Site Audit
health score at all." [PRESET] restates it as "the percentage of URLs on a crawled site that
contain issues with Error importance".

**One URL, two Errors — counts once.** Not stated as a sentence, but it follows from the formula
being over URLs ("number of internal URLs without an error") and from the API exposing `URLs with
Errors` as a URL count rather than an issue count [API]. A second Error on an already-bad URL
cannot move the score.

**Internal only.** Every definition says "internal URLs" [HS] [API] [ACAD]. External URLs linked
from the site are crawled to check status but are not internal [CREDITS]. What "internal" means is
set by the project scope mode — Exact URL, Path, Domain, or Subdomains, plus http/https — and a
`www.` twin is outside a Path- or Domain-scoped project but inside a Subdomains-scoped one [SCOPE].

**Non-200 URLs and resources in the denominator — partly documented:**

| URL kind              | In the denominator?                                                  | Carries an Error itself?         | Source         |
| --------------------- | -------------------------------------------------------------------- | -------------------------------- | -------------- |
| Internal HTML 200     | Yes                                                                  | Only if an Error issue matches   | [HS] [CREDITS] |
| Internal 4xx          | Implied yes — the issue is on "internal page URLs that returned 4xx" | Yes — "4XX page" is an Error     | [4XX]          |
| Internal 3xx          | No documentation found                                               | No — "3xx redirect" is a Warning | [3XX]          |
| Blocked by robots.txt | No documentation found                                               | No documentation found           | [DASH]         |
| Images / CSS / JS     | No documentation found                                               | No documentation found           | [CREDITS]      |
| External URLs         | No — not internal                                                    | n/a                              | [CREDITS] [HS] |

The dashboard reports "Crawled", "Redirects (3XX)", "Broken (other than 2XX or 3XX)" and "Blocked
(by robots.txt)" as four separate numbers [DASH]; whether those buckets are disjoint from
"Crawled" or subsets of it is not documented. [CREDITS] says redirects, 4xx/5xx and resources are
crawled but do not spend credits, which is about billing, not the score.

## 2. Every lever that changes it, and what each hides

### 2a. Turning an issue off ("Turn off for this project")

- **Mechanism ([PRESET]):** on the Overview or All issues page, the three-dot menu on an issue →
  turn it off for this project; re-enable from All issues → Turned off. The same can be done
  globally for all projects from the Site Audit settings icon.
- **Effect on the score, in Ahrefs' words ([PRESET]):** "If you turn off an Error issue for a
  project that has URLs containing that error, the Site Audit health score will go up. However,
  this doesn't mean the project itself no longer has that issue, just that Site Audit is no longer
  considering that issue in its health score calculation." Turning off a Warning or Notice changes
  nothing.
- **Granularity: per issue, not per URL.** [PRESET] describes only issue-level toggles. No help
  article, Academy page or product post documents an "ignore this URL for this issue", "mark as
  fixed" or "not an issue" action — **no documentation found.** The URL details panel lists a
  page's issues [NOTONSITE] but no per-URL suppression is described. Page Explorer filters narrow
  a report view and "do not consume credits" [FILTERS]; nothing says they touch the score.
- **What it hides:** every URL carrying that Error, on every future crawl, including URLs that
  acquire the defect later. The turn-off is not scoped to the URLs that had the issue when it was
  turned off.

### 2b. Changing an issue's importance

- **Mechanism ([PRESET]):** in global settings each pre-set issue's importance can be set to Error,
  Warning or Notice. Because only Error counts, demoting an issue to Warning removes it from the
  score exactly as turning it off does, while leaving it visible in reports.
- **Custom issues ([CUSTOM]):** built from a Page Explorer filter; the author picks "the level of
  importance". Whether an Error-importance custom issue enters the Health Score is **not
  documented**; the formula's wording ("issues with Error importance") does not exclude it.
- **What it hides:** the same URLs as 2a, but the issue still shows in the report under a colour
  that the score ignores.

### 2c. Excluding URLs from the crawl (Project settings → Site Audit → Crawl settings)

- **Mechanism ([AVOID] [SETTINGS]):** "Only crawl URLs matching the pattern" (include) and "Don't
  crawl URLs matching the pattern" (exclude), both regex, matched against the full URL; a URL
  matching both is excluded. Also "Remove URL parameters", "Max depth level from seed", max pages
  and max duration, "Follow nofollow links", "Crawl non-canonical pages", "Check image/CSS/JS
  links", and robots-based limits. Settings apply to future crawls only [SETTINGS].
- **Effect on the score:** an excluded URL is not a crawled internal URL, so it leaves both the
  denominator and — if it was a 4xx — the Error count. Ahrefs does not state this as a sentence;
  it follows from "internal URLs crawled by Site Audit" [HS] and `Total` = "crawled internal URLs"
  [API]. [AVOID] itself "does not address whether excluded URLs appear in reports or affect Health
  Scores" — **no documentation found** on the direct question.
- **Deliberate 404s (`/sign-up`, `/sign-in`, `docs/indexability.md` § 6.4):** excluding them
  removes the "4XX page" Error on those URLs. Whether the crawler still _fetches_ an excluded URL
  as a link target and therefore still raises **"Page has links to broken page"** on the linking
  page is **not documented**: [BROKENLINKS] reports "pages that link to URLs returning one of the
  4xx or 5xx HTTP response codes", with separate columns for internal and external targets, and
  says nothing about excluded or robots-blocked targets. The "known vs crawled" wording in
  [SITEMAP] — "Crawled URLs are the ones that were inside the scope of your project, while all
  known URLs include also discarded URLs" — shows Ahrefs keeps a record of discarded URLs, but not
  whether their status codes are fetched.
- **What it hides:** everything on the excluded URLs, and any issue whose detection depends on
  crawling them (4xx, redirects, canonical, sitemap membership), for every future crawl.

### 2d. Seed / URL sources (Project settings → Site Audit → URL sources)

- **Mechanism ([SETTINGS]):** seeds are Website (the scope URL), Auto-detected sitemaps, Specific
  sitemaps, Custom URL list (typed or CSV/TXT upload, 16 MB), and Backlinks (URLs with external
  backlinks in Ahrefs' index). "Only URLs within the project's scope will be crawled." Restricting
  to a list is done by leaving only that source ticked and setting "Max depth level from seed" to
  0, which "will tell our crawler not to go further than URLs found in the sitemap" [SITEMAP].
- **Stale custom list / `www` twins:** an in-scope seed that now redirects is crawled (redirects
  are crawled at no credit cost [CREDITS]) and is reported under "3xx redirect", a **Warning**
  [3XX] — so it cannot lower the score through that issue. Whether it inflates `Total` (the
  denominator) is **not documented** (see the table in § 1). A stale seed that now 4xx's is an
  internal 4xx and therefore an Error [4XX]. A `www.` seed is only in scope under the Subdomains
  mode, or under Domain mode when the project's domain is the `www.` host [SCOPE].
- **Unexpected URLs in reports ([NOTONSITE]):** Ahrefs' own explanation is that they come from
  links or sitemaps the crawler found; the URL details panel shows the inlink and anchor and
  "whether a URL is internal and if it is present in the sitemap".
- **What it hides:** nothing directly — sources add URLs rather than remove them — but trimming
  the list, or dropping Backlinks as a source, removes stale inbound-linked URLs from the crawl and
  with them any 4xx Error they carried; that is a real defect for visitors arriving from those
  backlinks.

### 2e. `robots.txt` and `noindex`

- **robots.txt ([SETTINGS] [ROBOTS]):** AhrefsSiteAudit "Obeys robots.txt: Yes by default", and
  "Only verified site owners can allow AhrefsSiteAudit crawler to disobey robots.txt on their site
  so they can check for issues on the site sections normally disallowed for crawling" [ROBOTS];
  the override is a crawl setting on a verified project [SETTINGS].
  Blocked URLs are counted in the dashboard's "Blocked" figure [DASH]. Whether blocked URLs are in
  the Health Score denominator, or carry any Error, is **not documented**.
- **noindex ([NOINDEX] [AVOID]):** flagged under "Noindex page" as a **Warning**, so it never
  lowers the score. "It's not possible to exclude noindex pages before a crawl" because the bot
  cannot know the directive until it fetches the page; noindex pages can be filtered out of
  reports afterwards. Noindex pages are therefore crawled internal URLs and, by the formula, in
  the denominator; any Error they carry counts.
- **What it hides:** ignoring robots.txt _adds_ URLs (and their Errors) rather than hiding
  anything; there is no lever that removes noindex URLs from the score short of an exclude pattern
  (2c).

## 3. What the free tier keeps after 2026-10-10

The date is the project's Starter subscription's next billing date ("Ahrefs Starter is $29 a
month, subscribed 2026-09-10, next billing 2026-10-10", repo issue #2308, closed). No Ahrefs page
announces a change on or around that date; searches for one found none. What follows is the free
tier as documented today. Ahrefs has renamed the tier: "Ahrefs Webmaster Tools is the original
name … Ahrefs Free is the same plan, renamed to reflect everything it now includes" [AWT-PAGE].

| Capability                                      | Free (verified site)                                                                                                                                                | Starter, for comparison             | Source                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------- |
| Site Audit crawl credits                        | 5,000 per verified project per month; only 200-status HTML pages spend them                                                                                         | Same 5,000 for verified projects    | [FREE-HELP] [STARTER] [PLANS] |
| Unverified projects                             | None                                                                                                                                                                | 500 max pages, 10,000 credits/month | [STARTER] [PLANS]             |
| Number of verified projects                     | Unlimited                                                                                                                                                           | Unlimited                           | [AWT-PAGE] [PRICING-BLOG]     |
| Issues checked                                  | "All 170+ issues that site audit tracks by default"                                                                                                                 | Same                                | [FREE-HELP]                   |
| Issue turn-off / importance (the ignore list)   | Described without plan gating in [PRESET]; the 2024 AWT post says free users can "disable unwanted issues"                                                          | Same                                | [PRESET] [AWT-BLOG]           |
| Scheduled crawls                                | "Run scheduled Crawls" toggle described without plan gating; AWT post: "automated scheduled crawls with email alerts"                                               | Same                                | [SETTINGS] [AWT-BLOG]         |
| Custom URL list / URL sources                   | Described without plan gating                                                                                                                                       | Same                                | [SETTINGS]                    |
| Ignore robots.txt                               | Verified projects only — so available on Free                                                                                                                       | Same                                | [SETTINGS] [ROBOTS]           |
| Crawl history                                   | "All subscription plans retain site audit data for 12 months only" [HISTORY]; the 2024 AWT post said "3 months" [AWT-BLOG] — **conflict**, the help centre is newer | Same 12 months                      | [HISTORY] [AWT-BLOG]          |
| Export rows                                     | **0 rows/month**                                                                                                                                                    | **0 rows/month**                    | [PLANS]                       |
| Site Audit PDF overview / per-issue export      | Described in [EXPORT] without plan gating; but see the 0-row export limit above                                                                                     | Same                                | [EXPORT] [PLANS]              |
| Looker Studio connector                         | Not available — "Advanced plan or higher"                                                                                                                           | Not available                       | [LOOKER]                      |
| Always-on audit                                 | Not available (Lite and higher; Free/Starter only for boosted projects)                                                                                             | Not available                       | [ALWAYSON]                    |
| API `Project Health Scores` endpoint            | "Free and do not consume any API units" — needs an API key; plan gating for keys not checked                                                                        | —                                   | [API]                         |
| Historical data (Site Explorer, not Site Audit) | None                                                                                                                                                                | 1 month                             | [STARTER] [PRICING-BLOG]      |

Reading of the table: for a **verified** site the Starter → Free downgrade changes nothing in Site
Audit that any Ahrefs page documents — same credits, same issues, same scheduling, same retention,
same zero export rows. The Starter-only losses are unverified projects, Site Explorer history and
Rank Tracker/Keywords Explorer credits, none of which the health-score work uses. Two things are
**not documented for Free specifically**: whether the "Turned off" issue list and the custom URL
list survive a downgrade (nothing says they are wiped; nothing says they persist), and whether
export row limits of 0 also block the Overview PDF (the PDF is described as "Print", not as an
export). Pricing note: Starter is $29/month and "Features and limits on this plan may be changed
without prior notice" [STARTER]; the public pricing page lists Lite/Standard/Advanced crawl
credits as 100,000 / 500,000 / 1,500,000 [PRICING] (read 2026-09-15).

## 4. Health Score versus Google's own signals

- **Ahrefs' own claim ([SEOSCORE], Ahrefs blog, guest author Jenny Abouobaia, published
  2023-08-07):** "Google doesn't take any third-party metric into account as a ranking factor."
  The same post adds: "Google does use its own algorithms that take into consideration some of the
  factors that contribute to your SEO score." It also sets Ahrefs' informal bands: over 80 is
  "good", above 90 is "excellent".
- **Search Console:** no help-centre or Academy page relates the Health Score to Search Console
  data. [DASH] lists the Health Score's data source as Site Audit and its refresh as "the last
  crawl depending on your project's crawl settings"; the Search Console tie-ins documented are
  project import ("By connecting your Google Account, you would be able to easily add any websites
  that are already verified in Google Search Console") and GSC performance shown "from your
  Dashboard, and in Rank Tracker" [ADDPROJ], plus a Site Audit marketing line "Integrate with Data
  Studio, PSI, and GSC/GA (soon)" [SA-PAGE]. None of these is described as feeding the score.
  **No documentation found** that any Google signal enters the number.
- **Net:** by Ahrefs' own account the score is a ratio over Ahrefs' own crawl under the project's
  own settings. A 71 has bearing on Google only through the individual Error issues behind it,
  each judged on its own merits — not through the number.

## What this hands to #2424

- The score is per-URL and Error-only; the only levers that change it without changing the site
  are issue turn-off, issue demotion and crawl exclusion, and Ahrefs documents the first as
  explicitly cosmetic. None is per-URL; each hides the issue on every URL forever.
- For the deliberate 404 routes, exclusion removes the "4XX page" Error but the docs cannot say
  whether "Page has links to broken page" survives on the linking pages; that has to be observed
  on a real crawl, not read.
- Whether redirecting seeds inflate the denominator is undocumented; it too has to be observed
  (compare `Total` in the API or the dashboard's Crawled figure before and after pruning the list).
- Nothing about the Free tier changes the Site Audit mechanics for a verified site, so a policy
  written now stays valid after 2026-10-10; the zero export rows on both tiers means the
  evidence trail is the API endpoint or screenshots, not CSVs.

## Sources

All read 2026-09-15.

- [HS] What is Health Score and how is it calculated in Ahrefs Site Audit? —
  <https://help.ahrefs.com/en/articles/1424673-what-is-health-score-and-how-is-it-calculated-in-ahrefs-site-audit>
- [PRESET] How to configure pre-set issues within Ahrefs Site Audit —
  <https://help.ahrefs.com/en/articles/1420169-how-to-configure-pre-set-issues-within-ahrefs-site-audit>
- [CUSTOM] How to customise your own issue on Ahrefs Site Audit —
  <https://help.ahrefs.com/en/articles/1427937-how-to-customise-your-own-issue-on-ahrefs-site-audit>
- [API] Project Health Scores (Ahrefs for Developers) —
  <https://docs.ahrefs.com/en/api/reference/site-audit/get-projects>
- [ACAD] Ahrefs Academy, Site Audit → Overview —
  <https://ahrefs.com/academy/how-to-use-ahrefs/site-audit/overview>
- [DASH] Understanding the Metrics in the Dashboard Overview —
  <https://help.ahrefs.com/en/articles/5373022-understanding-the-metrics-in-the-dashboard-overview>
- [CREDITS] How are Crawl Credits in Site Audit spent? —
  <https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent>
- [SCOPE] How to define the scope of a crawl in Site Audit using different modes —
  <https://help.ahrefs.com/en/articles/2834076-how-to-define-the-scope-of-a-crawl-in-site-audit-using-different-modes>
- [SETTINGS] How should I configure my Site Audit Settings? (page dated 2025-10-31) —
  <https://help.ahrefs.com/en/articles/9082329-how-should-i-configure-my-site-audit-settings>
- [AVOID] How to avoid crawling specific pages in Site Audit —
  <https://help.ahrefs.com/en/articles/1399389-how-to-avoid-crawling-specific-pages-in-site-audit>
- [SITEMAP] How to set Site Audit to crawl only pages within a sitemap —
  <https://help.ahrefs.com/en/articles/5372833-how-to-set-site-audit-to-crawl-only-pages-within-a-sitemap>
- [FILTERS] How to use Site Audit filters in Page Explorer and Link Explorer —
  <https://help.ahrefs.com/en/articles/1399529-how-to-exclude-specific-pages-from-site-audit-reports>
- [NOTONSITE] Site Audit is reporting pages that are not on my site. Why is this? —
  <https://help.ahrefs.com/en/articles/2595459-site-audit-is-reporting-pages-that-are-not-on-my-site-why-is-this>
- [4XX] What does '4xx page' error mean in Site Audit? —
  <https://help.ahrefs.com/en/articles/2445803-what-does-4xx-page-error-mean-in-site-audit>
- [3XX] "3xx redirect" warning in Site Audit —
  <https://help.ahrefs.com/en/articles/2754202-3xx-redirect-warning-in-site-audit>
- [BROKENLINKS] "Page has links to broken page" error in Site Audit —
  <https://help.ahrefs.com/en/articles/2721106-page-has-links-to-broken-page-error-in-site-audit>
- [NOINDEX] What does the 'Noindex page' warning in Site Audit mean? —
  <https://help.ahrefs.com/en/articles/2429909-what-does-the-noindex-page-warning-in-site-audit-mean>
- [ROBOTS] Ahrefs Bots (AhrefsBot / AhrefsSiteAudit and robots.txt) — <https://ahrefs.com/robot>
- [ADDPROJ] How to add a project in your Dashboard —
  <https://help.ahrefs.com/en/articles/1433362-how-to-add-a-project-in-your-dashboard>
- [SA-PAGE] Site Audit product page — <https://ahrefs.com/site-audit>
- [FREE-HELP] What can I use for free in Ahrefs? —
  <https://help.ahrefs.com/en/articles/13002606-what-can-i-use-for-free-in-ahrefs>
- [AWT-PAGE] Ahrefs Webmaster Tools / Ahrefs Free plan page —
  <https://ahrefs.com/webmaster-tools> and <https://ahrefs.com/free>
- [AWT-BLOG] A Free Website Crawler from Ahrefs (Nick Churick, 2024-09-04) —
  <https://ahrefs.com/blog/awt-website-crawler/>
- [STARTER] About Ahrefs' Starter plan —
  <https://help.ahrefs.com/en/articles/9419051-about-ahrefs-starter-plan>
- [PLANS] What's the difference between all Ahrefs subscription plans? —
  <https://help.ahrefs.com/en/articles/6117209-what-s-the-difference-between-all-ahrefs-subscription-plans>
- [PRICING] Plans & Pricing — <https://ahrefs.com/pricing>
- [PRICING-BLOG] How To Choose the Right Ahrefs Plan (Constance Tan, 2026-03-09) —
  <https://ahrefs.com/blog/ahrefs-pricing/>
- [HISTORY] Why can't I see my previous crawl reports in Site Audit? —
  <https://help.ahrefs.com/en/articles/4706556-why-can-t-i-see-my-previous-crawl-reports-in-site-audit>
- [EXPORT] How to export Site Audit report? —
  <https://help.ahrefs.com/en/articles/2646667-how-to-export-site-audit-report>
- [LOOKER] How can I use Ahrefs with Looker Studio? —
  <https://help.ahrefs.com/en/articles/9229306-how-can-i-use-ahrefs-with-looker-studio>
- [ALWAYSON] How Always-on audit works —
  <https://help.ahrefs.com/en/articles/10957674-how-always-on-audit-works>
- [SEOSCORE] What Is an SEO Score & How Do You Check Yours (Jenny Abouobaia, 2023-08-07) —
  <https://ahrefs.com/blog/seo-score/>
- Repo issue #2308 "Downgrade Ahrefs to Free, by 2026-10-03" (source of the 2026-10-10 date) —
  <https://github.com/Selftend/selftend/issues/2308>

# Search standings baseline for selftend.org — 2026-09-15

**Status:** a never-edited baseline. Read once, between about 18:20 and 18:55 Europe/Sofia (EEST, UTC+3) on 2026-09-15, against production v0.19.0. A later reading is a new file; this one is not amended. Ticket: [#2423](https://github.com/Selftend/selftend/issues/2423) on the search-operations map [#2419](https://github.com/Selftend/selftend/issues/2419).

**What this is.** The read-only standings baseline the 2026-09-10 ruling ([#2289](https://github.com/Selftend/selftend/issues/2289)) asked for: Search Console's performance figures, Ahrefs' view of the domain, the twenty demand seeds re-read on the paid Ahrefs tier before it lapses on 2026-10-10, and what Bing shows signed out. Numbers only. No keyword was chosen for anything and nothing on the site changed. Search Console impressions and clicks are a standing-surface reading, never an arrival and never a channel judgement (`docs/marketing-plan.md` § 3).

**What this is not.** The brand-query SERP and the Search Console coverage / page-indexing read are on the twin map's baseline, taken the same day: [`docs/research/2026-09-15-brand-result-baseline.md` on `research/brand-result-baseline`](https://github.com/Selftend/selftend/blob/research/brand-result-baseline/docs/research/2026-09-15-brand-result-baseline.md) ([#2402](https://github.com/Selftend/selftend/issues/2402)). Bing Webmaster Tools was not touched (owner step on [#2297](https://github.com/Selftend/selftend/issues/2297)).

**Instruments and their clocks.** Search Console (domain property `sc-domain:selftend.org`, signed in as the owner, UI "Last update: 5.5–6 hours ago", data through 13 Sep 2026). Ahrefs Starter (workspace of the owner; Site Explorer index dated 15 Sep 2026; Keywords Explorer volumes are Ahrefs' monthly estimates, updated per keyword on the dates shown). Bing web search, signed out. Ahrefs reads Ahrefs' index of the web, not Google's; Search Console reads Google's side.

---

## 1. Search Console — Performance, Search type: Web

### 1.1 Last 28 days (17 Aug – 13 Sep 2026)

| Metric | Value |
| --- | --- |
| Total clicks | 1 |
| Total impressions | 22 |
| Average CTR | 4.5% |
| Average position | 15.5 |

**Queries (complete list, 1 row):**

| Query | Clicks | Impressions | CTR | Position |
| --- | --- | --- | --- | --- |
| selfevents | 0 | 1 | 0% | 51.0 |

The one query row is not a brand query. Every other impression falls under Google's anonymisation threshold and has no query row (a new row is a threshold crossing, not a first search — [#2422](https://github.com/Selftend/selftend/issues/2422)).

**Pages (complete, 2 rows):**

| Page | Clicks | Impressions | CTR | Position |
| --- | --- | --- | --- | --- |
| https://selftend.org/ | 1 | 22 | 4.5% | 15.5 |
| https://selftend.org/sign-up | 0 | 1 | 0% | 2.0 |

Page rows sum to 23 impressions against a property total of 22: an impression that shows two of the site's URLs counts once for the property. `/sign-up` answers 404 since v0.19.0 (2026-09-11) and leaves the index by status.

**Countries (complete, 12 rows):**

| Country | Clicks | Impressions | CTR | Position |
| --- | --- | --- | --- | --- |
| Bulgaria | 1 | 3 | 33.3% | 1.7 |
| United States | 0 | 5 | 0% | 2.2 |
| Chad | 0 | 3 | 0% | 1.0 |
| Mexico | 0 | 3 | 0% | 23.0 |
| Australia | 0 | 1 | 0% | 1.0 |
| Finland | 0 | 1 | 0% | 3.0 |
| Saudi Arabia | 0 | 1 | 0% | 4.0 |
| Brazil | 0 | 1 | 0% | 6.0 |
| Bangladesh | 0 | 1 | 0% | 51.0 |
| Vietnam | 0 | 1 | 0% | 51.0 |
| Algeria | 0 | 1 | 0% | 57.0 |
| Russia | 0 | 1 | 0% | 79.0 |

**Devices (complete, 2 rows):**

| Device | Clicks | Impressions | CTR | Position |
| --- | --- | --- | --- | --- |
| Mobile | 1 | 8 | 12.5% | 1.9 |
| Desktop | 0 | 14 | 0% | 23.2 |

### 1.2 Last 16 months (= the property's whole life: first data point 27 Jul 2026; verified 2026-07-28)

| Metric | Value |
| --- | --- |
| Total clicks | 2 |
| Total impressions | 24 |
| Average CTR | 8.3% |
| Average position | 14.3 |

**Queries (complete, 1 row):** identical to the 28-day list — `selfevents`, 0 clicks, 1 impression, position 51.0.

**Pages (complete, 3 rows):**

| Page | Clicks | Impressions | CTR | Position |
| --- | --- | --- | --- | --- |
| https://selftend.org/ | 1 | 22 | 4.5% | 15.5 |
| https://www.selftend.org/ | 1 | 2 | 50% | 1.5 |
| https://selftend.org/sign-up | 0 | 2 | 0% | 3.5 |

The `www` row predates the zone-level redirect to the apex (live since v0.19.0, 2026-09-11); it is the second click of the property's life.

**Countries (complete, 12 rows):** as the 28-day table except Bulgaria 2 clicks / 4 impressions / 50% / 1.5 and United States 0 / 6 / 0% / 2.2; the other ten rows are unchanged.

**Devices (complete, 2 rows):**

| Device | Clicks | Impressions | CTR | Position |
| --- | --- | --- | --- | --- |
| Desktop | 1 | 16 | 6.2% | 20.5 |
| Mobile | 1 | 8 | 12.5% | 1.9 |

---

## 2. Ahrefs Site Explorer — target `selftend.org`, mode Subdomains, http + https, index of 15 Sep 2026

### 2.1 Overview

| Metric | Value | Note |
| --- | --- | --- |
| Domain Rating (DR) | 0 | |
| URL Rating (UR) | 0 | |
| Ahrefs Rank (AR) | 134,588,680 | a second unlabeled figure, 41,003,433, sat beside it (the "Changes: last month" column) |
| Backlinks | 630 | −54 in the last month; all time 893 |
| Referring domains | 429 | −42 in the last month; all time 603 |
| Organic keywords | 0 | top 3: 0 |
| Organic traffic | 0 | value N/A |
| Paid keywords / ads / paid traffic | 0 / 0 / 0 | |
| AI responses (AI Mode, ChatGPT, Gemini, Perplexity, Copilot, Grok) | 0 on every platform, 0 pages | Ahrefs' "AI responses" panel |
| Crawled pages | 10 | all 200 OK; 0 redirects, 0 errors |
| Referring domains, followed / not followed | 45 (10.5%) / 384 (89.5%) | |
| Backlinks, followed / nofollow / UGC / sponsored | 48 (7.6%) / 582 (92.4%) / 0 / 0 | |
| Backlinks by UR of linking page | all 630 from pages with UR < 10 | |
| Referring domains by DR bucket | every bucket from 10–19 to 90–100 shows 0 in the overview histogram | the report below sorts by the linking domain's DR and does show DR 40–68 domains — the histogram counts live links weighted differently; recorded as read |
| Traffic by location | "Your target doesn't get traffic from any location" | |
| Top organic competitors / top entities | none | |

Charting on 2026-09-15 (morning) read 629 backlinks / 428 referring domains; the index moved by one of each during the day.

### 2.2 Organic keywords report

`Organic keywords`, all locations, monthly volume, 15 Sep 2026 vs 15 Aug 2026: **0 keywords, "No results found."** The position-distribution chart (1–3, 4–10, 11–20, 21–50, 51+) is flat at zero for the whole last month (18 Aug – 15 Sep). The site ranks for none of the twenty seeds below, or for anything else, in Ahrefs' index.

### 2.3 Referring domains, sorted by DR descending (report "Referring domains", history: all, 589 domains including lost; live count is the 429 above)

Columns as Ahrefs shows them: DR · dofollow ref. domains of the linking domain · its dofollow linked domains · its traffic · its keywords · links to target · first seen (· lost).

| # | Domain | Spam flag | Status | DR | Links to target | First seen | Lost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | fiverr-seo-for-small-businesses.site | SPAM | | 68 | 1 | 5 May 2026 | |
| 2 | seogrow.agency | SPAM | | 67 | 1 | 8 Jul 2026 | |
| 3 | itxoft-cost-effective-seo-services.site | SPAM | Lost | 66 | 1 | 8 May 2026 | 30 Aug 2026 |
| 4 | rankgrowth.agency | SPAM | Lost | 66 | 1 | 8 Jun 2026 | 1 Sep 2026 |
| 5 | rankio.agency | SPAM | | 58 | 1 | 8 Jun 2026 | |
| 6 | backlinksplace.site | SPAM | Lost | 56 | 2 | 31 Jul 2026 | 2 Sep 2026 |
| 7 | backlinkshop.site | SPAM | | 56 | 2 | 2 Aug 2026 | |
| 8 | linkrankpro.shop | SPAM | Lost | 54 | 1 | 10 May 2026 | 24 Aug 2026 |
| 9 | rankxlinks.shop | SPAM | Lost | 54 | 1 | 7 May 2026 | 29 Aug 2026 |
| 10 | ranklinkerpro.shop | SPAM | | 54 | 2 | 6 May 2026 | |
| 11 | seorankflow.shop | SPAM | | 54 | 2 | 7 May 2026 | |
| 12 | buyseobacklinks.shop | SPAM | Lost | 54 | 1 | 7 May 2026 | 30 Aug 2026 |
| 13 | rankboostly.shop | SPAM | | 54 | 1 | 6 Aug 2026 | |
| 14 | authoritybacklinks.shop | SPAM | Lost | 53 | 1 | 8 May 2026 | 12 Sep 2026 |
| 15 | pbnseolinks.shop | SPAM | Lost | 53 | 1 | 7 May 2026 | 10 Sep 2026 |
| 16 | ranklinkx.shop | SPAM | Lost | 52 | 1 | 8 May 2026 | 30 Aug 2026 |
| 17 | linkrankboost.shop | SPAM | Lost | 52 | 1 | 14 May 2026 | 5 Sep 2026 |
| 18 | ranklinkpro.shop | SPAM | Lost | 52 | 1 | 11 May 2026 | 2 Sep 2026 |
| 19 | linkseopro.shop | SPAM | Lost | 52 | 1 | 10 May 2026 | 31 Aug 2026 |
| 20 | seolinkpro.shop | SPAM | | 52 | 1 | 10 May 2026 | |

Beyond the top 20: the first domain **without** a spam flag is **appagg.com** at rank 25 (DR 50, an app-listing aggregator: 4,612 dofollow ref. domains, 3,434 traffic, 428 keywords, 1 link, first seen 26 Aug 2026, marked New). Every other domain in the first hundred is an SEO-seller site (`.shop`, `.store`, `.site`, `.agency`), almost all spam-tagged, DR 43–68, first seen May–July 2026, many already lost. None of it is anything the project did; a disavow is out of scope on the map.

---

## 3. Demand seeds — Ahrefs Keywords Explorer, Starter tier, 15 Sep 2026

The exact seed lists are the ones searched on 2026-09-10 (recovered from Keywords Explorer's History tab, entries of 10 September 12:07–12:11 PM). Credits: **7 of 200 used before, 12 of 200 after; 5 credits spent**, resetting 10 October (one of the five was wasted on a malformed Overview URL that read the whole comma list as a single keyword; the four reads below cost one each). Volumes are Ahrefs' monthly estimates for Google in the stated country.

Column legend (Ahrefs' Overview list): **KD** keyword difficulty 0–100 · **SV** monthly search volume in the country · **GSV** global volume · **TP** traffic potential of the top-ranking page · **GTP** global traffic potential · **CPC** cost per click · **CPS** clicks per search · **Parent topic** · **SF** number of SERP features · **Updated** when Ahrefs last refreshed the SERP.

### 3.1 Bulgarian, Google · Bulgaria — list total SV 870 / GSV 1.7K (2026-09-10: 930)

| Seed | KD | SV | GSV | TP | GTP | CPC | CPS | Parent topic | SF | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| когнитивно поведенческа терапия | 10 | 400 | 450 | 400 | 400 | $0.05 | 1.39 | когнитивно поведенческа терапия | 2 | 28 Aug |
| дихателни упражнения | 0 | 400 | 450 | 150 | 150 | $0.20 | 0.40 | упражнение за дишане в google | 3 | 7 Jul |
| когнитивни изкривявания | N/A | 50 | 60 | N/A | N/A | N/A | 1.42 | — | — | — |
| как да се справя с тревожността | N/A | 20 | 20 | N/A | N/A | $0.07 | N/A | — | — | — |
| кпт упражнения | N/A | 0–10 | 700 | N/A | N/A | N/A | N/A | — | — | — |
| приложение за медитация | N/A | 0–10 | 0–10 | N/A | N/A | N/A | N/A | — | — | — |
| дневник на мислите | not indexed in Ahrefs' database | | | | | | | | | |
| приложение за тревожност | not indexed in Ahrefs' database | | | | | | | | | |
| самопомощ приложение | not indexed in Ahrefs' database | | | | | | | | | |
| тревожност упражнения | not indexed in Ahrefs' database | | | | | | | | | |

Against 2026-09-10: когнитивно поведенческа терапия 450 → 400; когнитивни изкривявания 60 → 50; the same four seeds still not indexed; кпт упражнения and приложение за медитация now show 0–10 (they were not listed with a number on 10 Sep). Still no app-shaped Bulgarian query with a volume.

**Single seed `тревожност`, Matching terms, Google · Bulgaria: 550 keywords, SV 5.0K, GSV 5.2K** (2026-09-10: 547 / ~5.3K). The seed itself: KD 0, SV 450, parent topic `тревожност`, updated 8 Aug. Top terms by volume remain medication and symptom intent: `хапчета` 1.1K, `стрес` 1.0K, `лекарства` 460, `мнения` 420, `симптоми` 330, `лечение` 320, `рецепта` 270, `тест` 230. The coping facet: `справяне` 30, `преодоляване` 50 (`преодоляване на тревожност` KD 0, SV 50). Highest single terms: `хапчета за тревожност и стрес мнения` 400, `хапчета за тревожност и стрес` 300, `лекарства за тревожност без рецепта` 250.

### 3.2 English, Google · United Kingdom — list total SV 3.5K / GSV 73K (2026-09-10: 3.7K)

| Seed | KD | SV | GSV | TP | GTP | CPC | CPS | Parent topic | SF | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cognitive distortions | 26 | 1.7K | 50K | 900 | 39K | $0.05 | 0.72 | cognitive distortions | 5 | 7 days ago |
| grounding exercises | 49 | 500 | 13K | 1.5K | 18K | $0.20 | 0.86 | grounding techniques | 5 | 23 Aug |
| cbt exercises | 63 | 500 | 5.1K | 3.5K | 11K | $0.80 | 1.10 | cbt self help | 4 | 3 Sep |
| cbt self help | 61 | 250 | 400 | 4.1K | 17K | $0.80 | 0.86 | cbt online | 1 | 3 Aug |
| thought record | 7 | 200 | 3.0K | 400 | 2.3K | $0.10 | 0.84 | thought record | 4 | 28 Aug |
| cbt app | 15 | 150 | 900 | 80 | 80 | $1.40 | 0.64 | free cbt app | 3 | 13 Aug |
| free cbt app | 22 | 70 | 200 | 90 | 90 | $1.20 | N/A | cbt app | 3 | a day ago |
| anxiety app | 24 | 50 | 400 | 2.6K | 16K | $1.40 | 0.60 | best apps for mental health | 3 | 3 Aug |
| mental health tools | 22 | 40 | 500 | 30 | 50 | $0.45 | N/A | wellbeing tools | 3 | 2 days ago |
| thought record template | N/A | 10 | 100 | N/A | N/A | N/A | N/A | — | — | — |

### 3.3 English, Google · United States — list total SV 46K / GSV 73K (2026-09-10: 47K)

| Seed | KD | SV | GSV | TP | GTP | CPC | CPS | Parent topic | SF | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cognitive distortions | 34 | 36K | 50K | 31K | 34K | $0.20 | 0.85 | cognitive distortions | 5 | 6 days ago |
| grounding exercises | 18 | 6.1K | 13K | 9.7K | 16K | $0.35 | 0.91 | grounding techniques | 4 | 7 days ago |
| cbt exercises | 50 | 1.9K | 5.1K | 4.6K | 11K | $0.25 | 1.32 | cbt techniques | 4 | 3 Sep |
| thought record | 0 | 1.5K | 3.0K | 1.4K | 1.9K | $0.70 | 1.26 | cbt thought record | 5 | 4 Sep |
| cbt app | 30 | 500 | 900 | 40 | 450 | $1.70 | 0.85 | clarity cbt app | 3 | 3 Sep |
| mental health tools | 55 | 250 | 500 | 450 | 450 | $0.20 | N/A | mental health screening tools | 4 | 28 Jul |
| anxiety app | 31 | 200 | 400 | 100 | 100 | $1.50 | 0.64 | anxiety app | 4 | 8 Aug |
| free cbt app | 12 | 100 | 200 | 150 | 200 | $1.30 | N/A | free cbt app | 4 | 30 Jul |
| cbt self help | 42 | 80 | 400 | 8.5K | 16K | $1.10 | 1.00 | cognitive behavioral therapy | 4 | 30 Jul |
| thought record template | 14 | 50 | 100 | 2.1K | 2.9K | N/A | N/A | cbt thought record | 2 | 19 Jul |

`cbt app` in the US still has the comparator brand as its parent topic (`clarity cbt app`), as on 2026-09-10.

### 3.4 Does the site rank for any seed?

No. Ahrefs' organic-keywords report for `selftend.org` is empty in every location (§ 2.2), which covers all twenty seeds and their matching terms. Keyword-level SERP reads were not bought for this: the zero is already settled by the site-level report.

---

## 4. Bing, signed out — plain query `selftend`, bing.com, interface language `en`, Sofia IP, about 18:50

"About 4,590 results." First page, in order:

1. **selftend.org** — title still the pre-release "Selftend", snippet "Selftend ... Selftend" (Bing has not recrawled since v0.19.0; unchanged from #2402's read earlier the same day).
2. **www.selftend.com** — a parked domain, not the project's.
3. YouTube channel @Selftend (snippet carries the current positioning line).
4. App Store listing "Selftend App" (snippet carries the store description).
5. APKPure, 6. AlternativeTo, 7. a YouTube video, 8. apppage.net, 9. r/Selftend on Reddit, 10. the GitHub issues page.

Of the eight sitemap routes, **only `/` appears**; none of `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/security`, `/account-deletion`. No sitelinks, no entity card. Google Play did not appear on the first page.

---

## 5. Not taken here, and where it lives

- Brand-query SERP (Google, signed out and in), Search Console page-indexing and URL Inspection state, `site:` results: [#2402's file](https://github.com/Selftend/selftend/blob/research/brand-result-baseline/docs/research/2026-09-15-brand-result-baseline.md).
- Site Audit health and issue census: [#2420](https://github.com/Selftend/selftend/issues/2420) (`docs/research/2026-09-15-site-audit-census.md` on `research/site-audit-census`).
- Bing Webmaster Tools: not signed in, not imported; owner step on #2297.

## 6. Traps for the next reader

- A Keywords Explorer **Overview URL with a comma list in `keyword=` reads the whole string as ONE keyword** ("No data"), and it charges a credit. A list is only a list through the search box (or a saved list URL `/keywords-explorer/list/new/<id>/google/<cc>/overview`, whose country segment can be swapped for one credit).
- The Chrome extension's `type` action **drops spaces and commas from Cyrillic text** in that textarea; the value had to be set through the native value setter plus an `input` event.
- The Keywords Explorer landing page's country selector opened on United Kingdom regardless of the last run; the list page shows the list's own country. The dropdown has a search field — type the country name, then click the row.
- `/site-explorer/overview/v2/subdomains/live?target=` 404s; `/site-explorer/overview?target=selftend.org&mode=subdomains` works and expands itself. The referring-domains report (`/site-explorer/refdomains?…&history=all`) lists lost domains too (589 rows against 429 live).
- Search Console reads: `document.body.innerText` through the JavaScript tool; `&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION` turns on all four columns, `&breakdown=page|query|country|device`, `&num_of_months=16`. A `ref` click on "Next page" does nothing; a JavaScript `.click()` on the button with that `aria-label` paginates. Page and country rows sum above the property total by design.
- Site Explorer reports did not consume credits; Keywords Explorer reports did (one per list per country).

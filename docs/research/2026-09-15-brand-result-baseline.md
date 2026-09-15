# Brand result baseline - what a search for Selftend shows, and what Search Console says, on 2026-09-15

Baseline for [Measure what a search for Selftend shows today, and what Search Console now says](https://github.com/Selftend/selftend/issues/2402), under map [The brand search result - what selftend.org can truthfully make a search for Selftend show](https://github.com/Selftend/selftend/issues/2398).

**Taken once on 2026-09-15 between 15:35 and 15:55 Europe/Sofia (12:35-12:55 UTC) and never edited afterwards.** The prior baseline is [`2026-09-09-indexability-baseline.md` on `research/indexability-baseline`](https://github.com/Selftend/selftend/blob/research/indexability-baseline/docs/research/2026-09-09-indexability-baseline.md); differences from it are called out inline and collected in section 8.

**Production at the time of reading:** v0.19.0 (released 2026-09-10) - the static export with one head per route. Section 6 records what it serves; everything Google and Bing show above is read against that.

**Every search reading records its reader**, because the charting screenshot's AI Overview rendered in Bulgarian and that turned out to be a fact about the reader, not the site:

| Reader                | Instrument                                                                                                                | Sign-in state | Locale signals                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Signed out**        | Playwright Chromium, fresh profile, no cookies, `hl=en` on Google, `setlang=en` on Bing                                   | signed out    | IP geolocated to Sofia, Bulgaria (Google footer: "Bulgaria - 1360, Sofia - From your IP address"); Google's `<html lang>` came back `en-BG` |
| **Signed in (owner)** | The owner's Chrome, Google account signed in, `hl=en`                                                                     | signed in     | same IP; `<html lang>` `en-BG`; the AI Overview rendered in Bulgarian                                                                       |
| Search Console        | domain property `sc-domain:selftend.org`, the owner's Chrome                                                              | -             | UI in English, dates `dd/mm/yyyy`                                                                                                           |
| Crawler view          | `curl -L` with a Googlebot user agent against `https://selftend.org`, plus the Rich Results Test and validator.schema.org | -             | -                                                                                                                                           |

## 1. The `selftend` query on Google

### 1.1 Signed out

Google put its consent dialog over the page ("Before you continue to Google"); the results rendered behind it and were read from the DOM. "Reject all" was clicked; the dialog stayed in the DOM but did not change the results.

Results, in order, with the title and snippet Google composed:

| #   | Result                                                                                | Title Google shows                                                                                          | Snippet Google shows                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `https://selftend.org` (site name shown as the bare domain `selftend.org`)            | **Selftend - private mental health tools** (the new title)                                                  | "Selftend is a set of mental health tools for when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders." - **landing-page body text, not the meta description** |
| -   | AI Overview slot                                                                      | "Thinking" for ~16 s, then **"Can't generate an AI overview right now. Try again later."**                  | no sources, no links card                                                                                                                                                                                              |
| 2   | Google Play, `?hl=bg` (heading "Резултати от мрежата", offered "Translate this page") | Selftend – Приложения в Google Play                                                                         | Bulgarian store description                                                                                                                                                                                            |
| 3   | App Store (`apps.apple.com › app › selftend`)                                         | Selftend - App Store                                                                                        | "Aug 19, 2026 — Free and open source. Journalling, CBT thought records, mood and sleep tracking, breathing and grounding - the tools are yours to pick from, ..."                                                      |
| 4   | YouTube channel `@Selftend`, "3 followers"                                            | Selftend                                                                                                    | the channel description (the frame sentence)                                                                                                                                                                           |
| 5   | YouTube video, "3 views · 3 weeks ago", 0:36                                          | Selftend — The quiet minute                                                                                 | the video description                                                                                                                                                                                                  |
| 6   | Reddit r/RimWorld, "40+ comments · 4 years ago"                                       | So I just found out that self tend is a BOX THAT NEEDS TO ...                                               | **unrelated** - the game mechanic "self tend"                                                                                                                                                                          |
| -   | Images module (3)                                                                     | "The quiet minute" thumbnail (YouTube), the Play listing icon, "Steam Workshop::Auto Self-Tend" (unrelated) | -                                                                                                                                                                                                                      |
| 7   | AlternativeTo (`alternativeto.net › Sport & Health`)                                  | Selftend - CBT and ACT exercises plus everyday                                                              | "Selftend is a free, open-source, non-profit self-help app. It offers guided CBT and ACT exercises (thought records, worry journal, graded exposure, defusion, ..."                                                    |
| 8   | APKPure (`apkpure.com › Apps › Health & Fitness`)                                     | Selftend APK for Android Download                                                                           | "Selftend is a free, open-source wellness app for guided self-help and everyday reflection. It gathers a small set of calm, private tools in one place — no ..."                                                       |

Modules present: Web results, the AI Overview slot (failed), Images, a second Web results block, pagination to page 10. **Not present:** sitelinks under result 1 (no deep links of any kind), a knowledge panel (no `#rhs` element in the DOM), a "People also ask" block, a video carousel.

### 1.2 Signed in, the owner's Chrome

Same nine organic results in the same order (AI Mode reply, selftend.org, Google Play, App Store `/us/`, YouTube channel, YouTube video, Reddit RimWorld, AlternativeTo, APKPure). Differences from the signed-out read:

- **The AI Overview rendered, in Bulgarian**, with an expandable "Show more". Its text, translated: _Selftend is a set of free, private, open-source mental health and personal-reflection tools, **created by Vasil Yoshev**._ Then "Main features": journaling, gratitude notes, CBT thought records, mood/sleep/activity tracking, breathing and meditation exercises; "Privacy": data encrypted, no ads, trackers or analytics modules; "Availability": Google Play and the App Store; "Important": _the app is not a substitute for therapy, medical diagnosis or emergency help in a crisis._ It ends with an offer to help with CBT exercises, mood tracking, or **finding crisis contacts in Bulgaria**.
- **Sources, as the DOM labels them:** two clusters - `Google Play (+2) – Selftend – Приложения в Google Play` and `selftend.org (+2) – Selftend - private mental health tools` - in that order in the text (Play cited after the first sentence, the site after the feature list). ⚠️ The charting read of 2026-09-15 morning ([#2400](https://github.com/Selftend/selftend/issues/2400)) saw the site cited **first**; the order is per generation, not stable.
- The right-hand card is present and is the AI Overview's own **`aria-label="Related links"`** card, not a knowledge panel: `#rhs` is absent here too.
- The owner's Play link resolved to the default locale; the signed-out read got `?hl=bg` with "Translate this page".

☠️ **A SERP reading is not reproducible without the reader row above.** The signed-out context could not produce the overview at all; the signed-in one produced it in the account's language and cited the sources in a different order from the morning.

## 2. The `site:selftend.org` query on Google (signed out)

Two results - **unchanged from 2026-09-09**, with new snippets:

| Result                           | Title                                  | Snippet                                                                                                                                                                                                   |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://selftend.org`           | Selftend - private mental health tools | "A set of free, private mental health tools: everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want ..." - **the meta description**, truncated |
| `https://selftend.org › sign-up` | Selftend                               | "Already have an account? Sign in. Your entries stay private to your account - encrypted in transit and on our servers. How we protect your data." - the pre-release rendered copy                        |

So the homepage snippet is the description on `site:` and body text on the brand query; Google picks per query. `/sign-up` **answers 404 today** (section 6) and is still in the index - it has not been recrawled since 23 July per the 9 September baseline. None of `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/security`, `/account-deletion` appears.

## 3. Bing (signed out, `setlang=en`)

Bing served a bot-detection page to `curl`; this is the browser read.

`selftend` - "5,920 results", ten on the page, in order:

| #   | Result                     | Title Bing shows                                                        | Snippet Bing shows                                                                                                                            |
| --- | -------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `https://selftend.org`     | **Selftend** (the **pre-release** title)                                | **"Selftend ... Selftend"** - no description at all                                                                                           |
| 2   | `https://www.selftend.com` | www.selftend.com                                                        | "www.selftend.com" - **a parked domain that is not ours**: 114 bytes of HTML whose only content is a script redirect to `/lander`             |
| 3   | YouTube `@Selftend`        | Selftend - YouTube                                                      | the frame sentence                                                                                                                            |
| 4   | App Store `/gb/`           | ‎Selftend App - App Store                                               | "Selftend is a calm, free set of guided self-help tools for personal reflection. It is not a therapist and not a diagnosis engine. It is a …" |
| 5   | GitHub `Selftend/selftend` | GitHub - Selftend/selftend                                              | "Selftend is being built around private guided self-help tools. The current working slice is a Gillihan-based CBT toolkit with goals, …"      |
| 6   | APKPure                    | Selftend APK for Android Download - APKPure.com                         | as on Google                                                                                                                                  |
| 7   | AlternativeTo `/about/`    | Selftend: Free, open-source guided self-help: CBT and ACT exercises ... | "Aug 20, 2026 · Selftend is a free, open-source, non-profit self-help app. ..."                                                               |
| 8   | GitHub `README.md`         | selftend/README.md at main · Selftend/selftend · GitHub                 | as 5                                                                                                                                          |
| 9   | YouTube video              | Routines — Selftend walkthrough - YouTube                               | "Building an evening routine in Selftend from tools you already use, running it step by step, and editing it later."                          |
| 10  | apppage.net                | Selftend Android App                                                    | as APKPure                                                                                                                                    |

No sitelinks under result 1, no entity card, no answer box (`.b_ans` count 0). **Bing's copy of the homepage predates v0.19.0** - the title is the old single-word one and the snippet is empty - so Bing has not recrawled since 2026-09-10.

`selftend.org` (the plain-domain query the 2026-09-09 baseline recommends over `site:` on Bing) - "6,380 results", six on the page: the same #1 and #2, then YouTube, AlternativeTo, App Store, GitHub.

## 4. Search Console

### 4.1 Page indexing

- **Pages report** ("All known pages"): **Last update 04/09/2026** - six days before the release, so the report has not yet caught up. Indexed **2**, not indexed **3** ("Duplicate without user-selected canonical" 2, "Page with redirect" 1) - byte-identical to 2026-09-09.
- **Sitemaps:** `https://selftend.org/sitemap.xml` - Type Sitemap, **Submitted 11 Sept 2026, Last read 14 Sept 2026, Status Success, Discovered pages 8, Discovered videos 0.** ("Couldn't fetch" on submission day has cleared.)
- **Pages report filtered to the sitemap** (`&sitemap=`): **"Processing data, please check again in a day or so"** - both the summary and the reasons table. Per-URL coverage for the eight is not computed yet.
- **URL Inspection** (the console's own index, not a live test):

| URL                                     | Verdict                                                           | Discovery                                    | Referring page                                     | Last crawl                                                                                          | Canonical                                                               |
| --------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `https://selftend.org/`                 | **URL is on Google** - Page is indexed                            | Sitemaps: **"Temporary processing error"**   | `https://hosted.weblate.org/projects/selftend/`    | **14 Sept 2026, 07:53:04**, Googlebot smartphone; crawl allowed, fetch successful, indexing allowed | user-declared `https://selftend.org/`; Google-selected: "Inspected URL" |
| `https://selftend.org/faq`              | **URL is not on Google** - **Discovered – currently not indexed** | Sitemaps: `https://selftend.org/sitemap.xml` | `https://github.com/Selftend/selftend/issues/1798` | **N/A** - never crawled                                                                             | N/A                                                                     |
| `https://selftend.org/account-deletion` | **URL is not on Google** - **Discovered – currently not indexed** | Sitemaps: `https://selftend.org/sitemap.xml` | **None detected**                                  | **N/A** - never crawled                                                                             | N/A                                                                     |

So the answer to "8 of 8?" on 2026-09-15 is: **1 of 8 indexed under the new head** (the homepage, recrawled 14 September and now showing the new title), **7 of 8 discovered through the sitemap and not yet crawled**, plus the dead `/sign-up` still held. The orphan is discovered by the sitemap alone; the linked page also has a GitHub issue as its referrer. The "Temporary processing error" on the homepage's sitemap discovery is the same processing lag the filtered report shows.

### 4.2 Performance (Search type: Web; "Last update: 4 hours ago"; data through 12 September)

| Window                                 | Clicks | Impressions | CTR   | Position |
| -------------------------------------- | ------ | ----------- | ----- | -------- |
| Default 3 months, 27 Jul - 12 Sep 2026 | 2      | 24          | 8.3 % | 14.3     |
| Last 7 days, 6 - 12 Sep 2026           | 0      | 3           | 0 %   | **1.7**  |

Against 2026-09-09 (same 3-month frame, then 21 impressions, position 16.1): +3 impressions, all after the release, at position 1.7 - i.e. the brand query. Pages in the 7-day window: `https://selftend.org/` 3 impressions, `https://selftend.org/sign-up` 1. Queries in the 7-day window: **"No data"** - every query anonymised; over 3 months the one visible query is still `selfevents` (0 clicks, 1 impression). A "performance in generative AI features" report is offered from the Performance page ("Open report"); not read.

### 4.3 Links

External links total **10**, all to `https://www.selftend.org/`, all from `reddit.com`, anchor text "https selftend org" and "selftend org". Internal links total **1**, to `https://www.selftend.org/`. **Unchanged from 2026-09-09**; the `www` target is the pre-redirect host.

### 4.4 Overview

"2 total web search clicks"; Indexing "3 not indexed pages, 2 indexed pages"; Core Web Vitals "No data" (mobile and desktop); HTTPS 1 / non-HTTPS 0; Enhancements: "No enhancements yet".

## 5. Structured data as Google parses it

- **Rich Results Test** on `https://selftend.org/`: "Crawled successfully on 15 Sept 2026, 15:39:19" - **"No items detected. No rich results detected in this URL."** Expected: `Organization` and `WebSite` are not rich-result types, and the logo feature is not reported ([#2401](https://github.com/Selftend/selftend/issues/2401) called it inert).
- **validator.schema.org** on the same URL: **1 item** - `WebSite` (name Selftend, url `https://selftend.org/`) with `publisher` resolved through `@id` to the `Organization` (name, url, logo `favicon-512.png`, description = the frame sentence, three `sameAs`). **0 errors, 0 warnings.**
- The `sameAs` served in production is still `https://github.com/vasilyoshev/mental-health`, `https://www.reddit.com/r/Selftend/`, `https://www.youtube.com/@Selftend` - the stale GitHub URL of [#2410](https://github.com/Selftend/selftend/issues/2410), unchanged.

## 6. What the eight pages serve to a crawler

All eight answer **200** with `<html lang="en">`, one `<title>`, one `description`, `og:title` / `og:description` / `og:url` / `og:image` (`favicon-512.png`, 512×512, alt "The Selftend app icon"), `og:type website`, `og:site_name Selftend`, `og:locale en_GB`, `twitter:card summary`, a self-canonical, **no `robots` meta**. The JSON-LD block is on `/` only.

| Route               | `<title>`                              | `description`                                                                                                                                                                                                         | `<h1>`                      |
| ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `/`                 | Selftend - private mental health tools | Selftend is a set of free, private mental health tools: everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want one. Open source, no ads, no subscriptions. | Small tools for heavy days. |
| `/faq`              | Common questions - Selftend            | What Selftend is, what it isn't, and what happens to what you write.                                                                                                                                                  | Common questions            |
| `/crisis`           | Crisis guidance - Selftend             | This app is not emergency support and is not monitored. If you are in danger, contact local emergency services.                                                                                                       | Crisis guidance             |
| `/privacy`          | Privacy policy - Selftend              | How Selftend handles your account, preference, and private CBT record data.                                                                                                                                           | Privacy policy              |
| `/terms`            | Terms of service - Selftend            | Terms of service for Selftend, a set of free, private mental health tools.                                                                                                                                            | Terms of service            |
| `/cookies`          | Cookie policy - Selftend               | How the web version of Selftend uses browser storage.                                                                                                                                                                 | Cookie policy               |
| `/security`         | How we protect your data - Selftend    | Plain-language summary of the technical and procedural safeguards we use to keep your entries private.                                                                                                                | How we protect your data    |
| `/account-deletion` | Account deletion - Selftend            | How to permanently delete your Selftend account and all associated data.                                                                                                                                              | Account deletion            |

Other facts read the same way:

- **Internal links on the landing file:** `/`, `/faq`, `/crisis`, `/privacy`, `/terms`, `/cookies`, `/sign-in`, `/sign-up` - one each. **`/security` and `/account-deletion` are linked from nowhere on the landing**, which section 4.1 confirms from Google's side ("Referring page: None detected").
- Status codes: `/sign-up` **404**, `/sign-in` **404**, `https://www.selftend.org/` **301 → `https://selftend.org/`**, `http://selftend.org/` **301 → https**, `/garbage-path` **404**. `Cache-Control: public, max-age=0, must-revalidate`; the CSP header carries the two script hashes.
- `/sitemap.xml` lists exactly the eight routes above in that order. `/robots.txt` begins with Cloudflare's managed "Content-Signal" block prepended to the repo's file.
- No `<noscript>` text remains on the landing (the 9 September homepage snippet came from one).

## 7. Reproduction notes

- Google's consent dialog appears for a fresh EU profile and the results render behind it; the AI Overview did **not** generate in that context in two attempts ~16 s apart. Read the overview signed in, and record the account language.
- `search-console/inspect?...&id=<url>` returns Google's 404; inspection runs only from the search box, and on a tab where the "Got it" tooltip had focus the typed URL was silently dropped three times. Click the box by position, confirm the text with a zoom, then Enter.
- `get_page_text` was not used; every Search Console value above is `document.body.innerText`.
- Bing needs a browser: `curl` gets a bot page with unrelated help-centre text.

## 8. Against the 2026-09-09 baseline

| Fact                                   | 2026-09-09                                 | 2026-09-15                                                                                                                                    |
| -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Google, brand query #1 title / snippet | "Selftend" / the `<noscript>` text         | the new title / landing body text                                                                                                             |
| Google, `site:` count                  | 2 (`/`, `/sign-up`)                        | **2, the same two**                                                                                                                           |
| Google, indexed under the new head     | 0                                          | **1 of 8** (`/`, crawled 14 Sept); 7 discovered via sitemap, uncrawled                                                                        |
| Sitemap                                | none                                       | submitted 11 Sept, read 14 Sept, Success, 8 discovered                                                                                        |
| Pages report                           | last update 04/09, 2 indexed / 3 not       | **same report, same date** - not refreshed; sitemap-filtered view "Processing data"                                                           |
| Performance, 3 months                  | 2 clicks / 21 impressions / pos 16.1       | 2 / 24 / 14.3; the 3 new impressions at position 1.7 in the release week                                                                      |
| Links                                  | 10 external (reddit → `www`), 1 internal   | unchanged                                                                                                                                     |
| Bing                                   | plain-domain query shows `/` and `/crisis` | `/` at #1 with the **old** title and an empty snippet; `/crisis` gone from the first page; `selftend.com` (parked) at #2                      |
| Sitelinks / knowledge panel            | none / none                                | none / none on both engines, both sign-in states                                                                                              |
| AI Overview                            | not recorded                               | signed out: fails to generate; signed in: Bulgarian, cites Google Play (+2) and selftend.org (+2), names the owner as creator                 |
| Structured data                        | none served                                | `WebSite` + `Organization` parse clean; RRT "no items"; `sameAs` GitHub URL stale ([#2410](https://github.com/Selftend/selftend/issues/2410)) |

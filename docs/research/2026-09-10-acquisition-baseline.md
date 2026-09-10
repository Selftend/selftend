# Acquisition baseline - what Google Play Console and App Store Connect report for Selftend on 2026-09-10

Baseline for [Acquisition baseline: what Play Console and App Store Connect actually show today](https://github.com/Selftend/selftend/issues/2303), under map [Measurement: how Selftend counts visitors and arrivals, and where each number comes from](https://github.com/Selftend/selftend/issues/2301).

**Taken once on 2026-09-10 and never edited afterwards.** Read-only: no setting was changed, no campaign link was created, nothing was submitted. Both consoles were read in the owner's signed-in Chrome.

**Subjects.** Play: `org.vasilyoshev.selftend`, developer account `8742105182018720185`, app `4973063815587523976`, Production, last updated 9 Sept 2026 (v0.18.0). App Store: app `6796318929`, first released **2026-08-18**, current version 0.15.0 released 2026-08-19 (confirmed against the public iTunes lookup API, not just the console).

**The single most useful frame for reading everything below:** the two stores are at completely different ages. Play has six months of history; iOS has **23 days**. Nothing here is comparable across stores, and the units differ too (Play counts _device acquisitions_, Apple counts _first-time downloads_).

## 1. Google Play - Grow users overview

Grow users -> "Your performance on Play", Metrics by: **Device**. The date control offers only three presets: Last 28 days, Last 90 days, Last 6 months. Six months is the widest view this page has.

| Metric                 | Last 28 days           | Last 6 months (13 Mar - 9 Sept 2026) |
| ---------------------- | ---------------------- | ------------------------------------ |
| Device impressions     | 3.27k (+83%)           | 5.13k                                |
| Device acquisitions    | 2 (-75%)               | 49                                   |
| Device first opens     | 1 (-80%)               | 40                                   |
| Monthly active devices | 8 (-67%)               | 8                                    |
| 7-day device retention | - ("Data unavailable") | 3                                    |

Two labels on this page do not mean what they say, and both matter for anyone writing a spec against it:

- The **"Last 28 days"** acquisitions tooltip reads: _"Calculated over the last 13 days of available data (22 Aug - 3 Sept)."_ The control says 28 days; the number covers 13. Play's acquisition data ran ~6 days behind the reading date.
- A promotional banner reads _"+8 explore user acquisitions in the last 90 days"_, and a card reads _"Store listings - Default listing active, Your conversion rate is 46%"_ against a "Last 90 days" chip. Neither number reconciles with the store-listing report in §2, which gives 4.9% and 34% for overlapping windows. **Three different conversion rates are on screen simultaneously.** Do not quote one without naming its surface and window.

### 1.1 Traffic source split - the number the map needed

Expanding the **Acquire** card at Last 6 months breaks the 49 acquisitions down by Traffic source:

| Traffic source      | Device acquisitions (6 months) | Share |
| ------------------- | ------------------------------ | ----- |
| Paid and direct     | 32                             | 65%   |
| Google Play explore | 10                             | 20%   |
| Not attributed      | 7                              | 14%   |
| **Total**           | **49**                         |       |

The three rows sum exactly to the headline 49. **Nothing collapsed into "Other" at this level.** There is **no Google Play search row at all** - store search contributed zero acquisitions over six months.

Selftend runs no ads, so the "Paid and direct" bucket is entirely _direct_: deep links and direct listing URLs. Two thirds of every Android acquisition arrives through a link, and Play cannot currently say which link.

Expanding the **Reach** card the same way:

| Traffic source      | Device impressions (6 months) |
| ------------------- | ----------------------------- |
| Google Play explore | 5.05k                         |
| Paid and direct     | 80                            |
| **Total**           | **5.13k**                     |

There is no "Not attributed" row on impressions. The conversion asymmetry is stark: explore converts 10 of 5,050 impressions (0.2%), direct converts 32 of 80 (40%).

### 1.2 What the Statistics report can and cannot break down

"Dive deeper" from the Acquire card lands on Statistics (`/statistics`), which offers date presets up to **Last 5 years** - far wider than the Grow overview. Its full dimension vocabulary for device acquisitions is:

> Country / region, Android version, Device, Form factor, Language, App version, Operator, Acquisition mechanism, Traffic source, No breakdown.

**No UTM dimension, no campaign dimension, no referrer dimension, no search-term dimension.** If a spec needs campaign-level Play data, this is not the report.

⚠️ **Unresolved discrepancy, recorded rather than resolved.** On the Statistics page the Traffic-source _value_ picker listed exactly one selectable value ("Google Play explore") even with the range set to Last 5 years, and the Change-analysis panel below listed only that same value - contradicting the three values the Grow overview returns for six months. Treat **the Grow overview as authoritative** for the traffic-source split and treat the Statistics value picker as unreliable until someone establishes why it narrows.

### 1.3 The legacy acquisition report is gone

`Grow users -> Store performance -> Store analysis` (`/reporting/acquisition/overview`) still exists but is now an empty shell with two redirect notices:

> "Acquisition and traffic source data can now be found on the Grow overview page."
> "Store listing analysis and performance data can now be found on the Store listings page."

This is the July 2026 reshuffle landing. Any older instruction that points at "Store analysis" for acquisition data is stale.

## 2. Google Play - store listing performance

`Grow users -> Store presence -> Store listings`. Metric selector offers only **Installs | Opens**.

☠️ **"All time" on this report means 10 Jul 2026 - 3 Sept 2026.** It is not the app's lifetime; it is roughly the last eight weeks. Whatever Play's retention rule is for this report, it silently truncates - and it labels the truncation "All time". Its "Last 28 days" resolves to 8 Aug - 3 Sept, again ~6 days behind the reading date.

| Card                                | Last 28 days (8 Aug - 3 Sept) | "All time" (10 Jul - 3 Sept) |
| ----------------------------------- | ----------------------------- | ---------------------------- |
| Reach: Visitors                     | 36 (-10%)                     | 77 (+175%)                   |
| Acquire: Unique user install clicks | 4 (-82%)                      | 26 (+18%)                    |
| Acquire (%): Click-through rate     | 11% (-80%)                    | 34% (-57%)                   |

The Acquire card leads with **"Unique user install clicks"**, not acquisitions - the July 2026 change is visible exactly as expected. The listings table below reports a third pair of figures for the same listing: _Default store listing, last updated 8 Sept 2026, Visitors **41**, Conversion rate **4.9%**, Live_ - a different window again, unlabelled.

### 2.1 Dimensions - this is the report that has UTM

Unlike Statistics, the store-listing report offers a rich dimension list:

> Traffic source, **Search term**, **UTM source**, **UTM campaign**, Store Listing, Language, Country / region, App install state, Custom audience.

All figures below are the "All time" window, 10 Jul - 3 Sept 2026.

**Visitors by Traffic source**

| Traffic source      | Visitors |
| ------------------- | -------- |
| Google Play explore | 57       |
| Ads and referrals   | 20       |
| **Total**           | **77**   |

**Unique user install clicks by Traffic source**

| Traffic source      | Install clicks |
| ------------------- | -------------- |
| Ads and referrals   | 16             |
| Google Play explore | 10             |
| **Total**           | **26**         |

Referral visitors convert at 16/20 = 80%; explore visitors at 10/57 = 18%. Same shape as §1.1: the link traffic is small, warm, and unattributed; the store traffic is large, cold, and named.

**Visitors by UTM source** - one row only:

| UTM source              | Visitors |
| ----------------------- | -------- |
| No UTM source specified | 20       |

That 20 is exactly the Ads-and-referrals bucket. Explore visitors do not appear under the UTM dimension at all, which confirms the dimension is scoped to the referrals bucket. **No tagged UTM source or campaign row exists anywhere**, and this is blank because nothing has ever been tagged - not because a threshold hid it. These 20 visitors are precisely the population a tagging scheme would light up.

**Visitors by Search term** - the one place Google's suppression actually bites:

| Search term      | Visitors | Change |
| ---------------- | -------- | ------ |
| All search terms | 46       | +0%    |
| Other            | 46       | +0%    |

Rows 1-2 of 2. **All 46 search-term visitors are collapsed into "Other" and not one individual query is visible** - 100% collapse, no published threshold. (57 explore visitors minus 46 with a search term leaves 11 who reached the listing by browsing.) Note what this costs: it is ASO information, not attribution information. The collapse does not damage the arrivals question at all.

## 3. App Store Connect - App Analytics

`Analytics` for app 6796318929. The date control's presets are Last 7 Days, Last 30 Days, Last 90 Days, Last Week, Last Month, Year to Date, and **Lifetime**, plus Days / Weeks / Months / Range tabs.

☠️ **"Lifetime" resolves to Aug 18 - Sep 9 2026 - 23 days**, matching the public release date exactly. Every iOS figure below is the app's entire history, and every one of them is a small number for that reason and not because anything is hidden.

Overview, Last 30 days ending 9 September (identical to Lifetime):

| Card                   | Value                           |
| ---------------------- | ------------------------------- |
| Impressions            | 47                              |
| Product Page Views     | 30                              |
| First-Time Downloads   | 15                              |
| Conversion Rate        | 48.4% (daily average)           |
| Redownloads            | "Not Enough Data"               |
| Updates                | "Not Enough Data"               |
| Average Retention      | "Not Enough Data" (Opt-in Only) |
| Crashes by App Version | "Not Enough Data" (Opt-in Only) |

Sidebar state: **Sources** and **Campaigns** are live links; **Product Pages, In-App Events, App Clip** and **Monetization** are greyed out and unreachable.

### 3.1 Source Type breakdown

All three columns are the Lifetime window and were read with the metric switched away from the default (see the trap below).

| Source Type            | Impressions | Product Page Views | First-Time Downloads |
| ---------------------- | ----------- | ------------------ | -------------------- |
| App Referrer           | 21          | 21                 | 12                   |
| App Store Search       | 14          | 1                  | 2                    |
| App Store Browse       | 8           | 4                  | 1                    |
| Web Referrer           | 4           | 4                  | -                    |
| Institutional Purchase | -           | -                  | -                    |
| Unavailable            | -           | -                  | -                    |
| **Total**              | **47**      | **30**             | **15**               |

**Every column sums exactly to its Overview headline.** That settles the ticket's central question for Apple: **nothing is suppressed at Source Type level today, and a "-" means zero, not "hidden".** Apple's documented per-source minimum has not bitten - presumably because the surviving rows are above it and the empty ones are genuinely empty.

☠️ **Trap worth recording.** The Sources page _defaults_ to `App Store: Product Page Views (Unique Devices)`, and that metric is only ever offered as a **DAILY AVERAGE**. On that default every row renders "-" except App Referrer "1". It reads exactly like blanket suppression and is not: it is a daily mean over 30 days rounding below 1. Switching the metric to a countable one (Impressions, Product Page Views, First-Time Downloads) produces the full table above. Anyone taking this baseline again must change the metric before concluding anything is blank.

### 3.2 The Campaigns tab

**It exists, it is reachable, and it is not greyed out** - with a "+" control to create a campaign link. It reads:

> "There isn't enough data to display campaigns."

So the tab is available _before_ any campaign data exists, which corrects the assumption carried into this map that the Campaigns tab only appears once the app has analytics data. No campaign link has ever been created; the "+" was deliberately not used.

## 4. What the two baselines say together

1. **Untagged link traffic is the single largest acquisition channel on both stores.** Play: "Paid and direct" is 32 of 49 six-month acquisitions (65%). Apple: "App Referrer" is 12 of 15 lifetime downloads (80%). Neither console can say which link, which post, or which page produced any of it.
2. **Store search delivers almost nothing.** Play has no search bucket at all over six months. Apple reports 2 of 15 downloads from App Store Search - against 14 impressions, its second-largest impression source, so the listing is being _seen_ in search and not chosen.
3. **iOS Web Referrer converts at zero.** 4 impressions, 4 product page views, **0 first-time downloads**. selftend.org does push iOS traffic at the listing; over 23 days none of it installed. n is far too small to conclude anything, and it is worth re-reading rather than acting on.
4. **Suppression is not the binding constraint today - the absence of tagging is.** The only real collapse found anywhere is Play's Search term dimension (46 of 46 into "Other"), and that withholds ASO information, not attribution. Everything the arrivals question actually needs is either present and untagged (Play UTM: 20 visitors, all "No UTM source specified") or present and complete (Apple's Source Type columns, which reconcile exactly).
5. **Both consoles already carry the machinery a tagging scheme would use, with no SDK and no app change.** Play exposes UTM source and UTM campaign dimensions on the store-listing report; Apple exposes a Campaigns tab with a create control. Neither is populated because nothing has ever been tagged.

## 5. Caveats on this baseline

- Play's numbers lag ~6 days; the "Last 28 days" acquisition figure covers 13 days of data despite its label.
- Play's store-listing "All time" is 10 Jul - 3 Sept 2026, not the app's life. The listing-level figures therefore have a shorter horizon than the Grow-overview figures.
- iOS has 23 days of history in total. Any iOS ratio here rests on n = 15 downloads.
- Three mutually inconsistent Play conversion rates were on screen at once (46%, 34%, 4.9%). Each belongs to a different surface and window; none was reconciled here.
- The Statistics-page traffic-source value picker disagreed with the Grow overview (§1.2) and was left unresolved.

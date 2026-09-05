---
title: What the shelf returns for "mental health tools" today — App Store, Google Play, and the autocomplete proxies
date: 2026-09-05
ticket: "#2005"
map: "#2003"
sources:
  - Apple iTunes Search API — https://itunes.apple.com/search?term=…&entity=software&country={us,gb,bg}&limit=15
  - Apple App Store search hints — https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=… (X-Apple-Store-Front 143441-1,29 for US, 143444-2,29 for GB)
  - Google Play web search — https://play.google.com/store/search?q=…&c=apps&hl=en&gl=US (server-rendered HTML, no browser, no account)
  - Google suggest — https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=…
---

# What the shelf returns for "mental health tools" today

Research for [#2005](https://github.com/Selftend/selftend/issues/2005), part of map [#2003](https://github.com/Selftend/selftend/issues/2003). **Every number in this file was measured on 2026-09-05**, from the four primary endpoints in the frontmatter. It re-measures and widens [#1818](https://github.com/Selftend/selftend/issues/1818)'s 2026-09-04 finding that Apple's `mental health tools` query returns prescribers, using [#1816](https://github.com/Selftend/selftend/issues/1816)'s proxy method.

⚠️ **This document recommends nothing and invents no search-volume number.** None of the four endpoints measures demand; each is a proxy and is labelled as one. The category-noun decision belongs to the map's ticket 1.

## The answer

**The shelf depends on the term, and on the two words around the noun.** On Apple's US and GB storefronts, `mental health app` and `mental health self-help` are **mostly self-help apps** — 8 of the top 10 in the US and GB for `app`, 6–8 of 10 for `self-help`, with 0–2 prescribers. `mental health tools` and `free mental health tools` are **mixed**: in the US, 4 of the top 10 are prescriber / telehealth / professional-support services (Soluna, Cerebral, Brightside, Talkspace; SonderMind and 7 Cups sit at #12–14) and they hold the ratings mass (Talkspace 46,799, Cerebral 32,275) while the self-help occupants are small (Moodfit 2,210; The Mood Tools 21; U of A Mental Health Tools 0). In GB the same split is 2–3 prescriber-type services against 3–4 self-help apps plus 2–3 AI companions. Google Play (US, anonymous) returns **mostly self-help** for every term, with BetterHelp the only telehealth entry — though BetterHelp is **#1** for `free mental health tools`. The Bulgarian storefront has **no prescriber on any term**, and is thin enough that Instagram and WhatsApp rank in the top 6 for `tools`. `private mental health app` is mixed in a third way: on Apple US **5 of the top 10 are AI chat companions**, and on BG the word `private` pulls messaging apps and generic diaries. **The five cluster-3 incumbents sit on the `app` and `self-help` shelves and not on the `tools` shelf**: none of Finch, Clarity, Headspace, Daylio or How We Feel is in any storefront's top 10 for `mental health tools` (Daylio's best is #13, US), and the Apple US top-10 for `mental health tools` and `mental health app` share **exactly one app** (Talkspace); in GB they share **none**.

## Method, and what could not be obtained

| Wanted | Obtainable? | Notes |
| --- | --- | --- |
| Apple `/search` top 15, three storefronts, five terms | **Yes.** 15 of 15 requests returned 13–15 rows. | `resultCount` at `limit=15` is not a density measure (see #1816). Ranks are Apple's returned order. |
| App Store autocomplete (`hints`) | **Yes**, US and GB storefronts. | Apple does not document the ordering; position is suggestive. |
| Google Play search, top 10 with seller | **Yes, without a browser.** The search page is server-rendered: each card carries the app name, developer and package id in DOM order. 8–17 cards per term (first page only). No `Ad`/`Sponsored` markers were present in any page. | Ratings **count** and price are not on the search card, so they are not reported for Play. Play personalises; this is one anonymous view from a client with `hl=en&gl=US`. |
| Google suggest for four prefixes | **Yes.** | The endpoint geolocates by client IP and takes no country parameter; the lists below mix UK (`mental health act 1983`) and US (`mental health america`) completions. |
| Search volume for any term | **No** — unchanged from #1816. | Not attempted again; no number is invented. |

**Classification key**, applied from each listing's own description text (Apple `description` field; Play from the same app's Apple listing where one exists, otherwise from the Play title, marked †):

- **P** — prescriber / telehealth / therapy-matching / professional support service: a licensed human is in the loop.
- **S** — self-help app: no practitioner; the person runs it themselves.
- **AI** — AI chat companion: self-help-shaped, but an AI conversation is the product.
- **M** — mixed: self-care tools plus a therapy or psychiatry booking marketplace in one app.
- **T** — screening / self-test app.
- **O** — peer-support community or clinician-connected monitoring platform.
- **X** — not a mental-health app (messaging, generic diary, life-goals).

## 1. Apple App Store, `/search`, US storefront — 2026-09-05

### `mental health tools` (US)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Soluna: Mental Health Care | Kooth Group Limited | Free | 3,216 | P | free service with professional one-to-one support plus activities and a moderated community |
| 2 | Moodfit: Mental Health Tools | Roble Ridge Software LLC | Free | 2,210 | S | mood tracking, CBT exercises, breathwork; no practitioner |
| 3 | U of A Mental Health Tools | University of Arizona | Free | 0 | S | university skills companion for mood and sleep |
| 4 | Cerebral - Mental Health | Cerebral, Inc | Free | 32,275 | P | network of licensed prescribers and therapists |
| 5 | Mental: AI Therapy & Coaching | Dig Deep, Inc. | Free | 2,770 | AI | AI therapy and coaching product |
| 6 | Brightside Health | Brightside Health, Inc. | Free | 10,532 | P | providers tailor therapy and/or medication |
| 7 | The Mood Tools | 2-4-3 Foundation | Free | 21 | S | free coping-skills app from a foundation |
| 8 | Talkspace: Virtual Therapy App | Groop Internet Platform inc. | Free | 46,799 | P | connects users with licensed therapists; insurance-covered |
| 9 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 9,173 | O | peer-support community, "a Talkspace company" |
| 10 | Sensa - Mental Coach | Mental Health Solutions UAB | Free | 1,088 | S | CBT-based self-help programme |
| 11 | Woebot: The Mental Health Ally | Woebot Labs Inc | Free | 6,237 | AI | AI ally; needs an access code from a provider or employer |
| 12 | SonderMind - Mental Health | Sondermind lnc. | Free | 13,043 | P | therapy and psychiatry plus self-care tools |
| 13 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 61,450 | S | mood diary |
| 14 | Dr.Mind: Mental Health Tests | Iowave Private Limited | Free | 1 | T | screening tests |

**Top 10: P 4 · S 4 · AI 1 · O 1.** Prescriber-type entries hold 92,822 of the top 10's 108,084 ratings. #1818's finding **holds** for the US storefront: Cerebral, Brightside and Talkspace are at #4, #6 and #8.

### `mental health app` (US)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Quabble: Daily Mental Health | museLIVE Inc. | Free | 4,102 | S | daily wellness practices |
| 2 | Finch: Self-Care Pet | Finch Care Public Benefit Corporation | Free | 748,009 | S | self-care pet with exercises |
| 3 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 61,450 | S | mood diary |
| 4 | Headspace: Sleep & Meditation | Headspace Inc. | Free | 973,858 | S | meditation and mindfulness library |
| 5 | BetterMe: Mental Health | BetterMe Limited | Free | 16,447 | S | meditations, courses, tools |
| 6 | Breeze: Self-Discovery Buddy | Basenji Apps Limited | Free | 72,183 | S | self-discovery and self-care companion |
| 7 | How We Feel | The How We Feel Project, Inc. | Free | 29,495 | S | free emotion journal with strategies |
| 8 | Talkspace: Virtual Therapy App | Groop Internet Platform inc. | Free | 46,799 | P | licensed therapists |
| 9 | BetterHelp - Therapy | Compile, Inc. | Free | 149,277 | P | licensed-therapist marketplace |
| 10 | Clarity: CBT Self Help Journal | Inquiry Health LLC | Free | 29,321 | S | CBT self-help journal with an AI chatbot feature |
| 11 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 9,173 | O | peer community |
| 12 | Wysa: Mental Wellbeing AI | Touchkin eServices Private Limited | Free | 24,406 | AI | AI self-help chat |
| 13 | MindDoc: Mental Health Support | MindDoc Health GmbH | Free | 29,484 | S | self-monitoring and courses |
| 14 | stoic. journal & mental health | Stoic app inc. | Free | 35,471 | S | journal and habit tracker |

**Top 10: S 8 · P 2.** Mostly self-help.

### `mental health self-help` (US)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BetterMe: Mental Health | BetterMe Limited | Free | 16,447 | S | meditations, courses, tools |
| 2 | MindDoc: Mental Health Support | MindDoc Health GmbH | Free | 29,484 | S | self-monitoring and courses |
| 3 | Woebot: The Mental Health Ally | Woebot Labs Inc | Free | 6,237 | AI | AI ally, access-code gated |
| 4 | Quabble: Daily Mental Health | museLIVE Inc. | Free | 4,102 | S | daily wellness practices |
| 5 | stoic. journal & mental health | Stoic app inc. | Free | 35,471 | S | journal and habit tracker |
| 6 | Circles - Mental Health Groups | CIRCLES WORKSHOPS LTD | Free | 3,415 | O | support groups |
| 7 | SELF: Mental Health Self-Care | My True Value Aps | Free | 174 | S | self-care content |
| 8 | Elomia: Mental Health AI Chat | Elomia Health, Inc. | Free | 1,137 | AI | AI chat |
| 9 | 7 Cups: Online Therapy & Chat | 7 Cups of Tea, Co. | Free | 5,697 | P | professional therapy plus listeners |
| 10 | SuperBetter: Mental Health | SuperBetter, LLC | Free | 7,880 | S | game-framed resilience app |
| 11 | Clarity: CBT Self Help Journal | Inquiry Health LLC | Free | 29,321 | S | CBT self-help journal |
| 12 | Voidpet Garden: Mental Health | Voidpet Inc. | Free | 5,697 | S | emotion journal as creatures |
| 13 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 9,173 | O | peer community |
| 14 | MyPossibleSelf: Mental Health | My Possible Self Ltd | Free | 314 | S | free toolkits, content with Priory |
| 15 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 61,450 | S | mood diary |

**Top 10: S 6 · AI 2 · O 1 · P 1.** Mostly self-help.

### `free mental health tools` (US)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Soluna: Mental Health Care | Kooth Group Limited | Free | 3,216 | P | professional one-to-one support |
| 2 | Moodfit: Mental Health Tools | Roble Ridge Software LLC | Free | 2,210 | S | self-help tools |
| 3 | Mental: AI Therapy & Coaching | Dig Deep, Inc. | Free | 2,770 | AI | AI therapy and coaching |
| 4 | The Mood Tools | 2-4-3 Foundation | Free | 21 | S | free coping skills |
| 5 | Brightside Health | Brightside Health, Inc. | Free | 10,532 | P | therapy and/or medication |
| 6 | Talkspace: Virtual Therapy App | Groop Internet Platform inc. | Free | 46,799 | P | licensed therapists |
| 7 | Sensa - Mental Coach | Mental Health Solutions UAB | Free | 1,088 | S | CBT-based programme |
| 8 | Woebot: The Mental Health Ally | Woebot Labs Inc | Free | 6,237 | AI | AI ally |
| 9 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 9,173 | O | peer community |
| 10 | SonderMind - Mental Health | Sondermind lnc. | Free | 13,043 | P | therapy and psychiatry |
| 11 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 61,450 | S | mood diary |
| 12 | U of A Mental Health Tools | University of Arizona | Free | 0 | S | university skills companion |
| 13 | 7 Cups: Online Therapy & Chat | 7 Cups of Tea, Co. | Free | 5,697 | P | professional therapy plus listeners |
| 14 | Cerebral - Mental Health | Cerebral, Inc | Free | 32,275 | P | prescribers and therapists |

**Top 10: P 4 · S 3 · AI 2 · O 1.** Mixed, prescriber-weighted. The top 10 differs from the bare `mental health tools` top 10 by two apps (Woebot and SonderMind replace U of A and Cerebral) — the word `free` does not move the shelf.

### `private mental health app` (US)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 61,450 | S | private mood diary |
| 2 | Ash - AI for Mental Health | Slingshot AI Inc | Free | 4,483 | AI | AI built for emotional support |
| 3 | Noah: Your Emotional Support | REVERB AI INC | Free | 1,837 | AI | AI emotional coach |
| 4 | Sonia: AI for Mental Health | Bloit, Inc. | Free | 1,175 | AI | AI for emotional support |
| 5 | Mood & Mental Health Tracker | 199 Developments Private Limited | Free | 19 | S | mood check-ins and notes |
| 6 | Wysa: Mental Wellbeing AI | Touchkin eServices Private Limited | Free | 24,406 | AI | AI self-help chat |
| 7 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 9,173 | O | peer community |
| 8 | Innermost: Mental Health Chat | Innermost AI, Inc. | Free | 155 | AI | private AI guide |
| 9 | SonderMind - Mental Health | Sondermind lnc. | Free | 13,043 | P | therapy and psychiatry |
| 10 | Talkspace: Virtual Therapy App | Groop Internet Platform inc. | Free | 46,799 | P | licensed therapists |
| 11 | Amaha: Mental Health Self-Care | MINDCRESCENT WELLNESS VENTURES PRIVATE LIMITED | Free | 70 | M | self-care plus therapy and psychiatry booking |
| 12 | CareMe Health-Mental Health | CAREME HEALTH PRIVATE LIMITED | Free | 1 | P | licensed therapists and psychiatrists 24/7 |
| 13 | Felicity: #1 Mental Health App | Orgfit Global Consultancy Private Limited | Free | 0 | P | counselling therapy plus free tests |
| 14 | MindDoc: Mental Health Support | MindDoc Health GmbH | Free | 29,484 | S | self-monitoring and courses |

**Top 10: AI 5 · S 2 · P 2 · O 1.** Mixed; the store reads `private` as "private AI chat".

## 2. Apple App Store, `/search`, GB storefront — 2026-09-05

### `mental health tools` (GB)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Soluna by Kooth | Kooth Group Limited | Free | 33 | P | professional one-to-one support for young people |
| 2 | Moodfit: Mental Health Tools | Roble Ridge Software LLC | Free | 324 | S | self-help tools |
| 3 | Dr.Mind: Mental Health Tests | Iowave Private Limited | Free | 0 | T | screening tests |
| 4 | BetterHelp - Therapy | Compile, Inc. | Free | 8,656 | P | licensed-therapist marketplace |
| 5 | Freudly: Mental Health Support | Tecolution FZCO | Free | 0 | AI | AI companion |
| 6 | Mindfit: Mental Health Journal | Mindfit AS | Free | 1 | S | gratitude journal and CBT exercises |
| 7 | Mental: AI Therapy & Coaching | Dig Deep, Inc. | Free | 125 | AI | AI therapy and coaching |
| 8 | Tellmi: Better Mental Health | Tellmi Ltd | Free | 648 | O | anonymous peer support, moderated |
| 9 | unstuck: OCD Therapy Tools | unstuck Mental Health Studios, Inc. | Free | 4 | AI | unstuckAI analyses what you write |
| 10 | Sensa - Mental Coach | Mental Health Solutions UAB | Free | 89 | S | CBT-based programme |
| 11 | 7 Cups: Online Therapy & Chat | 7 Cups of Tea, Co. | Free | 561 | P | professional therapy plus listeners |
| 12 | Noah: AI Mental Health Coach | REVERB AI INC | Free | 225 | AI | AI coach |
| 13 | Omna: Mental Health | Lumorial Inc | Free | 66 | S | reflection and techniques |
| 14 | CALMzone \| Anxiety Relief | Campaign Against Living Miserably | Free | 331 | S | charity's free anxiety tools |
| 15 | Monsenso | Monsenso A/S | Free | 0 | O | clinician-connected monitoring platform |

**Top 10: S 3 · AI 3 · P 2 · T 1 · O 1.** Mixed. Cerebral and Brightside (US-only services) are absent; BetterHelp and Kooth take the prescriber-type slots.

### `mental health app` (GB)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Finch: Self-Care Pet | Finch Care Public Benefit Corporation | Free | 76,426 | S | self-care pet |
| 2 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 14,105 | S | mood diary |
| 3 | Headspace: Sleep & Meditation | Headspace Inc. | Free | 355,476 | S | meditation library |
| 4 | BetterMe: Mental Health | BetterMe Limited | Free | 2,052 | S | meditations, courses, tools |
| 5 | Wysa: Mental Wellbeing AI | Touchkin eServices Private Limited | Free | 7,433 | AI | AI self-help chat |
| 6 | Kupona Mental Health App | Ojonugwa Oji | Free | 0 | S | education and self-reflection |
| 7 | Quabble: Daily Mental Health | museLIVE Inc. | Free | 578 | S | daily wellness practices |
| 8 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 3,214 | O | peer community |
| 9 | journal & habit tracker－stoic. | Stoic app inc. | Free | 4,850 | S | journal and habit tracker |
| 10 | What's Up? A Mental Health App | Jackson Tempra | Free | 112 | S | free CBT/ACT-method app |
| 11 | Reflectly - Journal & AI Diary | Kodeon, Inc. | Free | 17,777 | S | journal |
| 12 | I am - Daily Affirmations | Monkey Taps | Free | 45,159 | S | affirmations |
| 13 | MyPossibleSelf: Mental Health | My Possible Self Ltd | Free | 1,265 | S | free toolkits |
| 14 | Clarity: CBT Self Help Journal | Inquiry Health LLC | Free | 5,289 | S | CBT self-help journal |
| 15 | MindDoc: Mental Health Support | MindDoc Health GmbH | Free | 7,929 | S | self-monitoring and courses |

**Top 10: S 8 · AI 1 · O 1 · P 0.** Mostly self-help; no prescriber in the top 15.

### `mental health self-help` (GB)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BetterMe: Mental Health | BetterMe Limited | Free | 2,052 | S | meditations, courses, tools |
| 2 | MindDoc: Mental Health Support | MindDoc Health GmbH | Free | 7,929 | S | self-monitoring and courses |
| 3 | MyPossibleSelf: Mental Health | My Possible Self Ltd | Free | 1,265 | S | free toolkits |
| 4 | journal & habit tracker－stoic. | Stoic app inc. | Free | 4,850 | S | journal and habit tracker |
| 5 | Finch: Self-Care Pet | Finch Care Public Benefit Corporation | Free | 76,426 | S | self-care pet |
| 6 | Clarity: CBT Self Help Journal | Inquiry Health LLC | Free | 5,289 | S | CBT self-help journal |
| 7 | Quabble: Daily Mental Health | museLIVE Inc. | Free | 578 | S | daily wellness practices |
| 8 | SELF: Mental Health Self-Care | My True Value Aps | Free | 9 | S | self-care content |
| 9 | Tellmi: Better Mental Health | Tellmi Ltd | Free | 648 | O | moderated peer support |
| 10 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 3,214 | O | peer community |
| 11 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 14,105 | S | mood diary |
| 12 | 7 Cups: Online Therapy & Chat | 7 Cups of Tea, Co. | Free | 561 | P | professional therapy plus listeners |
| 13 | Headspace: Sleep & Meditation | Headspace Inc. | Free | 355,476 | S | meditation library |
| 14 | Amaha: Mental Health Self-Care | MINDCRESCENT WELLNESS VENTURES PRIVATE LIMITED | Free | 37 | M | self-care plus therapy booking |
| 15 | Omna: Mental Health | Lumorial Inc | Free | 66 | S | reflection and techniques |

**Top 10: S 8 · O 2 · P 0.** Mostly self-help.

### `free mental health tools` (GB)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Soluna by Kooth | Kooth Group Limited | Free | 33 | P | professional one-to-one support |
| 2 | Moodfit: Mental Health Tools | Roble Ridge Software LLC | Free | 324 | S | self-help tools |
| 3 | Dr.Mind: Mental Health Tests | Iowave Private Limited | Free | 0 | T | screening tests |
| 4 | BetterHelp - Therapy | Compile, Inc. | Free | 8,656 | P | licensed-therapist marketplace |
| 5 | Freudly: Mental Health Support | Tecolution FZCO | Free | 0 | AI | AI companion |
| 6 | 7 Cups: Online Therapy & Chat | 7 Cups of Tea, Co. | Free | 561 | P | professional therapy plus listeners |
| 7 | Mindfit: Mental Health Journal | Mindfit AS | Free | 1 | S | journal and CBT exercises |
| 8 | Mental: AI Therapy & Coaching | Dig Deep, Inc. | Free | 125 | AI | AI therapy and coaching |
| 9 | CALMzone \| Anxiety Relief | Campaign Against Living Miserably | Free | 331 | S | charity's free anxiety tools |
| 10 | Sensa - Mental Coach | Mental Health Solutions UAB | Free | 89 | S | CBT-based programme |
| 11 | The Mood Tools | 2-4-3 Foundation | Free | 0 | S | free coping skills |
| 12 | Tellmi: Better Mental Health | Tellmi Ltd | Free | 648 | O | moderated peer support |
| 13 | Noah: AI Mental Health Coach | REVERB AI INC | Free | 225 | AI | AI coach |
| 14 | unstuck: OCD Therapy Tools | unstuck Mental Health Studios, Inc. | Free | 4 | AI | AI-analysed OCD tools |

**Top 10: S 4 · P 3 · AI 2 · T 1.** Mixed. Differs from bare `mental health tools` by two apps (7 Cups and CALMzone replace Tellmi and unstuck).

### `private mental health app` (GB)

| # | App | Seller | Price | Ratings | Class | Why |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Daylio Journal - Mood Tracker | Relaxio s.r.o. | Free | 14,105 | S | private mood diary |
| 2 | MindDoc: Mental Health Support | MindDoc Health GmbH | Free | 7,929 | S | self-monitoring and courses |
| 3 | Noah: AI Mental Health Coach | REVERB AI INC | Free | 225 | AI | AI coach |
| 4 | Wysa: Mental Wellbeing AI | Touchkin eServices Private Limited | Free | 7,433 | AI | AI self-help chat |
| 5 | Koala: Mental Health Sharing | Radek Krejcirik | Free | 10 | X | friend-to-friend feelings messaging |
| 6 | CareMe Health-Mental Health | CAREME HEALTH PRIVATE LIMITED | Free | 1 | P | licensed therapists and psychiatrists |
| 7 | WhatsApp Messenger | WhatsApp Inc. | Free | 4,164,076 | X | messaging |
| 8 | Wisdo: Mental Health & Support | Wisdo LTD. | Free | 3,214 | O | peer community |
| 9 | Clovemind: Mental Health Care | Salubrium Private Limited | Free | 0 | P | online counselling |
| 10 | BetterSpace: Mental Health App | Shivtensity Private Limited | Free | 0 | AI | AI-powered wellness companion |
| 11 | Felicity: #1 Mental Health App | Orgfit Global Consultancy Private Limited | Free | 0 | P | counselling therapy |
| 12 | Mood & Mental Health Tracker | 199 Developments Private Limited | Free | 0 | S | mood check-ins |
| 13 | Dr.Mind: Mental Health Tests | Iowave Private Limited | Free | 0 | T | screening tests |
| 14 | JAMUN: AI Mental Health Expert | Amogha AI Technologies Private Limited | Free | 0 | AI | AI support |
| 15 | Amaha: Mental Health Self-Care | MINDCRESCENT WELLNESS VENTURES PRIVATE LIMITED | Free | 37 | M | self-care plus therapy booking |

**Top 10: AI 3 · S 2 · P 2 · X 2 · O 1.** Mixed; seven of the fifteen have 0–10 ratings, so `private` is a thin shelf in GB.

## 3. Apple App Store, `/search`, BG storefront — 2026-09-05

Ratings counts are BG-storefront counts, which is why they are two to three orders of magnitude below the US figures for the same apps.

| Term | Top 10 in Apple's order (class) | Top-10 tally | Ranks 11–15 |
| --- | --- | --- | --- |
| `mental health tools` | Moodfit (S) · Sentur (S) · unstuck (AI) · Quit Anger (S) · **Instagram** (X) · **WhatsApp** (X) · MoodTools (S) · CALMzone (S) · Moodnotes (S) · Dandapani (S) | **S 7 · AI 1 · X 2 · P 0** | RumiNot (S) · PHQ-9 (T) · Mental Health Wallet (S) — 13 results only |
| `mental health app` | stoic (S) · Quabble (S) · What's Up? (S) · MindDoc (S) · **How We Feel** (S) · BetterMe (S) · Talkspace (P) · **Daylio** (S) · **Headspace** (S) · Wisdo (O) | **S 8 · P 1 · O 1** | Elomia (AI) · Rozmova (P, therapist-matching, Ukrainian listing) · Mind Power (X) · **Finch** #14 (S) · Calm (S) |
| `mental health self-help` | BetterMe (S) · Quabble (S) · MindDoc (S) · Elomia (AI) · Amaha (M) · stoic (S) · CBT Hypnotherapy: MentalFuture (S, seller MENTAL FUTURE OOD — Bulgarian) · **Headspace** (S) · Mind Power (X) · Voidpet (S) | **S 7 · AI 1 · M 1 · X 1 · P 0** | MyPossibleSelf (S) · Thera (S) · SuperBetter (S) · Catzy (S) |
| `free mental health tools` | Moodfit (S) · Sentur (S) · unstuck (AI) · **Instagram** (X) · CALMzone (S) · **WhatsApp** (X) · Quit Anger (S) · MoodTools (S) · Moodnotes (S) · Dandapani (S) | **S 7 · AI 1 · X 2 · P 0** | RumiNot (S) · PHQ-9 (T) · Mental Health Wallet (S) · Dr.Mind (T) · Mindfit (S) |
| `private mental health app` | **WhatsApp** (X) · Koala (X) · Wysa (AI) · Diarly (X) · Amaha (M) · **WhatsApp Business** (X) · **Daylio** (S) · **Instagram** (X) · Noah (AI) · Punkt journal (S) | **X 5 · AI 2 · S 2 · M 1 · P 0** | Day One (X) · My Daily Diary with Lock (X) · Muse Journal (X) · Prompted Journal (X) · Birdy (X) |

**No prescriber, telehealth or therapy-matching service appears in any BG top 10.** Talkspace at #7 for `app` is the only P entry in 72 BG rows. The `tools` shelf is thin enough that Instagram and WhatsApp fill it; `private` is mostly messaging and generic diaries.

## 4. Google Play web search, `hl=en&gl=US`, anonymous — 2026-09-05

Card order as server-rendered; no sponsored markers present. Ratings count and price are not on the search card and are not reported. Class from the app's Apple listing where one exists; † = classified from the Play title alone; ? = not read.

| # | `mental health tools` | `mental health app` | `mental health self-help` | `free mental health tools` | `private mental health app` |
| --- | --- | --- | --- | --- | --- |
| 1 | MindDoc — MindDoc Health GmbH (S) | MindDoc — MindDoc Health GmbH (S) | **Finch** — Finch Care PBC (S) | **BetterHelp** — BetterHelp (P) | MindDoc — MindDoc Health GmbH (S) |
| 2 | MindHealth: CBT Mental Health — Mind Health (S†) | Quabble — museLIVE Inc. (S) | Quabble — museLIVE Inc. (S) | MindDoc — MindDoc Health GmbH (S) | Amaha: Mental Health Therapy — Amaha Health (M) |
| 3 | MyPossibleSelf — My Possible Self Ltd (S) | BetterMe — BetterMe Limited (S) | MyPossibleSelf — My Possible Self Ltd (S) | Amaha: Mental Health Therapy — Amaha Health (M) | Quabble — museLIVE Inc. (S) |
| 4 | Quabble — museLIVE Inc. (S) | Amaha: Mental Health Therapy — Amaha Health (M) | **BetterHelp** — BetterHelp (P) | MyPossibleSelf — My Possible Self Ltd (S) | MyPossibleSelf — My Possible Self Ltd (S) |
| 5 | BetterMe — BetterMe Limited (S) | **BetterHelp** — BetterHelp (P) | BetterMe — BetterMe Limited (S) | Quabble — museLIVE Inc. (S) | BetterMe — BetterMe Limited (S) |
| 6 | **BetterHelp** — BetterHelp (P) | Calm — Calm.com, Inc. (S) | Remente — Remente (S) | **Headspace** — Headspace (S) | MindHealth: CBT Mental Health — Mind Health (S†) |
| 7 | Mental Health Tests — Mind Diagnostics (T) | **Talkspace** — Talkspace (P) | Amaha: Mental Health Therapy — Amaha Health (M) | Mental Health Tests — Mind Diagnostics (T) | **BetterHelp** — BetterHelp (P) |
| 8 | Amaha: Mental Health Therapy — Amaha Health (M) | Voidpet Garden — Voidpet (S) | MindHealth: CBT Mental Health — Mind Health (S†) | Onsen – AI for Mental Health — Onsen AI Limited (AI) | Wysa — Touchkin (AI) |
| 9 | Onsen – AI for Mental Health — Onsen AI Limited (AI) | Mental Health: Serene — Uprise Labs (?) | — (8 cards) | Wysa — Touchkin (AI) | Mental Health Tests — Mind Diagnostics (T) |
| 10 | Stress Therapy: Neurocycle — Switch on Your Brain (S†) | **Headspace** — Headspace (S) | — | Stress Therapy: Neurocycle — Switch on Your Brain (S†) | Mental Wellness: BetterMind — Uprise Labs (?) |
| 11–17 | Headspace (S) · BetterMind (?) · Wysa (AI) | **Finch** #11 (S) · BetterMind (?) · MyPossibleSelf (S) · Ash (AI) · Wysa (AI) · MindHealth (S†) · Insight Timer (S) | — | BetterMe (S) · MindHealth (S†) · Soluna: Mental Health Care — Kooth (P) | Neurocycle (S†) · CounselCat - AI Therapy (AI) · Serene (?) · Elomia (AI) |
| **Top-10 tally** | **S 6 · P 1 · M 1 · T 1 · AI 1** | **S 6 · P 2 · M 1 · ? 1** | **S 6 · P 1 · M 1** (of 8) | **S 5 · P 1 · M 1 · T 1 · AI 2** | **S 6 · P 1 · M 1 · AI 1 · T 1** |

**Play is mostly self-help on every term.** BetterHelp is the single telehealth entry on four of five terms (Talkspace joins it on `app`), but it is **#1 for `free mental health tools`**. Amaha's Play title is `Mental Health Therapy` where its Apple title is `Mental Health Self-Care` — the same app is filed under different nouns on the two stores. ⚠️ Daylio, How We Feel and Clarity do not appear in any Play first page here; that is one anonymous US view and says nothing about their Play presence generally.

## 5. Autocomplete proxies — 2026-09-05

### Google suggest (`client=firefox&hl=en`; IP-geolocated, no country parameter available)

| Prefix | Suggestions, in Google's order |
| --- | --- |
| `mental health t` | mental health test · mental health test free · mental health technician · mental health therapist near me · mental health therapist · mental health technician jobs · mental health tattoos · mental health therapy · mental health triage · mental health therapy near me |
| `mental health a` | mental health awareness month · mental health america · mental health awareness · mental health act · mental health assessment · mental health awareness month 2026 · **mental health apps** (#7) · mental health awareness week 2026 · mental health awareness week · mental health act 1983 |
| `free mental health` | free mental health services near me · free mental health test · free mental health services · free mental health counseling · free mental health test with free results · free mental health consultation · free mental health · **free mental health apps** (#8) · free mental health courses · free mental health consultation online |
| `mental health tools` | mental health tools · mental health tools for adults · mental health tools for teens · mental health tools and resources · mental health tools for kids · mental health tools for students · mental health tools for the workplace · mental health tools for pediatric · mental health tools assessment · mental health tools for men |

`tools` does not appear anywhere in the `mental health t` list — the completions are `test`, `technician`, `therapist`, `therapy`, `triage`. The `mental health tools` completions are audience- and resource-shaped (`for adults`, `for teens`, `and resources`, `for the workplace`); **none of the ten contains `app`**. `apps` stays where #1816 found it: #7 for `mental health a`, and #8 for `free mental health`.

### App Store search hints (Apple's own endpoint)

| Prefix | US storefront (143441) | GB storefront (143444) |
| --- | --- | --- |
| `mental health t` | mental health tracker · free mental health test · mental health therapy · mental health test · mental health tracker free · **moodfit: mental health tools** · mental health tests · mental health test prep 2026 · mental health traffic lights · mental health tv - mhtn | mental health tracker · mental health test · **moodfit: mental health tools** · mental health talk · mental health tests · mental health test prep 2026 · mental health traffic lights · mental health tv - mhtn · calmino: mental health tracker · dr.mind: mental health tests |
| `mental health too` / `mental health tools` | **moodfit: mental health tools · u of a mental health tools** — two suggestions, both app titles | **moodfit: mental health tools** — one suggestion |
| `mental health a` | mental health apps · mental health ai · mental health app free · free mental health apps · free mental health ai · elomia: mental health ai · what's up? a mental health app · woebot: the mental health ally · mental health america, inc. · mental health association for chinese communities | not fetched |
| `mental health app` | free mental health apps · mental health apps · mental health app free · what's up? a mental health app · euforia mental health apps ltd · betterspace: mental health app · deeptalk - mental health app · felicity: #1 mental health app · happy - a mental health app · helping hand mental health app | not fetched |
| `mental health self` | amaha: mental health self-care · mental health - self care · ease -mental health, self-care · self: mental health self-care | not fetched |
| `free mental health` | free mental health apps · free mental health ai · free mental health games · free mental health test | not fetched |
| `private mental` | **no suggestions** (empty list, HTTP 200) | not fetched |

**Apple's store has no generic `mental health tools` query in its suggestion list.** The prefix completes only to two app titles in the US and one in GB (unchanged from #1816's 2026-09-04 reading). By contrast `mental health apps`, `mental health app free` and `free mental health apps` are generic queries that the store itself suggests. `private mental` suggests nothing at all. ⚠️ Since 2026-09-04, `mental health apps` has moved above `mental health ai` for the prefix `mental health a` in the US list; Apple does not document the ordering, so this is noted and not interpreted.

## 6. Where the cluster-3 incumbents land

Rank in the returned list, or `–` if absent from the 13–15 results (Apple) or the 8–17 cards (Play).

| App | Term | Apple US | Apple GB | Apple BG | Play US |
| --- | --- | --- | --- | --- | --- |
| **Finch** | tools / app / self-help / free tools / private | – / **2** / – / – / – | – / **1** / 5 / – / – | – / 14 / – / – / – | – / 11 / **1** / – / – |
| **Clarity: CBT Self Help Journal** | tools / app / self-help / free tools / private | – / 10 / 11 / – / – | – / 14 / 6 / – / – | – / – / – / – / – | – / – / – / – / – |
| **Headspace** | tools / app / self-help / free tools / private | – / 4 / – / – / – | – / 3 / 13 / – / – | – / 9 / 8 / – / – | 11 / 10 / – / 6 / – |
| **Daylio** | tools / app / self-help / free tools / private | 13 / 3 / 15 / 11 / **1** | – / 2 / 11 / – / **1** | – / 8 / – / – / 7 | – / – / – / – / – |
| **How We Feel** | tools / app / self-help / free tools / private | – / 7 / – / – / – | – / – / – / – / – | – / 5 / – / – / – | – / – / – / – / – |

**None of the five is in any top 10 for `mental health tools` or `free mental health tools` on any storefront**; Daylio's #13 and #11 (US) are the only appearances. All five appear for `mental health app` on at least one Apple storefront. Daylio is **#1 for `private mental health app` in both US and GB**.

## 7. What this means for naming the noun — facts only

1. **The word `tools` selects a different shelf from the word `app`.** Apple US top-10 overlap between `mental health tools` and `mental health app` is one app (Talkspace); GB overlap is zero. The incumbents `docs/positioning.md` § 1 names as cluster 3 all live on the `app` shelf.
2. **On Apple US the `tools` shelf is split, and the ratings mass is on the prescriber side.** 4 of 10 are prescriber/telehealth/professional-support services holding 92,822 of the top 10's 108,084 ratings; the self-help occupants that carry the word in their titles (Moodfit, The Mood Tools, U of A Mental Health Tools) have 2,210, 21 and 0 ratings. #1818's "returns prescribers" finding holds for the US; it does not hold for GB by count (2 of 10, plus 3 AI companions), for Play (1 of 10), or for BG (0 of 10).
3. **`free` does not move the Apple shelf** — the `free mental health tools` top 10 differs from the bare term by two apps in both US and GB — and on Play it puts BetterHelp at #1.
4. **`private` moves the shelf towards AI companions and generic diaries**, not towards privacy-conscious self-help: 5 of the Apple US top 10 are AI chat products, and on BG 5 of 10 are messaging or diary apps. The only incumbent that owns the word is Daylio (#1 US and GB).
5. **Neither autocomplete surface treats `mental health tools` as an app query.** Apple's store suggests it only as two app titles; Google completes it with audiences and resources, none containing `app`. The store's own generic queries are `mental health apps`, `mental health app free`, `free mental health apps`, `mental health tracker`, `mental health journal`, `mental health test`.
6. **The prescriber question is a US and GB question.** The Bulgarian storefront has no prescriber on any of the five terms and its `tools` shelf is thin enough for Instagram and WhatsApp to rank.
7. **The same app is filed under different nouns per store** (Amaha: `Self-Care` on Apple, `Therapy` on Play), so whatever noun is chosen, the two listings should be checked separately rather than assumed to land the same way.

## Stated gaps

1. No search volume of any kind, as before.
2. Play: ratings counts and prices not read (not on the search card); one anonymous `gl=US` view only; no GB or BG Play view; first page only (8–17 cards).
3. Google suggest: country not controllable; the lists mix UK and US completions.
4. App Store hints: GB fetched only for the `t`/`tools` prefixes; BG storefront not fetched.
5. Classification is from the listing text's own description, not from using the apps; five Play-only entries (marked † or ?) were classified from title alone or left unclassified.
6. Ranks are one request each; Apple and Play both vary results over time and by client, so a single-day read is a snapshot, not a ranking.

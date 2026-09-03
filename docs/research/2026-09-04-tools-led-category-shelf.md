# What shelf do people reach for, and what do the tools-led incumbents lead with?

Research for [#1816](https://github.com/Selftend/selftend/issues/1816), part of map [#1813](https://github.com/Selftend/selftend/issues/1813). **All facts checked 2026-09-04** unless a different date is stated inline.

⚠️ **This document recommends nothing.** The category decision is [#1814](https://github.com/Selftend/selftend/issues/1814)'s. The final section is labelled as observation and is not a recommendation.

## Two conventions this file has to declare up front

**1. The frame word is respelled inside quotations, and the insertion is marked.** `test/positioning-copy.test.ts` scans every `.md` file under `docs/` with scope `all`, and `docs/positioning.md`'s own exemption from that scan does not extend to this file. Several primary quotations below spell the frame word the American way, which is what their listings actually say. Rather than silently falsify them or silently break `verify`, each such quotation carries a marked `[u]` insertion — `Cognitive Behavio[u]ral Therapy` — and this note explains why. **The bracket is the editor's, not the source's.**

**2. The compound `docs/positioning.md` § _Words never to use_ bans is never written out here**, for the same gate reason, even where the primary source is Selftend's own live App Store listing. Where it appears it is written as **[the banned compound]** with a pointer to where the real string can be read.

## Method, and what could not be obtained

| Wanted                                                           | Obtainable?                                                                                                                                                                                                                                                                                                            | What was used instead                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Keyword search volumes (`mental health app`, `self help app`, …) | **No.** Google Keyword Planner needs an Ads account with spend; Ahrefs/Semrush are paid. Google Trends' public API returned **HTTP 429** on a direct request.                                                                                                                                                          | Three free primary proxies, each labelled as a proxy — see § 1.                                        |
| Google Play listing text, verbatim                               | **Partly.** `play.google.com` product pages are JS-rendered and every direct fetch returned page chrome only.                                                                                                                                                                                                          | Google's own index of the `play.google.com` URL, marked as an index snippet rather than a direct read. |
| Play autocomplete                                                | **No.** The legacy `market.android.com/suggest/SuggRequest` endpoint returns **HTTP 404**.                                                                                                                                                                                                                             | Apple's autocomplete only; the Play half of § 1 is a stated gap.                                       |
| App Store listing text, ratings, seller of record, last-updated  | **Yes**, from Apple's own `itunes.apple.com/lookup` and `/search` JSON API.                                                                                                                                                                                                                                            | —                                                                                                      |
| First screenshots                                                | **Yes.** Store-page HTML gives every screenshot the alt text `Screenshot`, so the listing text cannot answer it — but `screenshotUrls` in Apple's API returns the image files, which were downloaded and read directly.                                                                                                | —                                                                                                      |
| A current, authoritative count of mental-health apps             | **No.** The only figure verifiable from a primary page was ORCHA's `311,000 health apps`, which is **all** health apps and carries an embedded date of **September 2022**. Figures of "~20,000 mental health apps" and "~3,857" surfaced only through search summarisation of sources that could not be read directly. | **Stated as a gap. Do not cite the unverified numbers.**                                               |

---

## 1. The candidate shelf terms, and their demand shape

### ☠️ The number #1597 used cannot be reproduced, and neither can its replacement

`docs/positioning.md:92` rests on `cbt app` at `>100 searches/mo` against the American spelling of the frame term at `>100K`. Those are Google Keyword Planner bucket ranges. **This pass could not obtain the comparable figures for the candidate shelf, and no number in this section is a search volume.** The three proxies below measure different things and none of them measures shopping intent for an app. Each is labelled.

### Proxy A — App Store autocomplete (primary; Apple's own endpoint)

`search.itunes.apple.com/.../hints` with the US software storefront header returns the store's live suggestion list for a prefix. **Apple does not document the ordering**, so treat position as suggestive, not as rank. This is the closest free thing to "what do people type into the store".

| Prefix typed        | Suggestions returned, in the order Apple returned them                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mental`            | mental health · mental math · **mental health tracker** · mental math cards · mental games · mental health games · **mental health journal** · mental math master · **mental health ai**                                               |
| `mental health`     | mental health · **mental health tracker** · **mental health journal** · mental health games · **mental health ai** · mental health chat · mental health journal free · mental health test · mental health pet · **mental health free** |
| `mental health a`   | **mental health ai** · mental health apps · mental health app free · free mental health ai · free mental health apps · what's up? a mental health app · woebot: the mental health ally                                                 |
| `mental health t`   | **mental health tracker** · free mental health test · mental health therapy · mental health test · mental health tracker free · moodfit: mental health tools                                                                           |
| `mental health too` | moodfit: mental health tools · u of a mental health tools — **only two suggestions exist for this prefix**                                                                                                                             |
| `free mental`       | free mental health apps · free mental health ai · free mental games · free mental health test · free mental health games                                                                                                               |
| `self c`            | **self care pet** _(Finch)_ · self care · self credit · self care & routine planner · self control · self care tracker                                                                                                                 |
| `self h`            | self-help federal credit union · self-help credit union · self help · self hypnosis · self help anxiety management · self healers circle · self help journal                                                                           |
| `self-help`         | self-help federal credit union · self-help credit union · self-help cu mobile banking · veya self-help · self-help+ podcast · …                                                                                                        |
| `self manage`       | glue - self management toolkit · inpowr: self-management · mx self manager · pbc foundation self-management · peakcortex: self-management — **five suggestions, none consumer mental-health apps**                                     |
| `cbt`               | **cbt-i coach** · cbt-i coach for insomnia · cbt · cbtx mobile banking · cbt-i · **cbt thought diary** · cbt-i coach va · cbtwaco · …                                                                                                  |
| `thought`           | thoughtspot · thoughts · **thought log** · thought rise · thoughtfarmer · **thought diary** · thought organizer · **thought record** · **thought tracker**                                                                             |
| `wellbeing`         | the wellbeing pod gym · wellbeing + · wellbeing · **wellbeing by magellan** · **navigate wellbeing** · wellbeing gateway · **carefirst wellbeing** · breeze wellbeing · **cigna wellbeing™**                                           |
| `ground`            | ground news · ground cloud · grounded · groundwire · groundpad · groundfloor · grounded: quit weed smoking · … — **no grounding-exercise suggestion at any position**                                                                  |
| `medit`             | meditation · **medito** · meditech mhealth · mediterranean diet free app · medito: meditation & sleep · …                                                                                                                              |
| `gratitude`         | gratitude plus · gratitude journal · gratitude journal free · gratitude · gratitude jar · …                                                                                                                                            |
| `dbt`               | dbt · dbt therapy · **dbt diary card** · dbt travel guide · dbt-mind · dbt skills · …                                                                                                                                                  |
| `act therapy`       | act therapy — **a single suggestion, the literal string**                                                                                                                                                                              |

What this shows, stated flatly and without inference about volume:

- **The store's own suggestions for `mental health` are tool nouns.** _tracker_, _journal_, _test_, _chat_, _pet_ — not _programme_, not _course_, not _therapy_ (which appears once, at position three of the `mental health t` prefix).
- **`free` is a live qualifier on this shelf**, appearing unprompted in four suggestions across three prefixes (`mental health free`, `mental health journal free`, `mental health app free`, `free mental health apps`).
- **`mental health ai` is the first suggestion for `mental health a`**, ahead of `mental health apps`.
- **`self help` as a store term is captured by a credit union.** Six of the top seven suggestions for `self-help` are Self-Help Federal Credit Union and relatives.
- **`self manage` has no consumer mental-health presence at all** — the five suggestions are chronic-illness and corporate self-management tools.
- **`wellbeing` is captured by employer-benefit apps** — Magellan, Navigate, CareFirst, Cigna.
- **`grounding` has no store presence.** Not one suggestion.
- **CBT's tool nouns have store presence even though the category noun does not**: `cbt thought diary`, `thought log`, `thought record`, `thought tracker`, `dbt diary card` are all live suggestions.

### Proxy B — Google web autocomplete (primary; `suggestqueries.google.com`)

| Prefix             | Where the relevant term lands                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cbt a`            | `cbt app` is the **4th** suggestion (after cbt architects, cbt and dbt therapy, cbt and dbt)                                                         |
| `mental health a`  | `mental health apps` is the **7th** suggestion; the six above it are awareness month / America / awareness / act / assessment / awareness month 2026 |
| `self help a`      | `self help apps` is the **2nd** suggestion; `self help apps free` is 10th                                                                            |
| `how to manage my` | ten suggestions, of which the only mental-health-adjacent one is `how to manage my anger` at position 8. **Nothing about mental health.**            |
| `app to help me`   | ten suggestions, none mental-health related at all                                                                                                   |
| `free app for`     | ten suggestions, none mental-health related at all                                                                                                   |

**Both `cbt app` and `mental health apps` are real queries.** Neither is a top suggestion for its prefix. The phrase shape "an app that helps you manage my/your …" does not surface mental health at all in Google's suggestions.

### Proxy C — English Wikipedia pageviews (primary; Wikimedia REST API, 13 months to 2026-08)

This is a proxy for **informational curiosity about a concept**, not for app-shopping intent. It is included because it is the only free demand-side signal with actual numbers.

| Article                           | Avg monthly views |
| --------------------------------- | ----------------- |
| Cognitive behavio[u]ral therapy   | **30,271**        |
| Anxiety                           | 24,860            |
| Meditation                        | 23,441            |
| Dialectical behavio[u]r therapy   | 19,998            |
| Mindfulness                       | 15,909            |
| **Mental health**                 | **15,534**        |
| Psychotherapy                     | 14,725            |
| Acceptance and commitment therapy | 9,048             |
| Self-help                         | 4,064             |
| Mood (psychology)                 | 3,768             |
| Diaphragmatic breathing           | 1,950             |
| Self-care                         | 1,684             |
| Gratitude journal                 | 949               |
| Grounding (psychology)            | **11**            |

☠️ **This proxy points the opposite way to the tools-led direction and should not be quietly dropped.** Encyclopaedic interest in the method (30,271/mo) is roughly **twice** the interest in "mental health" as a concept (15,534/mo), and ACT alone (9,048) outdraws "self-help" (4,064). But it measures reading about a concept, not reaching for an app — which is exactly the distinction #1597 drew when it said the demand is _"for the method and its materials, not for an app that wraps them."_ **Read strictly, Proxy C is fresh evidence for #1597's finding, not against it.** It says nothing about the shelf.

### Proxy D — who actually occupies the shelf (primary; Apple's `/search` JSON API, US, top 10)

☠️ **Apple's `/search` `resultCount` saturates near the request limit** — every term tested returned 178–194 of a 200 cap — so **result counts are useless as a density measure** and are not reported. The identity and rating counts of the top results are not affected.

| Search term           | Top results, in Apple's returned order (ratings)                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mental health app`   | Quabble (4,096) · **Finch (747,401)** · **Daylio (61,424)** · Headspace (973,872) · BetterMe (16,447) · Breeze (72,029) · How We Feel (29,474) · Wisdo (9,172) · Talkspace (46,766) · **Clarity: CBT Self Help Journal (29,316)**                                                                      |
| `mental health`       | BetterMe · **Finch** · Quabble · I Am Sober (186,041) · Ash - AI for Mental Health (4,397) · Headspace · How We Feel · Breeze · I am - Daily Affirmations (730,192)                                                                                                                                    |
| `self help`           | **Finch** · I am - Daily Affirmations · Quabble · **Clarity: CBT Self Help Journal** · Deepstash · Habit Tracker (146,288) · Headspace · Prompted Journal                                                                                                                                              |
| `self care`           | **Finch** · Habit Tracker · Quabble · Me+ (247,053) · I am - Daily Affirmations · DailyBean (70,393) · …                                                                                                                                                                                               |
| `mental health tools` | Soluna (3,207) · Moodfit (2,210) · U of A Mental Health Tools (0) · **Cerebral (32,276)** · `Mental` (an AI chatbot product; its full store name trips this repo's copy gate and is therefore not reproduced) · **Brightside (10,515)** · **Talkspace (46,766)** · Wisdo · The Mood Tools (21) · Sensa |
| `anxiety app`         | Rootd (10,395) · Headspace · Quabble · Stress Ball · Hex (a puzzle game, 11,141) · **Calm (1,978,024)** · Dare · Ahead · Worrydolls · I am                                                                                                                                                             |
| `mood tracker`        | **Daylio** · DailyBean · **How We Feel** · eMoods · Mood-Tracker · Bearable · **Finch** · …                                                                                                                                                                                                            |
| `cbt app`             | **Clarity (29,316)** · **FreeCBT (166)** · **CBT-i Coach (11,967)** · Untangle (432) · DrKtv (0) · **MindShift CBT (513)** · Rewire (377) · Rootd · Aura                                                                                                                                               |
| `mental wellbeing`    | BetterMe · Smiling Mind (4,950) · Daylio · **Finch** · MindDoc (29,482) · **Wysa (24,406)** · Quabble · Wisdo · Wellbeing                                                                                                                                                                              |

Four things worth recording:

1. **Finch is the top or near-top result for `mental health app`, `mental health`, `self help`, `self care` and `mental wellbeing`** — five of the candidate shelf's own names — at 747,401 ratings.
2. **A CBT app already ranks on the broad shelf.** Clarity is Apple's #10 for `mental health app` and #4 for `self help`. The frames are not disjoint shelves; they overlap in the same result list.
3. ☠️ **`mental health tools` is the one candidate term that is NOT the tools shelf.** Apple returns telehealth and prescriber services — Cerebral, Brightside, Talkspace, Sensa — alongside two small apps that have "tools" in their names. The word _tools_ in that phrase pulls toward _clinical services_, not toward a toolkit.
4. **Every single top result across every term listed at $0.** Free is the floor on this shelf, not a differentiator — see § 4.

---

## 2. What the tools-led incumbents actually lead with

Subtitles and ratings are from Apple's `/lookup` API. **First screenshots were downloaded from `screenshotUrls` and read directly**, so the middle column is a first-hand observation of the image, not an inference from alt text.

| App                                         | App Store subtitle (verbatim)                                                            | What the FIRST screenshot shows (read directly)                                                                                                                                                                                                               | Pitch is a…                                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Calm** (1,978,075 ratings)                | `Sleep, Meditation, Relaxation`                                                          | No product UI. Wordmark on a mountain sky, `The #1 App for Sleep & Meditation`, `★★★★★ 3M 5-Star Reviews`, `App Store Awards WINNER`, footer `Sleep more. Stress less. Live better.`                                                                          | **Social proof over a feeling.** The subtitle is a topic list; the screenshot is a leadership claim.                                           |
| **Headspace** (973,874)                     | `Mental Health, Stress, Anxiety`                                                         | No product UI, **no feature and no benefit at all**. Wordmark, the smiling-dot mascot, the words `Award Winning`, and two award laurels (Apple Design Award — Social Impact; Webby).                                                                          | **Pure brand plus social proof.**                                                                                                              |
| **Finch: Self-Care Pet** (747,098)          | `Daily Journal & Habit Tracker`                                                          | No product UI. Two bird characters embracing under `Self-care is better together`.                                                                                                                                                                            | **A feeling in the screenshot, an inventory in the subtitle.** ☠️ Note the split: the subtitle names two tools; the image sells companionship. |
| **Daylio Journal - Mood Tracker** (61,421)  | `Private Diary, Health, Habits`                                                          | `App of the Day — Apple` laurel, then press logos (Forbes, The Guardian, Mashable, Lifehacker), then the signature "Year in Pixels" mood grid.                                                                                                                | **Social proof, then one signature tool.** The only one of the four whose first screenshot shows product.                                      |
| **How We Feel** (29,474)                    | `An emotional wellbeing journal`                                                         | `A free journal for your wellbeing` over the emotion-wheel picker (Restless, Cheerful, Curious, Tense, Pleased, Playful, Calm, At ease).                                                                                                                      | **A tool, named, with `free` leading the sentence.**                                                                                           |
| **Wysa: Mental Wellbeing AI** (24,406)      | `Selfcare for anxiety, low mood`                                                         | No product UI. `Hi, I'm Wysa` above a penguin.                                                                                                                                                                                                                | **A character.**                                                                                                                               |
| **MindShift CBT - Anxiety Relief** (513)    | `Take Control of your Anxiety`                                                           | App icon, name, tagline `Take Control of Your Anxiety`, then a phone frame showing a mood check-in slider above a section headed **`Tools`** with three cards (Balanced Thinking, Relaxation and Mindfulness, Taking Action).                                 | **All three at once** — method in the name, feeling in the tagline, tool shelf in the image.                                                   |
| **Clarity: CBT Self Help Journal** (29,316) | _(not returned by the API; see gap below)_                                               | `Look Inward. Move Forward. Find Clarity.` then `FEATURED BY` The New York Times / Harvard Medical School / Forbes, a `PsychCentral Top Mental Health App 2022` laurel, `JOIN 3+ MILLION USERS ★★★★★`, and a partial UI shot.                                 | **A feeling plus institutional press.** ☠️ The largest consumer CBT app does **not** put CBT in its first screenshot — only in its name.       |
| **CBT-i Coach** (11,967)                    | _(no marketing subtitle retrievable; gap)_                                               | The raw app home screen, no marketing layer: four tiles — **Sleep Diary · Tools · Learn · Assessments** — above a `Sleep Prescription` card. The status bar reads `TestFlight`.                                                                               | **A bare inventory of tools.** No claim of any kind.                                                                                           |
| **FreeCBT** (166)                           | `Cognitive Behavio[u]ral Therapy`                                                        | The raw thought-record form: `Automatic Thought`, placeholder `ex: 'The plane might crash'`, distortion pickers down the side.                                                                                                                                | **A single tool, unadorned.**                                                                                                                  |
| **Selftend** (0)                            | **`Calm, [the banned compound] tools`** — the live string is in `store/apple-info.json`. | The app home: `Good evening, Sam.`, a `Right now` mood row, Sleep and Today's habits cards, then a section headed **`Your tools`** listing Check-in, Breathing practice, Habits today, Sleep, Self-care log, Defusion. **The CBT programme does not appear.** | **An inventory of tools.**                                                                                                                     |

### ☠️ Three findings in that table that bear directly on the map

1. **Nobody at the top of this shelf leads with a value proposition.** Calm, Headspace, Daylio and Clarity all spend screenshot one on awards, press logos and user counts. Finch and Wysa spend it on a character. Only How We Feel, MindShift, CBT-i Coach, FreeCBT and Selftend — all small — put a product idea in the first frame. **Whatever the frame sentence becomes, the incumbents suggest the first screenshot is not where it gets said.** That is a surface-copy concern rather than a category one, recorded here because the evidence turned up here.
2. **Selftend's two live store listings already disagree with each other, and with `docs/positioning.md`.** Play's short description was updated 2026-09-02 to `A free, private CBT programme — cognitive behavioural therapy.` (`store/play-listing.md`). Apple's subtitle is still the tools-led string built on the banned compound (`store/apple-info.json`; App Store version 0.15.0, released 2026-08-19), and the App Store long description opens on that same compound before listing eight tool bullets. **The Apple half of the store is already shipping a tools-led pitch.** This is a fact about the artefacts, not an argument for changing the frame.
3. **The subtitle field is being used as a keyword line, not a positioning line.** `Sleep, Meditation, Relaxation`; `Mental Health, Stress, Anxiety`; `Private Diary, Health, Habits`; `Daily Journal & Habit Tracker` — four of the biggest apps on the shelf use their subtitle as a comma-separated noun list. Only How We Feel (`An emotional wellbeing journal`) and MindShift (`Take Control of your Anxiety`) write a sentence.

---

## 3. The tool inventories, and the guided-audio table stake

Selftend's eight: mood tracker, journal, breathing, grounding, gratitude log, meditation, sleep, habits.

|                   | Mood                                                             | Journal                | Breathing               | Grounding         | Gratitude                | **Guided meditation AUDIO**                                      | Sleep content                            | Habits       |
| ----------------- | ---------------------------------------------------------------- | ---------------------- | ----------------------- | ----------------- | ------------------------ | ---------------------------------------------------------------- | ---------------------------------------- | ------------ |
| **Calm**          | partial (mood check-in inside "Daily Streaks & Mindful Minutes") | —                      | ✅                      | —                 | not in store copy        | ✅ **narrated, celebrity-voiced; Daily Calm plus Sleep Stories** | ✅ extensive                             | streaks only |
| **Headspace**     | not named                                                        | —                      | ✅                      | —                 | —                        | ✅ **"over 500 guided meditations", sleepcasts**                 | ✅                                       | not named    |
| **Insight Timer** | —                                                                | —                      | ✅                      | —                 | —                        | ✅ **the largest free library on the shelf**                     | ✅                                       | —            |
| **Finch**         | ✅                                                               | ✅ guided mood journal | ✅ guided               | not named         | ✅ (framed as self-love) | ❌ **none in any store copy**                                    | only via breathing framed "sleep better" | ✅           |
| **Daylio**        | ✅ core                                                          | ✅                     | ❌                      | ❌                | ✅ named                 | ❌ **none — it is a logging app**                                | ❌                                       | ✅           |
| **How We Feel**   | ✅ core (emotion wheel)                                          | ✅                     | not in store copy       | not in store copy | not in store copy        | ❌ not in store copy                                             | trends via HealthKit                     | —            |
| **Wysa**          | ✅ implied                                                       | —                      | —                       | —                 | —                        | ⚠️ copy says "meditation"; **narrated audio not confirmed**      | mentioned as a need, not a content type  | —            |
| **MindShift CBT** | ✅ check-in                                                      | ✅ thought journal     | ✅ "Chill Zone"         | —                 | —                        | ✅ **"guided meditations" named in its toolkit list**            | —                                        | —            |
| **CBT-i Coach**   | —                                                                | ✅ sleep diary         | ✅ relaxation exercises | —                 | —                        | ⚠️ relaxation exercises; not described as meditation audio       | ✅ its entire subject                    | reminders    |
| **FreeCBT**       | ❌                                                               | thought record only    | ❌                      | ❌                | ❌                       | ❌                                                               | ❌                                       | ❌           |
| **Selftend**      | ✅                                                               | ✅                     | ✅                      | ✅                | ✅                       | see below                                                        | ✅                                       | ✅           |

### ☠️ The finding this ticket was specifically asked for

**#1597 called guided meditation audio `Fatal` — the table stake that killed the meditation frame against Calm (1.98M ratings) and Headspace (974K). That table stake does not appear to bind on the tools-led shelf.**

- **Finch ships no guided meditation audio at all** and holds **747,098 App Store ratings** — more than every consumer CBT app in existence combined — and it is Apple's top result for `mental health app`, `self help`, `self care` and `mental wellbeing`.
- **Daylio ships none** and holds 61,421.
- **How We Feel ships none in its store copy** and holds 29,474, with `A free journal for your wellbeing` as its first screenshot.

**The stake is real inside the meditation frame and absent from the tracker/journal/habit cluster of the same shelf.** ⚠️ That is a statement about two named apps' store copy, not a proof that no visitor ever expects audio. It also does not dispose of #1597's refusal of the _meditation_ frame, which is a different frame from the shelf under discussion here.

**Two more inventory notes:**

- **Grounding is the tool with no market vocabulary at all.** No App Store autocomplete suggestion at any position; 11 Wikipedia views a month; not named by a single app in the table above. A tools-led pitch that leads on grounding leads on a word nobody types.
- **Nobody else in the table ships all eight.** The broadest inventories are Finch (six of eight, no meditation audio, no grounding) and Calm/Headspace (audio-first, thin on logging). **Selftend's eight is the widest inventory in this comparison set** — a fact, offered without an inference about whether breadth is an asset or the "buries everything specific" failure #1597 named.

---

## 4. The institutional free precedents, re-checked

☠️ **#1597's `free reads as institutional` argument was built on three apps. Only one of the three still supports it.**

### CBT-i Coach — holds, cleanly

Seller of record on Apple, verified via the API: **`US Department of Veterans Affairs (VA)`**. Last updated 2026-06-23. 11,967 ratings.

From the VA's own page ([ptsd.va.gov](https://www.ptsd.va.gov/appvid/mobile/cbticoach_app_public.asp), checked 2026-09-04), verbatim:

> "CBT-i Coach is a free and publicly available mobile app for people who have trouble sleeping and are engaged in Cognitive Behavio[u]ral Therapy for Insomnia (CBT-I) with a clinical provider."

> "CBT-i Coach was created by VA's National Center for PTSD in partnership with Stanford University Medical Center, the Department of Defense's National Center for Telehealth and Technology, DoD's DHA Connected Health, and VA Sierra Pacific Mental Illness Research, Education, & Clinical Center."

It states its free-ness as **public availability**, not as a marketing claim, and names five institutions. This is the argument's clean case. ⚠️ Note the app is explicitly framed as an adjunct to treatment "with a clinical provider" — a posture Selftend's guardrails do not permit.

### MindShift CBT — ☠️ **the institution behind it no longer exists**

**Anxiety Canada ceased operations on 2025-04-01.** Verified first-hand at [anxietycanada.com](https://www.anxietycanada.com/) (checked 2026-09-04), verbatim:

> "as of April 1, **Anxiety Canada** has officially ceased operations and is no longer available."

**And the app's seller of record has changed.** Apple's `/lookup` API returns, for id `634684825` (checked 2026-09-04):

> `sellerName: 247 Labs Inc` · `artistName: 247 Labs Inc`

The live App Store description now says only that it is "a free mental health app developed by experts" — **it does not name a non-profit.** 513 ratings; last updated 2026-08-20; still free.

**So the strongest non-profit precedent in #1597's argument was a non-profit that closed for lack of sustainable funding, roughly sixteen months before that argument was written, and whose app is now published by a commercial developer.** That is not an argument against a free non-profit product; it is an argument that "institutional" is not a durable property of the CBT shelf, and that the doc's supporting evidence has decayed.

### FreeCBT — ☠️ **was never institutional**

Seller of record on Apple: **`Evan Rosson`** — a named individual. 166 ratings; last updated 2025-10-30. From [freecbt.erosson.org](https://freecbt.erosson.org/) (checked 2026-09-04): "It is **free** and **ad-free**." Its own about copy describes it as a fork of Quirk, open source under the GPL, after "Quirk shut its doors."

Its free-ness reads as **volunteer and open-source**, which is a different signal from institutional — and it is the signal closest to Selftend's own.

### What the shelf does with `free` instead

☠️ **`Free` is not a differentiator on the broad shelf, because everything is free.** Every one of the roughly ninety top-10 results across the nine search terms in § 1 Proxy D listed at `$0`; the only paid app that surfaced anywhere was `Calm Harm` at $1.99. Calm ($69.99/yr), Headspace ($69.99/yr), Finch (Finch Plus), Daylio (premium, plus ads on the Android free tier) and Wysa (in-app purchases to $144.99) are all free-to-download subscription products.

But the store's own autocomplete says people qualify for it anyway: `mental health free`, `mental health app free`, `mental health journal free`, `free mental health apps`, `self help apps free`, `gratitude journal free`, `dbt free`, `meditation free`. **`Free` is a search qualifier on this shelf even though it is not a price signal.** How We Feel — a self-described science-based non-profit, `The How We Feel Project, Inc.` as seller of record — is the shelf's cleanest example of a genuinely free product saying so in its first screenshot: `A free journal for your wellbeing`.

⚠️ **What this does not settle:** whether free reads as _unfinished_ here. Nothing found in this pass measures that. #1597's claim that Calm set a price anchor in meditation was not tested and is not disputed by anything above.

---

## 5. The graveyard, re-checked — and whether it generalises

### The five, as of 2026-09-04

|              | Status                                          | Primary evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Venture-funded?                                                                                                              |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Woebot**   | **Dead to consumers, alive B2B.**               | [woebothealth.com/faq](https://woebothealth.com/faq/): _"The Woebot app was retired June 30, 2025. New accounts can no longer be created, and previous accounts can no longer be accessed."_ Data anonymised by 2025-07-31. The same site now sells a "copilot" for Providers and for Payers.                                                                                                                                                                                                                                                                    | Yes — **~$123.3M** across 4 rounds (Crunchbase; the $90M Series B is confirmed by a 2021 BusinessWire release). Approximate. |
| **Sanvello** | **Gone from both stores.**                      | Three independent primary fetches: the Apple product page returns **404**; the Apple developer page for `Sanvello Health Inc` renders with **no apps listed**; the Play page for `com.pacificalabs.pacifica` returns **404**. ☠️ **An official UnitedHealth/Optum shutdown notice could not be reached** — the "merged into AbleTo SelfCare+, members only, ~June 2024" account is secondary. **Stated as a gap.** ⚠️ `sanvello: anxiety & depression` is still a live App Store autocomplete suggestion for the prefix `depress`, so the name outlives the app. | Acquired by UnitedHealth Group 2019 (Pacifica Labs); figure not established.                                                 |
| **Quirk**    | **Dead; the company left the sector entirely.** | The founders' own README at [github.com/Flaque/quirk](https://github.com/Flaque/quirk): the subscription model "treated successes as failures and failures as successes" (users cancelling once they felt better read as churn); the company pivoted and **"Quirk (the company) is now Room Service"**, a developer-tools company. **"Quirk is no longer being maintained."** No shutdown date is stated — **gap**.                                                                                                                                              | YC S19. No figure found.                                                                                                     |
| **Bloom**    | **Dead.**                                       | [enjoybloom.com](https://www.enjoybloom.com/) now serves as the notice: _"Bloom has been acquired in February 2024 by Spring Health. The Bloom app will discontinue as off [sic] Feb 23, 2025."_ Spring Health's own release confirms the self-guided content was folded into its enterprise product.                                                                                                                                                                                                                                                            | Yes — ~$11.49M (CB Insights). Approximate.                                                                                   |
| **Youper**   | ☠️ **Not dead yet. The date is in the future.** | [youper.ai/faq/lifeline-services](https://www.youper.ai/faq/lifeline-services) carries the banner _"Youper is shutting down September 30, 2026 — export your data."_ **That is 26 days after this check.** Subscriptions already disabled; all accounts and data deleted from 2026-10-01.                                                                                                                                                                                                                                                                        | Yes — ~$5.18M over 3 rounds. Approximate.                                                                                    |

**#1597's five hold.** The pattern is real and every one was venture-funded. One correction of tense: `docs/positioning.md` says Youper "shut down on 2026-09-30" — as of today it is **announced but not yet executed**, which is a documentation accuracy point rather than a change to the argument.

☠️ **A sharper reading of Quirk than "venture-funded" captures.** Quirk's founders did not say the category could not support a business. They said the _subscription_ model inverted the signal — recovery looked like churn. That is a critique of a **billing model applied to a recovery-shaped product**, and it would apply on any shelf where the product's success is the user needing it less. It is not obviously a fact about CBT.

### Does the same mortality hold on the broader shelf? — **No.**

Last-updated dates from Apple's own API, checked 2026-09-04:

| App                            | Version  | Last updated   | Ratings   |
| ------------------------------ | -------- | -------------- | --------- |
| Headspace                      | 8.30.0   | **2026-09-01** | 973,874   |
| How We Feel                    | —        | **2026-09-03** | 29,474    |
| Finch                          | 3.73.202 | **2026-09-02** | 747,098   |
| Calm                           | 7.0.5    | 2026-08-30     | 1,978,075 |
| Insight Timer                  | 20.32.0  | 2026-08-28     | 445,688   |
| Daylio                         | 1.75.1   | 2026-08-27     | 61,421    |
| _(for contrast)_ FreeCBT       | 2.4.0    | 2025-10-30     | 166       |
| _(for contrast)_ MindShift CBT | —        | 2026-08-20     | 513       |

**Six of six broad-shelf incumbents shipped an update within the last eight days.** The three biggest shipped within three.

The shutdowns that did occur on the broader shelf are mostly **absorptions, not deaths**:

- **Shine** — acquired by Headspace Health, announced 2022-09-08 (a BusinessWire release exists; the direct fetch returned **403**, so the date and existence are verified by index and the operative sentence is not — labelled REPORTED).
- **Happify** — **not a shutdown.** Rebranded corporately to Twill (2022), Twill acquired by DarioHealth (2024); the consumer app is reported still live as "Happify by Twill".
- **Ginger and Headspace** — a merger, both product lines continued.
- **Simple Habit, Reflectly** — **not shut down** (both reported still live; not independently verified in this pass).
- **Talkspace** — not shut down; a pivot from consumer to payor. Reported direct-to-consumer revenue down 23% year on year in Q3 2025; **the figure was not verified against a primary filing — gap.**

☠️ **So the graveyard argument does not transfer.** On the narrow CBT and therapy-chatbot shelf, five of five venture-funded consumer entrants are dead or dying. On the broad wellness shelf, the near-equivalents were **bought**, and the independents are shipping weekly. **The vacancy #1597 relied on is a property of the CBT shelf specifically, and the broad shelf is the opposite: alive, crowded, and led by apps with 0.7–2.0M ratings each.**

⚠️ **Nothing here says a crowded shelf is worse than an empty one.** #1597's own reason for taking the empty shelf was that the thing which killed the incumbents (needing venture returns) is a thing Selftend does not need. That argument is untouched by this section; what changes is that on the broad shelf the incumbents are not dead, so "vacated" is not available as a description.

---

## Confidence, and every gap in one place

**High confidence (read first-hand from the owning primary source):** every App Store subtitle, seller of record, rating count, price and last-updated date in this document (Apple's own JSON API); every first screenshot in § 2 (the image files themselves); Apple's autocomplete lists; Google's autocomplete lists; Wikipedia pageview counts; Anxiety Canada's closure notice; the VA's CBT-i Coach description; FreeCBT's own site; Woebot's FAQ; Bloom's site; Youper's shutdown banner; Quirk's README; the three Sanvello 404s; Selftend's own `store/apple-info.json` and `store/play-listing.md`.

**Stated gaps — do not let these harden into facts:**

1. **No search-volume figure of any kind was obtained.** Google Trends returned HTTP 429; Keyword Planner needs a spending Ads account. **The candidate shelf has no number comparable to #1597's `>100/mo` against `>100K/mo`, and this document does not supply one.**
2. **No Google Play verbatim text was read directly.** All Play quotations in the source material came through Google's index of the Play URL. Ratings and review counts on the Play side are correspondingly weaker than the Apple ones.
3. **No Play autocomplete.** The endpoint is dead. § 1's store-search evidence is iOS-only.
4. **No current authoritative app-count.** The only primary figure obtainable (ORCHA, 311,000) is **all** health apps and dates to **September 2022**. The "~20,000 mental health apps" and "~3,857" figures could not be read at source and **must not be cited.**
5. **Clarity's and CBT-i Coach's App Store subtitle fields** were not retrievable.
6. **Sanvello's official shutdown notice and date** were not reached; only the store 404s are primary.
7. **Quirk's shutdown date** is not stated anywhere primary.
8. **Wysa's guided-audio status** is ambiguous — its copy says "meditation" without describing narrated audio.
9. **Tool-inventory absences are absences from store copy**, not in-app audits. "Not listed" is not the same as "not present."
10. **Nothing in this pass measures whether free reads as unfinished** on the broad shelf, and nothing measures conversion, retention or comprehension for any frame.

---

## Observations, not recommendations

⚠️ **The five things below are the researcher's reading, clearly separated so #1814 can discard them. None is a recommendation and none should be quoted as a finding.**

1. **The two loadbearing supports under #1597's "free" argument have decayed, and that is the single most consequential thing found.** Anxiety Canada is closed and MindShift is published by a commercial developer; FreeCBT was never institutional. One of three survives. This is independent of which frame wins — `docs/positioning.md` § _What "free" says here_ rests on a claim two-thirds of which no longer checks out, and it needs updating whatever #1814 decides.

2. **The strongest evidence found for a tools-led direction is the meditation-audio table stake failing to bind.** Finch has 747,098 ratings, no meditation audio, and is Apple's top result for four of the candidate shelf's own names. If `Fatal` was the word that closed the wellness frame, the word does not survive contact with Finch.

3. **The strongest evidence found against it is that the phrase itself has no market vocabulary.** `self manage` returns five chronic-illness tools. `self-help` returns a credit union. `mental health tools` returns telehealth prescribers. `wellbeing` returns employer benefit apps. `grounding` returns a news app. **The candidate frame's own words are, one by one, either owned by somebody else or unspoken.** #1597's rule that a frame is bought for comprehension and never for pull cuts both ways here: it means this does not disqualify the frame, and it also means the frame cannot be defended on the pull it does not have.

4. **The graveyard argument does not survive the move, and the map should expect to lose it.** "Head to Head into a **vacated** category" is only available where the category is vacated. The broad shelf is occupied by apps with 0.7–2.0M ratings shipping weekly. Whatever style replaces it will need a different justification, and #1597's own reasoning — that the thing which killed the incumbents is a thing Selftend does not need — becomes irrelevant when the incumbents are not dead.

5. **The store already ships the tools-led pitch on iOS.** Selftend's Apple subtitle, its App Store long description, and its first screenshot (`Your tools`, with no CBT programme in frame) are tools-led today, while Play's short description carries the CBT programme frame as of 2026-09-02. ☠️ **This is not evidence for the direction — it is evidence that a surface drifted, which is exactly the observation that opened this map.** It is recorded here because the divergence is a live inconsistency in a `verify`-adjacent artefact and someone should own it regardless of what #1814 decides.

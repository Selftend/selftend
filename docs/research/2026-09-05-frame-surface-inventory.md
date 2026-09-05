---
title: Every surface that says what Selftend is, as of dev today — its text, its gate, and the test that pins it
date: 2026-09-05
ticket: "#2006 (map #2003)"
branch: research/2006-frame-surface-inventory — throwaway, never merged
sources:
  - origin/dev @ eceef15d (2026-09-05), read with `git show origin/dev:<path>` / `git grep … origin/dev`
  - origin/main @ 56476011 = tag v0.17.0 (2026-08-28), 143 commits behind dev
  - live selftend.org (index.html head, bundle index-a6f02574ddb13e1e4ea245092bf9d7c6.js, manifest.webmanifest), read 2026-09-05 over plain HTTP
  - https://apps.apple.com/app/id6796318929, https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend, https://peerpush.com/p/selftend, https://alternativeto.net/software/selftend/about/ — read 2026-09-05
  - `gh api repos/Selftend/selftend` (description/homepage/topics), 2026-09-05
  - issues #1601 (prior inventory), #1822 (before-capture), #1882, #1946, #1965, #1973, #1999, #1901, #1957, #1760, #1789
  - docs/positioning.md § 3 and § What binds this document (origin/dev)
  - test/positioning-copy.test.ts, test/release-thread-renderer.test.ts, test/store-info-invariants.test.ts, test/store-listing-drift.test.ts, src/features/policies/policy-content.test.ts (origin/dev)
---

# Every surface that says what Selftend is, as of dev today

> ☠️ **This file quotes the banned compound and other retired phrasings as a record.** It lives on a throwaway `research/` branch on purpose. If it ever needs to land on `dev`, `docs/research/` is inside `test/positioning-copy.test.ts`'s prose corpus, so the file would have to be added to `PUBLISHED_RECORDS` first — do not "fix" the quotes.

Re-take of [#1601](https://github.com/Selftend/selftend/issues/1601) (2026-08-31) against `origin/dev` and the live remotes, for [#2006](https://github.com/Selftend/selftend/issues/2006). One row per surface: what it says, where it is, which of `docs/positioning.md`'s five gates can reach it, which test (if any) pins the text, and whether moving it is a code change or a hand edit.

**Gate vocabulary** (from `docs/positioning.md` § *What binds this document*, lines 399-409): **merge gate** = fails `verify` on the PR; **weekly alarm** = `.github/workflows/store-metadata-drift.yml`, Mondays 06:23 UTC, not a required check; **diff-only** = a committed mirror with a date line and no remote verification; **human habit** = the list in that table plus `.github/pull_request_template.md:22`.

**"Pinned" vocabulary.** Two different things are called a pin below and they behave differently on a rewrite:

- a **text pin** asserts the exact string (goes red when the copy changes — the rewrite PR must update it in the same change);
- a **ban scan** asserts the copy contains none of the 37 banned patterns (goes red only if the *new* copy trips a rule; it never notices a rewording).

## 1. The table

### 1.1 In-repo, user-facing (copy a person reads inside the product)

| # | Surface | Current text on `dev` (verbatim) | Path:line | Gate | Test pin | Change |
|---|---|---|---|---|---|---|
| 1 | Web landing hero — headline | "Small tools for heavy days." | `src/i18n/locales/en/auth.json:170` `landingPage.heroHeadline`; bg `:170` "Малки инструменти за тежки дни." | merge gate (ban scan) | **text pin**: `src/components/app/landing/landing-screen.test.tsx:41`; e2e `test/e2e/landing-page.e2e.test.ts:17`, `account-deletion.e2e.test.ts:80`, `draft-lifecycle.e2e.test.ts:64`, `sign-out.e2e.test.ts:21` (all assert the h1 name) | code |
| 2 | Web landing hero — support line (the frame carrier on the web) | "A free, private CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it. No ads, no subscriptions." | `en/auth.json:171` `landingPage.heroSupport`; bg `:171` "Безплатна, лична КПТ програма - когнитивно-поведенческа терапия - с ежедневни инструменти за дните, в които нямаш сили за нея. Без реклами, без абонаменти." Rendered by `src/components/app/landing/landing-screen.tsx:86` | merge gate (ban scan) | **text pin**: `landing-screen.test.tsx:57` (full string, en) | code |
| 3 | Web landing hero — eyebrow | "Free · Open source · Private" | `en/auth.json:169` `landingPage.heroEyebrow`; bg `:169` | merge gate (ban scan) | none | code |
| 4 | App-shell auth landing subtitle (**native only** — `app/index.tsx` sends web to `LandingScreen`, #1822) | "A free, private CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it." | `en/auth.json:166` `landing.subtitle`; bg `:166`. Rendered by `src/components/app/auth-landing-block.tsx:28` | merge gate (ban scan) | none on the subtitle itself (`auth-landing-block.test.tsx` pins only the safety line, row 6) | code |
| 5 | Onboarding wizard, panel 1 (post-threshold — the doc says it owes no category) | "Work through something, or just do one small thing today. Modules - CBT or ACT - take you step by step; eight everyday tools take a few minutes and ask nothing of you. Star what you use to keep it on Home." | `en/settings.json:46` `onboarding.appBody1`; bg `:46`. Rendered by `src/components/app/app-onboarding-wizard.tsx:80` | merge gate (ban scan) | none | code |
| 6 | Safety line (auth landing, landing footer, safety callout) — **exempt as a class** (positioning.md:345, #1957 open) | "Selftend is a CBT programme for when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders." | `en/common.json:62` `safety.description`; bg `:62` "Selftend е КПТ програма за моменти, в които има време и безопасност за размисъл. …". Rendered by `auth-landing-block.tsx:34`, `landing/landing-footer.tsx:27`, `safety-callout.tsx:25` | merge gate (ban scan) | **text pin** ×2: `auth-landing-block.test.tsx:52`, `landing/landing-footer.test.tsx:52` | code — owner call on #1957 |
| 7 | Settings → Legal, product boundary — exempt as a class | "This app is a CBT programme for your own use. It does not diagnose, prescribe, replace therapy, or act as emergency support." | `en/settings.json:183` `legal.productBoundaryDescription`; bg `:163`. Rendered by `app/(app)/legal.tsx:45` | merge gate (ban scan) | none | code — #1957 |
| 8 | Terms — page description | "Terms of service for Selftend, a free, private CBT programme." | `en/policies.json:187` `terms.pageDescription`; bg `:187`. `app/terms.tsx:14` | merge gate (ban scan) | none (outside the consent digest) | code — #1957 |
| 9 | Terms §3 — product scope (consent-bearing) | "Selftend is a CBT programme you work through on your own. It is not therapy, medical care, diagnosis, treatment, crisis intervention, or emergency support." | `en/policies.json:208`; bg `:208` | merge gate (ban scan) | **digest pin**: `src/features/policies/policy-content.test.ts:195-198` (`englishDigest` over the consent-bearing sections; a rewording moves the digest, a disclosure change moves the version too) | code — #1957, owner call |
| 10 | Terms §5 — acceptable use (consent-bearing) | "Use the app for its intended purpose: your own reflection and the CBT programme." | `en/policies.json:225`; bg `:225` | merge gate (ban scan) | **digest pin**: `policy-content.test.ts:195-198` | code — #1957, owner call |
| 11 | FAQ "Is Selftend therapy?" | "No. Selftend is a CBT programme you work through on your own, with no practitioner involved. It is not therapy, counselling, diagnosis, treatment, or a substitute for a licensed mental health professional. …" | `en/policies.json:417`; bg `:417` | merge gate (ban scan) | none (faq is outside the digest, positioning.md:425) | code — #1957 |
| 12 | FAQ — the "why no AI" / what-it-is answer | "Selftend is a free, non-profit CBT programme that a person works through on their own: thought records, mood and habit tracking, breathing, grounding, gratitude, meditation and short lessons. There is no therapist, no counsellor, and no AI pretending to be either. …" | `en/policies.json:471`; bg `:471` | merge gate (ban scan) | none | code — #1957 |
| 13 | Privacy policy §1 | No longer names a category — opens "This is the short version, in plain words. …" (rewritten by #1616) | `en/policies.json:14` | merge gate (ban scan) | digest pin (consent-bearing) | n/a — nothing to move |
| 14 | `public/index.html` — `<meta name="description">`, `og:description`, `twitter:description` | "A free, private CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it. Open source, no ads, no subscriptions." | `public/index.html:38-41`, `:45-48`, `:55-58` | merge gate (ban scan — `USER_FACING`, `test/positioning-copy.test.ts:73`) | none on the text (`test/theme-web-surfaces.test.ts` pins only `theme-color`) | code |
| 15 | `public/index.html` — `og:title`, `twitter:title` | "Selftend - a free, private CBT programme" | `public/index.html:44`, `:54` | merge gate (ban scan) | none | code |
| 16 | PWA manifest description — **the third shape** (#1789 open) | "A free, private CBT programme with calm everyday tools." | `public/manifest.webmanifest:4` | merge gate (ban scan — `positioning-copy.test.ts:72`) | none on the text (`theme-web-surfaces.test.ts:25` reads the file for colours only) | code |

**Bulgarian twins.** Every en row above has a bg twin at the same key (`bg/auth.json:166,170,171`; `bg/settings.json:46,163`; `bg/common.json:62`; `bg/policies.json:187,208,225,417,471`). `src/i18n/locale-parity.test.ts` fails on a key present in one locale and missing in the other, and the copy gate carries three bg rules (`positioning-copy.test.ts:257-268`), so the bg strings move in the same PR as the en ones. There is **no** bg store listing (the App Store is en-US only, #1822).

### 1.2 In-repo, contributor-facing prose that declares the category

| # | Surface | Current text (verbatim) | Path:line | Gate | Test pin | Change |
|---|---|---|---|---|---|---|
| 17 | README — headline | "**A free, open-source cognitive behavioural therapy (CBT) self-help app for web, iOS, and Android.**" | `README.md:7` | merge gate (ban scan — `ALL_SURFACES`, `positioning-copy.test.ts:169`) | none | code |
| 18 | README — opening paragraph | "Selftend is a private CBT self-help app: everyday tools for right now, and a programme to work through when you want one. The current working slice pairs two evidence-based modules - … It has no ads, subscriptions, or paywalls." | `README.md:9` | merge gate (ban scan) | none | code |
| 19 | README — boundary line | "Selftend is a CBT self-help app you run yourself - not therapy, diagnosis, or crisis support. …" | `README.md:13` | merge gate (ban scan) | none | code |
| 20 | CONTEXT.md — preamble | "The shared glossary for Selftend, a free, private CBT self-help app." | `CONTEXT.md:3` | merge gate (ban scan — `positioning-copy.test.ts:170`; scope `all`, so the glossary may not spell the compound, `:206-212`) | none | code |
| 21 | CONTEXT.md — the positioning vocabulary entry | "**CBT self-help app**: What Selftend is, in the words it says so in. _Cognitive behavioural therapy_ — spelled out on first use on a surface, then **CBT** — run by the person using it, with no practitioner involved. The method sits **inside** the noun deliberately …" + the *Avoid* line | `CONTEXT.md:9-14` | merge gate (ban scan) | none | code |
| 22 | `docs/product-principles.md` line 3 (the one "description-rank" paragraph, #1820) | "Selftend is a free, private cognitive behavioural therapy (CBT) self-help app, run by the person using it. It should make support more available without becoming a paid trap, ad funnel, engagement game, diagnosis engine, or therapist replacement." | `docs/product-principles.md:3` | merge gate (ban scan — `positioning-copy.test.ts:171`, and again as prose) | none | code |
| 23 | `docs/positioning.md` § *The frame sentence* | "**Selftend is a free, private CBT self-help app** — cognitive behavioural therapy — **with everyday tools for right now and a programme to work through when you want one.**" | `docs/positioning.md:278` | **excluded** from the copy gate (`positioning-copy.test.ts:130`, `:161-166`); reached only through the renderer pin | **text pin** (dash-normalised): `test/release-thread-renderer.test.ts:95-97` — see § 3 | code |
| 24 | `docs/positioning.md` § *The short form* | "**A private CBT self-help app.**" (28 chars, built to the 30-char subtitle cap) | `docs/positioning.md:288` | excluded from the copy gate | none — no constant carries it | code |
| 25 | `docs/positioning.md` § *Approved supporting lines* (5) | 1 "Eight everyday tools that ask nothing of you — not even an account. Open one, use it, and you're done." · 2 "Work through something, don't just track how you feel." · 3 "Anything you write for an audience stops being useful to you. Yours is encrypted at rest, the key is held outside the database, the source is public, and no AI is reading it." · 4 "You run it yourself — nothing to be assigned, nobody to wait for." · 5 "Free because it is a non-profit, not because it is a trial. Your data exports whenever you want, and the source is public." | `docs/positioning.md:355-363` | excluded from the copy gate | **text pin**: `release-thread-renderer.test.ts:99-103`, `:115-126` | code |
| 26 | Release-thread renderer constants (what lands in every `reddit-draft` issue and, once posted, on r/Selftend) | `FRAME_SENTENCE` = "Selftend is a free, private CBT self-help app - cognitive behavioural therapy - with everyday tools for right now and a programme to work through when you want one." · `SUPPORTING_LINES` = the five lines above, hyphenated | `scripts/release-thread/renderer.mjs:99-100` (frame), `:108-126` (lines), `:129-131` (rotation) | merge gate — pinned to the doc, **and** the renderer test's own ban scan (`release-thread-renderer.test.ts:376-438`), because `scripts/` is outside the copy gate | see § 3 | code |
| 27 | Claude Design brief | quotes the frame sentence and short form verbatim, and the support line hyphenated | `docs/design/1825-handoff/prompt.md:22`, `:26`, `:30`, `:77` | excluded (`PUBLISHED_RECORDS`, `positioning-copy.test.ts:136`) | none | code (a record — update or supersede, do not silently rewrite) |
| 28 | Marketing plan — square 2 message | "square 2 says _a CBT self-help app_" (`:134`); draft ad "_The same thought going round again? Write it down and test it — eight everyday tools and a CBT programme when you want one. No account needed._" (`:172`) | `docs/marketing-plan.md:134`, `:172` | prose scan (compound rule only) | none | code |
| 29 | Reddit community doc | "The community description line is the one #1946 tracks." — no text of its own | `docs/reddit-community.md:57` | prose scan | none | code (docs follow-up once the sidebar is pasted) |

### 1.3 In-repo, store mirrors and launch material

| # | Surface | Current text (verbatim) | Path:line | Gate | Test pin | Change |
|---|---|---|---|---|---|---|
| 30 | App Store subtitle, committed mirror — **still the banned compound** (#1760 open) | "Calm, guided self-help tools" | `store/apple-info.json:2` | weekly alarm (compares this file to ASC `en-US`, `store-metadata-drift.yml:206-208` → `scripts/check-store-listing-drift.mjs`). **No merge gate scans `store/` for phrasing** (positioning.md:349) | `test/store-info-invariants.test.ts:38-41` caps only (subtitle ≤ 30, promoText ≤ 170; `:45` exactly these two keys). ⚠️ `test/store-listing-drift.test.ts:19` carries the same string as a **fixture** — it does not read the file and does not pin it | file edit **+** ASC hand edit; the subtitle is version-scoped and rides a release (#1760). Editing the file before ASC changes turns the Monday alarm red by design |
| 31 | App Store promoText, committed mirror | "Free and open source. Journalling, CBT thought records, mood and sleep tracking, breathing and grounding - the tools are yours to pick from, at whatever pace suits you." (168/170) | `store/apple-info.json:3` | weekly alarm | `store-info-invariants.test.ts:40` cap | file + ASC hand edit |
| 32 | Play listing, committed mirror | Short: "Free, private mental health tools." (34/80). Full ¶1: "Selftend is a set of free, private mental health tools — everyday tools for right now, and a CBT programme — cognitive behavioural therapy — to work through when you want one. A small set of calm, private tools in one place: no ads, no feeds, no pressure, no AI coach." | `store/play-listing.md:27`, `:31` (date line `:3`, divergence note `:7`) | diff-only | none (`play-listing` is referenced by no test) | hand edit in Play Console, mirrored by PR. ⚠️ `:3` is stale — see row 42 |
| 33 | Play feature graphic source — **banned compound, in the artwork** | `<h1>Calm, guided <span class="accent">self-help</span></h1>` | `docs/launch/play-listing/feature-graphic.html:126` → `feature-graphic.png` (the same artwork is live in the Console, `store/play-listing.md:96`) | none — an image; `docs/launch/` is a published record (`positioning-copy.test.ts:137`) | none | re-render + Console asset upload + one Play review; text depends on #2007's short form |
| 34 | Reddit "Android testers" banner source — banned compound | `<h1>Calm, guided self-help — <span class="accent">looking for Android testers</span></h1>` | `docs/launch/reddit-post/banner.html:126` → `banner-hero.png` (posted to r/Selftend in July; the post is login-walled to anonymous reads) | none — published record | none | historical asset; nothing to move unless the post is deleted |
| 35 | Reddit closed-testing post draft | "Selftend — a free, open-source self-help and wellness app: guided CBT-style thought records, mood check-ins, breathing, journaling, gratitude, and habits." | `docs/launch/reddit-post-android-closed-testing.md:30` | none — published record (already posted) | none | historical |
| 36 | The seven Reddit promotion drafts (#1901 open) | "a free, non-profit mental well-being toolkit" (`:168`), "a modular mental well-being toolkit" (`:245`), "a set of small self-help tools" (`:112`), bg "безплатно приложение за психично благосъстояние" (`:263`) | `docs/launch/reddit-promotion-package.md:104-265` | **none** — ungated drafts inside the `docs/launch/` exclusion (#1901's finding) | none | code (rewrite) — r/bulgaria first, window 2026-10-15 |
| 37 | `docs/android-closed-testing.md` | ⚠️ No longer reproduces any listing text — only "Because this is a mental-health/wellness app…" (`:69`). The `PUBLISHED_RECORDS` comment (`positioning-copy.test.ts:108-112`) and positioning.md:443 describe a mirror that is no longer there; the exclusion is now a leftover, and `:861` does not assert it | `docs/android-closed-testing.md` | excluded | none | tidy-up, not a surface |

### 1.4 Off-repo, live (read 2026-09-05)

| # | Surface | Live text (verbatim) | URL | Gate | Test pin | Change |
|---|---|---|---|---|---|---|
| 38 | **selftend.org** — served bundle. Same bundle hash as #1822's 9/4 read (`index-a6f02574ddb13e1e4ea245092bf9d7c6.js`), so the web has **not** been redeployed | hero support: "Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions." · auth subtitle: "Calm, guided self-help tools for personal reflection." · plus the nine other strings in § 2 | https://selftend.org (web-deploy.yml deploys `main`; `main` = v0.17.0 still carries all of them) | merge gate on `dev`; a **release** is what moves it | (dev) as rows 1-16 | release from `main` |
| 39 | selftend.org `<head>` | `<title>` only — no description, no `og:*`, no `twitter:*` (confirmed live) | https://selftend.org | — | — | release (dev's `index.html:38-59` is undeployed) |
| 40 | selftend.org manifest | `"description": "Calm guided self-help and private reflection."` | https://selftend.org/manifest.webmanifest | — | — | release |
| 41 | **App Store** (v0.15.0, 19 Aug — still behind Play's 0.17.0) | subtitle: "Calm, guided self-help tools" · promo: "Free and open source. Journalling, CBT thought records, … at whatever pace suits you." · description ¶1: "Selftend is a calm, free set of guided self-help tools for personal reflection." ¶2: "It is not a therapist and not a diagnosis engine. It is a place to write things down, notice patterns, and work through them with structured exercises drawn from CBT and ACT." · 13+ · Health & Fitness · EN, BG | https://apps.apple.com/app/id6796318929 | weekly alarm (subtitle + promoText only; description and keywords are not mirrored, `store/README.md:15`) | none | ASC hand edit; subtitle rides a release (#1760) |
| 42 | **Google Play** — ☠️ the 2026-09-05 review has **cleared**: the public page already serves the new text ("Free, private mental health tools." ×7 in the HTML, the ¶1 above verbatim, "Updated on Aug 28, 2026" = v0.17.0). `store/play-listing.md:3` ("still shows the 2026-09-02 text until that review clears") is stale as of this read | Short: "Free, private mental health tools." · ¶1 as row 32 · "Selftend is for adults (18+)." still live (#1771's) · Health & Fitness | https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend | diff-only | none | hand edit (Console); move `play-listing.md:3` forward |
| 43 | **PeerPush** — public page, readable (no queue banner in the HTML I fetched; "Coming soon" ×4 as a status string, no "Not Verified" string found — the badge #1999 saw may be rendered client-side) | `<title>Selftend - Free, private mental health tools</title>` · meta: "Selftend is a set of free, private mental health tools — everyday tools for right now, and a CBT programme — cognitive behavioural therapy — to work…" · body = the Play full description + "It runs in the browser and as an iOS and Android app." + the "You can be honest here" paragraph · 18+ line present | https://peerpush.com/p/selftend | human habit | none | hand edit (owner-editable) |
| 44 | **AlternativeTo** — **banned compound ×2, refused frame in the tags** (#1882 open, `ready-for-human`) | tagline: "Free, open-source guided self-help: CBT and ACT exercises plus everyday wellbeing tools like mood check-in, journal, breathing, and habits." · description: "Selftend is a free, open-source, non-profit self-help app. It offers guided CBT and ACT exercises … alongside eight everyday tools: …" … "Selftend is guided self-help, not therapy, diagnosis, or crisis support. Available on the web, Android, and iOS, in English and Bulgarian." · Category Sport & Health · Tags `Mental health tracking`, `guided-meditation` · Feature `Habit Tracker` · alternatives Pixy (discontinued), How We Feel, Daylio, Stoic, Bearable, Mooditude | https://alternativeto.net/software/selftend/about/ (the root URL renders only the alternatives list; the site is behind a Cloudflare challenge for plain HTTP — read via WebFetch) | human habit | none | hand edit (owner claim; alternatives are crowd-sourced) |
| 45 | **GitHub repo metadata** — carries the **#1597 frame with the tail #1817 repealed** | description: "A free, open-source CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it. Web, iOS and Android. No ads, no subscriptions." · homepage: https://selftend.org · topics: agpl, cbt, expo, mental-health, privacy, react-native, self-help, supabase, typescript | `gh api repos/Selftend/selftend` | human habit (`pull_request_template.md:22`) | none | hand edit — agent-doable: `gh api -X PATCH repos/Selftend/selftend -f description=…`; `gh api -X PUT repos/Selftend/selftend/topics` |
| 46 | **YouTube channel About** — hand-replaced 2026-09-05 (#1965) with the **doc's** frame, so it now disagrees with Play/PeerPush | "Selftend is a free, private CBT self-help app — cognitive behavioural therapy — with everyday tools for right now and a programme to work through when you want one. You choose the parts you want, and reminders only exist if you ask for them. … Selftend is a self-help app for your own use — not therapy, diagnosis, or crisis support. … Free because it is a non-profit, not because it is a trial. …" (per #1965's applied text; the page is behind YouTube's consent wall for anonymous reads from BG — **needs owner browser read to re-verify**) | https://www.youtube.com/@Selftend | human habit | none | hand edit (Studio; agent-doable in the owner's Chrome) |
| 47 | YouTube — 10 public video descriptions | boundary line now "Selftend is a self-help app for your own use — not therapy, diagnosis, or crisis support." (11/11 applied 2026-09-05, #1965) | Studio | human habit | none | done for this frame; no category noun in the line |
| 48 | YouTube — 8 walkthrough **narrations** (audio + captions) and 15 **unlisted** descriptions | narration line `*-91`: "And a boundary worth naming: Selftend is guided self-help — not therapy, diagnosis, or crisis support." (`docs/campaign/scripts/{act,breathing-grounding-meditation,cbt,getting-started,habits,mood-journal-gratitude,reminders-widgets,routines}.md`, the `-91` rows); unlisted descriptions still carry "Selftend is guided self-help — …" | Studio | none (audio) | scripts are excluded records; `positioning-copy.test.ts:861` asserts `cbt.md` still contains the phrase | owner: regenerate, re-render, re-upload (#1965 step 3-4); then the repo follow-up |
| 49 | **r/Selftend sidebar** (description + sidebar fields) | measured from Reddit JSON on 2026-09-05 by #1946: "A free, open-source mental well-being app where people who use the app, build it, or simply care about tending to their mental health hang out." — the *mental well-being* frame, no compound. Anonymous reads return a login wall today (www: 403; old.reddit: "Welcome to Reddit"), so **needs owner browser read** to confirm whether the #1946 paste (mental-health-tools shape) has been applied — #1946 is closed but its last comment leaves the paste with the owner | https://old.reddit.com/r/Selftend/about/edit | human habit | none | owner paste (settings form is classifier-blocked for the agent) |
| 50 | r/Selftend intro post `1va9p0l` (the only Community Highlight) | edited by the agent 2026-09-05 to: "Selftend is a set of free, private mental health tools - everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want one. Today that means check-ins, a CBT toolkit (…), ACT tools, grounding, a sleep diary, meditation and breathing, a gratitude log, journalling, habits, and routines." (#1946, #1999) — login-walled to anonymous reads | https://www.reddit.com/r/Selftend/comments/1va9p0l/ | human habit | none | done for the current frame |
| 51 | The v0.17.0 release-thread draft (**open**, `ready-for-human`, `reddit-draft`) | body opens with the renderer's `FRAME_SENTENCE` ("…a free, private CBT self-help app…") + supporting line 3 (honesty) | https://github.com/Selftend/selftend/issues/1973 | merge gate on the renderer; the issue itself is a snapshot | none | if posted before the renderer follows, it posts the doc's frame; `release-thread.yml` replaces an **open** draft's body in place on `workflow_dispatch` for the same tag, so it can be regenerated after the constants change — or closed without posting |
| 52 | awesome-mental-health PR #90 (open, unmerged) | "Selftend is a free, open-source, non-profit self-help app: guided CBT and ACT exercises (…) plus everyday tools - …" | https://github.com/dreamingechoes/awesome-mental-health/pull/90 | none | none | hand edit on the fork; no banned compound (the intervening-word rule needs `self-help` after `guided …`, and it is not there) |
| 53 | App Store Connect review notes (already sent for build 6) | "Selftend is a free, non-profit, open-source **wellness and guided self-help** app…" (×5) | `docs/app-store-review-information.md:59,138,162,212,226` | excluded record (`positioning-copy.test.ts:131`); its own line 84 forbids syncing it until a build under review carries the change | `:861` asserts it still contains the phrase | hand edit in ASC at the next submission, then the record |

Not read, and why: the App Store **keywords** field (hidden; ASC only) — unchanged since #1601. The **r/Selftend sidebar** and the **YouTube About** as they stand this minute — both login/consent-walled to anonymous HTTP; the best records are #1946 and #1965. Discord's server description — not on the doc's list; not read.

## 2. Fact 1 — which surfaces still carry `guided self-help` live

**The 9/4 count of eleven is unchanged and is the web bundle's count.** `selftend.org` serves the same bundle #1822 grepped (`index-a6f02574ddb13e1e4ea245092bf9d7c6.js`), and it carries the English compound **11 times**:

1. `common:safety.description` — "Selftend is for guided self-help when there is time and safety to reflect. …"
2. `auth:landing.subtitle` — "Calm, guided self-help tools for personal reflection."
3. `auth:landingPage.heroSupport` — "Calm, guided self-help - CBT and ACT modules plus eight everyday tools. …"
4. `settings:onboarding.appBody1` — "Selftend is a place for guided self-help and private reflection: …"
5. `settings:supportPage.boundaryDescription` — "This app is built as guided self-help. …" (key removed on `dev`)
6. `settings:legal.productBoundaryDescription` — "This app is for wellness and guided self-help. …"
7. `policies:privacy.sections[0]` — "Selftend is a free, open-source wellness and guided self-help application …"
8. `policies:terms.pageDescription` — "Terms of service for Selftend, a free wellness and guided self-help product."
9. `policies:terms.sections[2]` — "Selftend is a wellness and guided self-help tool. …"
10. `policies:terms.sections[4]` — "Use the app for its intended purpose: personal wellness and guided self-help."
11. `policies:faq.sections[0]` — "No. Selftend is guided self-help. It is not therapy, counseling, …"

plus a **12th web occurrence outside the bundle**: the live `manifest.webmanifest` — "Calm guided self-help and private reflection." The same eleven strings (and their eleven Bulgarian twins, in two spellings) are in the native binaries, because `origin/main` = `v0.17.0` still has them (`git grep -c` on `v0.17.0`: `en/auth.json` 2, `common.json` 1, `policies.json` 5, `settings.json` 3, `manifest.webmanifest` 1).

**All twelve are fixed on `dev` and unreleased.** `git grep -i "guided self-help" origin/dev` returns **zero** hits in `src/i18n/`, `public/`, `README.md`, `CONTEXT.md`, `AGENTS.md` and `docs/product-principles.md`. (#1822's "nine fixed" undercounts the same set; its own table lists eleven `dev` replacements. The ticket's "nine" and "eleven" are both describing the web bundle.) On `dev` the compound survives in exactly one governed-adjacent file — **`store/apple-info.json:2`** — and otherwise only in excluded records (`docs/design/1822-before/`, `docs/campaign/scripts/`, `docs/app-store-review-information.md`, `docs/app-store-recording-script.md`, `docs/launch/`, `docs/design/1825-handoff/prompt.md`, `docs/positioning.md`) and in test fixtures/probes (`test/store-listing-drift.test.ts:19,59`, `test/positioning-copy.test.ts:273`, `test/release-thread-renderer.test.ts:383,442`).

**Live occurrences that no release fixes** (text, anonymously readable):

| Where | Count | What moves it |
|---|---|---|
| App Store subtitle + description ¶1 | 2 | ASC hand edit; subtitle rides a release (#1760) — `store/apple-info.json:2` follows |
| AlternativeTo tagline + description closing line | 2 | owner edit on the listing (#1882) |
| Play feature graphic (image, live in the Console) | 1 | new artwork + Console upload + review (`feature-graphic.html:126`) |

**Owner-readable only:** the 8 walkthrough narrations (audio) and 15 unlisted YouTube descriptions (#1965 steps 3-4); the July Android-testers banner image on r/Selftend, if that post still stands. **Confirmed gone (as of 2026-09-05):** the r/Selftend intro post (#1946), the YouTube About and all 10 public video descriptions (#1965), the Play short/full text (row 42), PeerPush, the GitHub description.

So the honest live count is: **web 12 (release-blocked), App Store 2, AlternativeTo 2, one image, plus the audio/unlisted tail** — and on `dev`, one file.

## 3. Fact 2 — exactly which tests go red when § *The frame sentence* changes

**Red, by construction — `test/release-thread-renderer.test.ts`:**

| Line | Assertion | What it compares |
|---|---|---|
| 68-72 `section()` | throws if `docs/positioning.md` has no `### The frame sentence` / `### Approved supporting lines` heading | heading text — renaming either section is itself a red |
| 78-82 `docFrameSentence()` | takes the **first `> ` block-quote line** of § The frame sentence, strips `**`, hyphenates dashes | the doc's line 278 |
| **95-97** | `expect(FRAME_SENTENCE).toBe(docFrameSentence())` | `scripts/release-thread/renderer.mjs:99-100` vs positioning.md:278 |
| 105-109 | no `— – → ← ⇒` in `FRAME_SENTENCE` or any supporting line | the constants (the doc may keep em dashes; `hyphenate()` at `renderer.mjs:167-169` maps them) |
| **111-113** | `expect(FRAME_SENTENCE).toMatch(/^Selftend is /)` | a new sentence that does not open "Selftend is …" fails **regardless** of the renderer following (#1880 §2: the subject is why no i18n key can source it) |
| 156-184, 186-201 | v0.16.0 / v0.11.1 render line-for-line | use the constant, so they follow automatically once `:95-97` is green |
| 271-286 | longest corpus submit URL `< 1800` bytes | a longer frame sentence pushes every URL up (#1942 predicted < 1700 at 164 chars); headroom is real but not infinite |
| **429-438** (with 382-407) | no rendered thread carries any of 18 banned patterns — incl. `guided … self-help` (one intervening word), a management verb over a health object, `no streak…`, `cognitive behavioral`, `behavior`, American spellings | **the only gate that scans the doc's frame sentence for banned phrases at all**, because the doc itself is excluded from `positioning-copy.test.ts` and the constant must equal the doc |

**Red if § *Approved supporting lines* changes too:** `:99-103` (the five texts, in the doc's order, parsed by the regex at `:89-92` — the list must keep the shape `- **N. <name> — <ROLE>:** "<text>"` with an em dash), `:115-126` (a line named exactly **"The tools"** must exist and be the one kept out of the rotation), `:137-152` (the rotation spreads 26 corpus tags within one of each other — holds for any count up to 26).

**Not red on the doc change, and why:**

- `test/positioning-copy.test.ts` — `docs/positioning.md` is excluded (`:130`, `:161-166`). It goes red only if the **copy surfaces** (rows 1-22) are rewritten into a banned pattern.
- `test/store-info-invariants.test.ts:38-41, 45, 57-59` — caps and key provenance on `store/apple-info.json` only. Red only if the new subtitle exceeds **30** or promoText **170** (the short form must fit 30; "A free, private CBT self-help app." at 34 could not, positioning.md:290).
- `test/store-listing-drift.test.ts:18-21` — `COMMITTED` is a **fixture**, not a read of the file; it stays green whatever the file says.
- `src/components/app/landing/landing-screen.test.tsx:57`, `auth-landing-block.test.tsx:52`, `landing/landing-footer.test.tsx:52`, the four e2e h1 pins — text pins on **i18n strings**, red only when rows 1, 2, 6 change (the code-surfaces PR, #2009).
- `src/features/policies/policy-content.test.ts:195-198` — red only if terms §3 / §5 (rows 9-10) change (#1957).

## 4. What moves together (to keep `verify` green)

**A. The doc rewrite (#2008) is one PR with the renderer:**

- `docs/positioning.md:278` (frame sentence), `:288` (short form), `:355-363` (five supporting lines, keeping the `- **N. name — ROLE:** "…"` shape and a line named "The tools")
- `scripts/release-thread/renderer.mjs:99-100` (`FRAME_SENTENCE`, hyphens only, opening "Selftend is ") and `:108-126` (`SUPPORTING_LINES`, same order, `role: "tools"` on the "The tools" line)
- the new strings must clear `test/release-thread-renderer.test.ts:382-407`'s ban list (note `no streak <noun>` and `behavior` are there) and keep the longest corpus URL under 1800 (`:284`)
- same PR, no test but same fact: `docs/design/1825-handoff/prompt.md:22,26,77`, `docs/marketing-plan.md:134,172`, and `docs/positioning.md:309`'s "62 of 80" (the Play short is 34 today)

**B. The code surfaces (#2009) are one PR with their text pins and twins:**

- `src/i18n/locales/{en,bg}/auth.json:166,171` ⇄ `landing-screen.test.tsx:57`; `:170` (headline) ⇄ `landing-screen.test.tsx:41` + the four e2e h1 pins, only if the headline moves
- `{en,bg}/common.json:62` ⇄ `auth-landing-block.test.tsx:52`, `landing-footer.test.tsx:52` — exempt-as-a-class copy; only if #1957 decides it moves
- `{en,bg}/settings.json` `onboarding.appBody1` (`en:46`, `bg:46`) and `legal.productBoundaryDescription` (`en:183`, `bg:163`) — no pin; post-threshold/exempt, optional
- `{en,bg}/policies.json:187,417,471` — no pin; `:208,225` ⇄ `policy-content.test.ts:195-198` `englishDigest` (rewording = digest-only move, the fifth; disclosure change = version bump too) — #1957, owner call
- `public/index.html:38-58` (5 meta values), `public/manifest.webmanifest:4`, `README.md:7,9,13`, `CONTEXT.md:3,9-14`, `docs/product-principles.md:3` — ban scan only; every bg key must exist (`src/i18n/locale-parity.test.ts`)
- `store/apple-info.json:2-3` — ≤ 30 / ≤ 170 (`store-info-invariants.test.ts:39-40`); ⚠️ land it in the same window as the ASC edit, or accept a red Monday alarm until the release that carries the subtitle (#1760) — `store/README.md` says which side is wrong is a decision, never a silence

**C. Hand edits (#2010), each with its repo echo:**

- ASC subtitle / promoText / description ¶1 → then `store/apple-info.json` (the alarm compares `en-US`)
- Play: text already live on the new frame → move `store/play-listing.md:3` forward on a re-read; feature graphic → `docs/launch/play-listing/feature-graphic.html:126` → new png → Console → review
- AlternativeTo tagline, description, tags (`Mental health tracking`, `guided-meditation`) — #1882
- GitHub `description` + `topics` (`gh api -X PATCH …`) — the only hand surface an agent can do from a terminal
- r/Selftend sidebar paste (#1946 block, mental-health-tools shape) → `docs/reddit-community.md:57`
- YouTube About: a second edit once the noun is decided (it was moved to the doc's frame on 9/5 and will disagree with the doc again after #2008); narrations + unlisted stay owner work (#1965)
- PeerPush already carries the Play text; edit only if #2007 changes the sentence
- #1973: regenerate via `release-thread.yml` `workflow_dispatch` (tag `v0.17.0`) after A lands, or close without posting; never post the stale sentence

**D. Records that must *not* be "fixed" when the above moves:** `docs/design/1822-before/`, `docs/campaign/scripts/`, `docs/app-store-review-information.md`, `docs/app-store-recording-script.md`, `docs/launch/`, `docs/design/1825-handoff/prompt.md` — all in `PUBLISHED_RECORDS`, and `positioning-copy.test.ts:861` asserts two of them still carry the compound. `docs/android-closed-testing.md` is in the list but no longer records anything (row 37) — a candidate for removal from the list, not a surface.

## 5. Things found on the way that are not this ticket's to fix

- `store/play-listing.md:3` says the public page still shows the 2026-09-02 text; it does not — the 9/5 text is public (row 42).
- The App Store still lists **v0.15.0 (19 Aug)** while Play is on 0.17.0 (28 Aug); the web bundle is the 20 Aug deploy. Three platforms, three builds, all pre-#1616.
- `docs/android-closed-testing.md` is excluded from the copy gate as "reproducing the live Play listing verbatim" and no longer does (row 37).
- The GitHub repo description still carries the #1597 tail ("for the days you cannot face it") that #1817 repealed (row 45).
- YouTube About was moved to the doc's frame on 9/5 (#1965), the same day the owner repositioned Play to a different one — so the third-party surfaces now split two ways (About and #1973 say *CBT self-help app*; Play, PeerPush and the intro post say *mental health tools*; AlternativeTo and the App Store say the retired compound; GitHub says the #1597 programme frame). Four frames on the ungated row, which is the row #1601 warned about.

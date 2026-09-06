# Reddit promotion package (#510)

Prepared 2026-08-19, the day after the iOS release gate cleared (0.14.1 live on the App Store
2026-08-18). Rules for every candidate subreddit were re-read on 2026-08-19 via Reddit's public
rules API; subscriber counts are from the same day. This file is the agent-assisted half of
[#510](https://github.com/Selftend/selftend/issues/510): research, verdicts, and ready-to-edit
drafts. Posting is always done by the owner (u/only_radar) in their own voice, one community
per day at most, with a fresh same-day read of the target sub's rules before each post.

## Links used in every draft

- Web: https://selftend.org
- Android: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend
- iOS: https://apps.apple.com/app/selftend/id6796318929
- Source: https://github.com/Selftend/selftend (AGPL-3.0)
- Walkthrough videos: https://www.youtube.com/@Selftend
- Home community: r/Selftend

## Copy rules (bind every post and comment)

1. First line discloses "I built this".
2. Free, open source, non-profit, no ads - state it plainly.
3. No em dashes anywhere; use "-".
4. No medical claims: Selftend is self-help, not therapy, not diagnosis, not treatment. Never
   imply outcomes.
5. Never pitch the absence of streaks - the guardrail stays, but it is not a selling point
   (owner decision 2026-07-24), and the phrasings are `verify`-banned in both languages.
   ⚠️ Worded this way rather than quoting them, so this file stays clean against the scan it
   is currently exempt from. Fine instead: "no pressure", "no penalty for missing a day",
   "no ads, no subscriptions".
6. Describe the meditation tool as **unguided sitting**; no book or brand claims, and no
   wording that implies a narrated session library (see rule 10).
7. Lead with the story or the value, not the link list.
8. Point people to r/Selftend as the home community (except where a sub forbids
   subreddit links).
9. ☠️ **A draft that says what Selftend _is_ takes the frame sentence from
   [positioning.md](../positioning.md), not a phrasing invented here.** These are pre-threshold
   surfaces - a reader meets them before crossing into the product - so § _Which surfaces carry
   it_ binds them. Because the drafts ban em dashes (rule 3), the shape to paste is the
   **hyphen form the app already ships** (`auth:landingPage.subtitle`), verbatim:

   > A set of free, private mental health tools: everyday tools for right now, and a CBT
   > programme - cognitive behavioural therapy - to work through when you want one.

   Bulgarian twin (`bg` `auth:landingPage.subtitle`), for draft 7:

   > Набор от безплатни, лични инструменти за психично здраве: ежедневни инструменти за момента
   > и КПТ програма - когнитивно-поведенческа терапия - по която да работиш, когато поискаш.

   Short form: **Private mental health tools.** / **Лични инструменти за психично здраве.**

10. ☠️ **Before posting, read [positioning.md](../positioning.md) § _Words never to use_ and
    check the draft against it.** `verify` reaches this file now (see the note under § _Drafts_),
    but for **row 1 only** - the prose corpus runs that one rule and no other - so the remaining
    five rows are still checked by eye alone. **The table is deliberately not copied here**: a
    cached list goes stale the next time positioning moves, which is how these drafts drifted in
    the first place - and quoting the banned strings verbatim would now turn the scan red on
    this file, which is no longer hypothetical
    ([#1901](https://github.com/Selftend/selftend/issues/1901)).

    What the six rows cover, so you know what you are checking for: the practitioner-implying
    compound built from _guided_ + _self-help_ (in either language, and it catches one
    intervening word); a management verb taking **your** + a health or condition object; the
    three over-claims about encryption; affirmative AI-practitioner framing; the AI capability
    claim; and the absence-of-streaks pitch. ⚠️ Under a **tools** noun the first of those is easy
    to walk into - a sentence pairing a management verb with this category noun is the one a
    good-faith writer reaches for first, and it is banned. _look after_, _take care of_ and
    _tend_ over the same objects are permitted, and so is _self-manage_.

## Cross-cutting risk: the 90/10 self-promotion guideline

Several subs (r/opensource, r/webdev, r/InternetIsBeautiful) lean on Reddit's site-wide
self-promotion guidance: roughly 9 in 10 of your contributions should not be your own product.
u/only_radar (created 2025-09-05, ~16 combined karma) has 9 lifetime posts and every one of
them promotes Selftend or WikiCanvas. That profile shape is exactly what "no promo-only
accounts" rules target.

Mitigation, not blocker: before and between promo posts, participate genuinely (comments,
answers, feedback on others' projects) in the target subs. The tester subs' test-for-test
threads are a natural place to bank real contributions. This also directly unblocks r/Android
(see below).

## Pre-flight checklist (before the first post)

- [x] r/Selftend sidebar "Get Selftend" button: add the App Store link and remove
      "iOS app coming soon" from the description. Done 2026-08-19 (description is now
      "Free and open source." with Web / Android / iOS buttons); re-verified live 2026-09-02.
- [x] r/Selftend intro post (reddit.com/r/Selftend/comments/1va9p0l/): update the
      "iOS coming soon" line to the live App Store link. Done 2026-08-19; re-verified live
      2026-09-02.
- [x] Owner profile: short bio naming Selftend + link to r/Selftend, so participate-only
      subs still convert curiosity without any promo post. Done 2026-08-20; re-verified
      2026-09-02.
- [ ] Re-read the target sub's rules the same day as each post (issue rule 1). This file's
      rule summaries are a 2026-08-19 snapshot, not permission.

## Verdicts at a glance

| Sub                    | Size | Verdict                 | Why (2026-08-19 rules read)                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| r/SideProject          | 812k | GO (first)              | Showcase sub, no formal rules returned                                                                                                                                                                                                                                                                                                                                                               |
| r/droidappshowcase     | 13k  | GO                      | The designated showcase sub r/androidapps points to; 1 app post/week, template encouraged, store link required                                                                                                                                                                                                                                                                                       |
| r/opensource           | 376k | GO                      | Self-promo allowed in moderation with `Promotional` flair; OSI license required - AGPL-3.0 qualifies; must engage in comments                                                                                                                                                                                                                                                                        |
| r/webdev               | 3.3M | GO (Saturday only)      | Showoff Saturday flair; "think project, not product" - technical framing; no commercial promotion                                                                                                                                                                                                                                                                                                    |
| r/reactnative          | 187k | GO with care            | "No self promotion" targets companies; individual OSS showcase is the sub norm - frame as a technical writeup, modmail if unsure                                                                                                                                                                                                                                                                     |
| r/OpenSourceApps       | 2.8k | GO after approval       | FOSS-only, official repo/store links only; sub is restricted - request posting access or modmail first                                                                                                                                                                                                                                                                                               |
| r/bulgaria             | 361k | GO with care            | Ads "generally forbidden" but mods allow clever/interesting posts that spark discussion; BG-language story post; removal risk accepted or modmail first                                                                                                                                                                                                                                              |
| r/AndroidAppTesters    | 9k   | Comment only            | Reciprocity home of the July tester post; update the existing thread, no new promo post                                                                                                                                                                                                                                                                                                              |
| r/TestersCommunity     | 19k  | Comment only            | Same July thread (21 comments); sub bans self-promo posts outside testing purposes                                                                                                                                                                                                                                                                                                                   |
| r/Android              | 3.2M | Deferred                | Rule 4 allows dev self-posts but requires reasonable posting history on r/Android - u/only_radar has none yet; participate first, revisit                                                                                                                                                                                                                                                            |
| r/AndroidClosedTesting | 37k  | Skip                    | #510's premise was wrong - the tester posts never went here; sub also bans links to other subreddits                                                                                                                                                                                                                                                                                                 |
| r/androidapps          | -    | Skip                    | Self-promo now banned outright; posts redirect to r/droidappshowcase                                                                                                                                                                                                                                                                                                                                 |
| r/InternetIsBeautiful  | -    | Skip (⚠️ premise moved) | Bans sites that require an email/account to fully experience - ☠️ true on 2026-08-19, **not true now**: anonymous sign-in went live in production 2026-09-02 (#1674), so a visitor reaches the tools with no email and no password. The **90/10** half stands untouched and is reason enough to keep skipping; the _disqualification_ is not. Re-read on the day before treating this row as settled |
| r/DecidingToBeBetter   | -    | Participate only        | Strictly no links, no app promotion, no exceptions                                                                                                                                                                                                                                                                                                                                                   |
| r/selfimprovement      | -    | Participate only        | No links; may not mention your app at all                                                                                                                                                                                                                                                                                                                                                            |
| r/getdisciplined       | -    | Participate only        | No links, permanent ban for shilling; also 200-karma gate                                                                                                                                                                                                                                                                                                                                            |
| r/NonZeroDay           | -    | Participate only        | "Posts advertising your productivity app will be removed"                                                                                                                                                                                                                                                                                                                                            |
| r/Habits               | 206k | Participate only        | "Spams from constant app promotions will be removed"; text-only sub; low upside vs risk                                                                                                                                                                                                                                                                                                              |
| r/CBT                  | -    | Participate only        | "Links to the app you developed... are not allowed"                                                                                                                                                                                                                                                                                                                                                  |
| r/dbtselfhelp          | -    | Participate only        | No solicitation/self-promo; Selftend's DBT screen is educational-only anyway                                                                                                                                                                                                                                                                                                                         |
| r/Meditation           | -    | Participate only        | Self-promo banned regardless of cost; feedback requests count as promo                                                                                                                                                                                                                                                                                                                               |
| r/Mindfulness          | -    | Participate only        | Self-promo, sales, recruitment prohibited                                                                                                                                                                                                                                                                                                                                                            |
| r/TheMindIlluminated   | -    | Participate only        | Questions-only sub; articles go through mod nomination                                                                                                                                                                                                                                                                                                                                               |
| r/journaling           | -    | Skip hard               | Pen-and-paper only; app promotion is a permanent ban                                                                                                                                                                                                                                                                                                                                                 |
| r/digitaljournaling    | 26k  | Participate only        | "You cannot promote one you've created", even in comments, even when asked                                                                                                                                                                                                                                                                                                                           |
| r/sleep                | -    | Participate only        | No commercial content, no links of any kind                                                                                                                                                                                                                                                                                                                                                          |
| r/GratitudeJournal     | -    | Dead lead               | Returns 404 (banned or gone)                                                                                                                                                                                                                                                                                                                                                                         |

Suggested order: r/SideProject -> r/droidappshowcase -> r/opensource -> r/webdev (first
Saturday) -> r/reactnative -> r/OpenSourceApps (once approved) -> r/bulgaria. Tester-sub
comments can land any day since they are comments, not posts. One sub per day at most.

## Drafts

Every draft is a starting point in the owner's voice - edit freely, keep the copy rules.

☠️☠️ **NOTHING BELOW WAS GATED, WHICH IS WHY THESE DRIFTED - AND ONE ROW IS GATED NOW** ([#1901](https://github.com/Selftend/selftend/issues/1901)). `docs/launch/` is in `test/positioning-copy.test.ts`'s `PUBLISHED_RECORDS` list, which is **excluded** from the prose scan - deliberately, because the directory is meant to hold records of what was already posted. Ready-to-post drafts living in the same directory inherited that exemption, so between 2026-08-19 and 2026-09-06 every draft here kept a category noun the product had retired **twice** ([#1813](https://github.com/Selftend/selftend/issues/1813), then [#2004](https://github.com/Selftend/selftend/issues/2004)) and `verify` stayed green throughout. **Settled on the [#2022](https://github.com/Selftend/selftend/issues/2022) precedent:** the exemption stands and this one file is carved back out of it by name (`READY_TO_POST_DRAFTS`), because a posted banner is finished - editing its source only makes the record lie - while a draft is inventory the repository invites you to rewrite. The banner and the July closed-testing thread beside it stay excluded. ⚠️ **The carve-out reaches row 1 and nothing else** - the prose corpus runs that single rule - so **rule 9 and rule 10 above are still the only thing standing between this file and a drift on the other five rows.**

### 1. r/SideProject

Title:

> I built a free, open-source set of mental health tools - live on web, Android and iOS

Body:

> I built this, so read it as my own project rather than a recommendation.
>
> Selftend is a set of free, private mental health tools: everyday tools for right now, and a
> CBT programme - cognitive behavioural therapy - to work through when you want one. Same
> codebase on web, Android and iOS.
>
> The everyday tools are what most people actually use: mood check-in, journal, gratitude,
> breathing and grounding, unguided sitting with ambient sound and bells, sleep log, habits and
> routines. Open one, use it, and you are done - none of them asks you to come back tomorrow.
> The programme is there for when you want to work through something rather than just track how
> you feel, and you never have to touch it.
>
> No ads, no subscriptions, no selling data. It is non-profit and open source (AGPL), so it
> stays free.
>
> To be clear about what it is not: it is not therapy and it does not diagnose anything. Crisis
> resources are linked separately and visibly in the app.
>
> Web: https://selftend.org
> Android: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend
> iOS: https://apps.apple.com/app/selftend/id6796318929
> Source: https://github.com/Selftend/selftend
> Community: r/Selftend
>
> Happy to answer anything about the product or the build (Expo + React Native + Supabase,
> one codebase for all three platforms).

### 2. r/droidappshowcase

Flair: app showcase (per sidebar template; re-check flair names on the day).

Title:

> Selftend - free, open-source mental health tools (no ads, no subscriptions)

Body:

> I built this. Selftend is a set of free, private mental health tools: everyday tools for right
> now, and a CBT programme - cognitive behavioural therapy - to work through when you want one.
> Non-profit and open source.
>
> The everyday side is mood check-in, journal, gratitude, breathing and grounding, unguided
> sitting, sleep log, habits and routines. Open one, use it, and you are done. The programme is
> optional and always was. No ads, no subscriptions, no selling data.
>
> It is not therapy and not a diagnosis tool - it is structured self-help, with crisis
> resources linked separately in the app.
>
> Play Store: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend
> Source (AGPL): https://github.com/Selftend/selftend
> Also on web (https://selftend.org) and iOS, if you live across platforms.
>
> Built with Expo + React Native + Supabase. Feedback very welcome - bug reports even more so.
> Home community: r/Selftend

### 3. r/opensource

Flair: Promotional (required by their rule 8).

Title:

> Selftend - AGPL mental health tools on three platforms from one Expo codebase (web, Android, iOS)

Body:

> I built this and it is fully open source under AGPL-3.0:
> https://github.com/Selftend/selftend
>
> Selftend is a set of free, private mental health tools: everyday tools for right now, and a
> CBT programme - cognitive behavioural therapy - to work through when you want one. Mood
> check-in, journal, gratitude, breathing, grounding, unguided sitting, sleep, habits and
> routines on the everyday side. No ads, no subscriptions, no tracking-based business model -
> the license and the non-profit setup are the point, because this is exactly the kind of
> software whose incentives you want inspectable.
>
> Stack: Expo + React Native + TypeScript, one codebase shipping to web (Cloudflare Workers),
> Google Play and the App Store. Supabase backend with row-level security. i18n in English and
> Bulgarian via i18next, translations managed on Weblate.
>
> Contributions are welcome - good first issues are labeled, and the docs are written so you
> can get a dev build running quickly. If you just want to try it: https://selftend.org
>
> Boundary statement, since the domain demands it: this is self-help tooling, not therapy and
> not a diagnostic instrument.

### 4. r/webdev (Showoff Saturday only)

Flair: Showoff Saturday.

Title:

> Showoff Saturday: one Expo/React Native codebase, three platforms - the web build is a first-class citizen, not an afterthought

Body:

> I built this. Selftend (https://selftend.org) is a free, open-source set of mental health
> tools, and the same codebase is live on all three platforms (web + Play Store + App Store).
> The web story is the part this sub might find interesting:
>
> - React Native Web static-exported via Expo Router, served as static assets on Cloudflare
>   Workers. No Node server anywhere.
> - The RNW layer has real traps: onLayout handlers attached after mount never fire, hydration
>   sees empty search params on first pass, and Modal slide-in animations swallow clicks in
>   e2e. Happy to detail any of these.
> - Supabase (Postgres + RLS) as the backend; TanStack Query on top.
> - i18n with i18next (English + Bulgarian), accessibility tested with reduced motion and
>   screen readers - this kind of app gets used on bad days, so it mattered more than usual.
>
> It is open source (AGPL): https://github.com/Selftend/selftend
> Questions about the setup very welcome.

### 5. r/reactnative

Title:

> Shipped an open-source Expo app to web, Android and iOS - lessons from making all three real

Body:

> I built this - Selftend, a free open-source set of mental health tools - and the same Expo
> codebase is live on all three platforms. Things I would tell past me:
>
> - React Native Web is a different platform, not a free target. onLayout is a mount-time
>   decision there, Modal animations eat clicks mid-slide, and jest never sees any of it -
>   only browser e2e caught these.
> - Edge-to-edge on newer Android silently kills adjustResize; every KeyboardAvoidingView
>   needs behavior="padding".
> - The React Compiler does not run under jest, so imperative store reads that work in tests
>   get memoized away in the real app. useSyncExternalStore is the honest answer.
> - Expo Router will happily mount a screen twice on lateral navigation if you reuse the
>   current route.
>
> Stack: Expo Router, NativeWind, Supabase, TanStack Query, Zustand, Reanimated. Source
> (AGPL): https://github.com/Selftend/selftend - live at https://selftend.org and in both
> stores. Happy to go deep on any of the above.

### 6. r/OpenSourceApps (after posting access is granted)

Title:

> Selftend - free, AGPL, non-profit mental health tools for web, Android and iOS

Body:

> I built this. Fully open source (AGPL-3.0), non-profit, no ads, no subscriptions.
>
> Selftend is a set of free, private mental health tools: everyday tools for right now, and a
> CBT programme - cognitive behavioural therapy - to work through when you want one. Everyday
> side: mood check-in, journal, gratitude, breathing and grounding, unguided sitting, sleep
> log, habits and routines. Not therapy, not diagnosis - structured self-help with crisis
> resources kept visibly separate.
>
> Repo: https://github.com/Selftend/selftend
> Play Store: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend
> App Store: https://apps.apple.com/app/selftend/id6796318929
> Web: https://selftend.org

### 7. r/bulgaria (Bulgarian, discussion-first)

Title:

> Направих безплатни инструменти за психично здраве - изцяло на български, без реклами и без абонаменти

Body:

> Аз го направих, затова направо казвам: това е моят проект. Selftend е набор от безплатни,
> лични инструменти за психично здраве: ежедневни инструменти за момента и КПТ програма -
> когнитивно-поведенческа терапия - по която да работиш, когато поискаш.
>
> Ежедневните инструменти са това, което повечето хора ползват: настроение, дневник,
> благодарности, дишане и заземяване, седене в тишина с фонов звук и камбанки, сън, навици и
> рутини. Отваряш един, ползваш го и си готов. Програмата е за когато искаш да поработиш върху
> нещо, а не просто да отчиташ как се чувстваш - и никога не си длъжен да я пипаш.
>
> Изцяло преведено на български, с отворен код, без реклами, без абонаменти и без продаване на
> данни - проектът е с нестопанска цел и ще си остане безплатен.
>
> Не е терапия и не поставя диагнози - това са структурирани упражнения за самопомощ, а
> линковете към кризисна помощ са отделени и винаги видими.
>
> Работи в браузъра (https://selftend.org), на Android и на iPhone. Кодът е публичен:
> https://github.com/Selftend/selftend
>
> Ще се радвам на мнения - и особено на критика за българския превод, правен е с много
> внимание, но втори чифт очи винаги помага.

### 8. Tester-sub follow-through (comments on the existing July threads, not new posts)

r/TestersCommunity and r/AndroidAppTesters, on the original "Need 12 testers for Selftend"
threads (2026-07-16), plus r/betatests if its thread is still open:

> Update, and a thank you: Selftend passed closed testing and is now fully live - Google Play
> production, the App Store, and the web at https://selftend.org. Everyone who tested in July:
> your bug reports and feedback are in the shipped version, and it stays free and open source.
> If you ever want to follow along: r/Selftend

Note for r/AndroidClosedTesting: skip entirely. The July tester posts never went there
(#510's premise was wrong), and its rules prohibit linking other subreddits.

## Tracking

Per issue rule 8, every post gets a comment on #510: sub, date, link, rules-check notes,
outcome (upvotes / comments / removals). A skeleton table lives in the tracking comment on
the issue. Anything that gets traction feeds follow-up posts (updates, milestones) at a
respectful cadence.

## Date checked

All subreddit rules, subscriber counts, account stats, and store URLs in this file were
verified 2026-08-19. Sources: reddit.com per-sub rules API, iTunes lookup API
(app id 6796318929, version 0.14.1), github.com/Selftend/selftend (license).

⚠️ **The drafts were rewritten 2026-09-06 ([#1901](https://github.com/Selftend/selftend/issues/1901)); the sub research above was not re-run.** Only the copy changed - the category noun, the framing of the meditation tool, and the copy rules. Every verdict, rule summary, subscriber count and flair name in this file is still the **2026-08-19 snapshot**, and checklist item 4 stands: re-read the target sub's rules the same day as each post. Two rows carry a dated caveat of their own - r/InternetIsBeautiful above, whose account-requirement premise moved on 2026-09-02, and r/Android, whose deferral depends on a posting history that may have changed.

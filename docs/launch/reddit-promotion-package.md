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
4. No medical claims: Selftend is self-help and well-being support, not therapy, not diagnosis,
   not treatment. Never imply outcomes.
5. Do not pitch "no streaks" (owner decision 2026-07-24). Fine instead: "no pressure",
   "no penalty for missing a day", "no ads, no subscriptions".
6. Describe the meditation module as a staged practice; no book or brand claims.
7. Lead with the story or the value, not the link list.
8. Point people to r/Selftend as the home community (except where a sub forbids
   subreddit links).

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

| Sub                    | Size | Verdict             | Why (2026-08-19 rules read)                                                                                                                             |
| ---------------------- | ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| r/SideProject          | 812k | GO (first)          | Showcase sub, no formal rules returned                                                                                                                  |
| r/droidappshowcase     | 13k  | GO                  | The designated showcase sub r/androidapps points to; 1 app post/week, template encouraged, store link required                                          |
| r/opensource           | 376k | GO                  | Self-promo allowed in moderation with `Promotional` flair; OSI license required - AGPL-3.0 qualifies; must engage in comments                           |
| r/webdev               | 3.3M | GO (Saturday only)  | Showoff Saturday flair; "think project, not product" - technical framing; no commercial promotion                                                       |
| r/reactnative          | 187k | GO with care        | "No self promotion" targets companies; individual OSS showcase is the sub norm - frame as a technical writeup, modmail if unsure                        |
| r/OpenSourceApps       | 2.8k | GO after approval   | FOSS-only, official repo/store links only; sub is restricted - request posting access or modmail first                                                  |
| r/bulgaria             | 361k | GO with care        | Ads "generally forbidden" but mods allow clever/interesting posts that spark discussion; BG-language story post; removal risk accepted or modmail first |
| r/AndroidAppTesters    | 9k   | Comment only        | Reciprocity home of the July tester post; update the existing thread, no new promo post                                                                 |
| r/TestersCommunity     | 19k  | Comment only        | Same July thread (21 comments); sub bans self-promo posts outside testing purposes                                                                      |
| r/Android              | 3.2M | Deferred            | Rule 4 allows dev self-posts but requires reasonable posting history on r/Android - u/only_radar has none yet; participate first, revisit               |
| r/AndroidClosedTesting | 37k  | Skip                | #510's premise was wrong - the tester posts never went here; sub also bans links to other subreddits                                                    |
| r/androidapps          | -    | Skip                | Self-promo now banned outright; posts redirect to r/droidappshowcase                                                                                    |
| r/InternetIsBeautiful  | -    | Skip (disqualified) | Bans sites that require an email/account to fully experience - Selftend requires an account in MVP; also enforces 90/10                                 |
| r/DecidingToBeBetter   | -    | Participate only    | Strictly no links, no app promotion, no exceptions                                                                                                      |
| r/selfimprovement      | -    | Participate only    | No links; may not mention your app at all                                                                                                               |
| r/getdisciplined       | -    | Participate only    | No links, permanent ban for shilling; also 200-karma gate                                                                                               |
| r/NonZeroDay           | -    | Participate only    | "Posts advertising your productivity app will be removed"                                                                                               |
| r/Habits               | 206k | Participate only    | "Spams from constant app promotions will be removed"; text-only sub; low upside vs risk                                                                 |
| r/CBT                  | -    | Participate only    | "Links to the app you developed... are not allowed"                                                                                                     |
| r/dbtselfhelp          | -    | Participate only    | No solicitation/self-promo; Selftend's DBT screen is educational-only anyway                                                                            |
| r/Meditation           | -    | Participate only    | Self-promo banned regardless of cost; feedback requests count as promo                                                                                  |
| r/Mindfulness          | -    | Participate only    | Self-promo, sales, recruitment prohibited                                                                                                               |
| r/TheMindIlluminated   | -    | Participate only    | Questions-only sub; articles go through mod nomination                                                                                                  |
| r/journaling           | -    | Skip hard           | Pen-and-paper only; app promotion is a permanent ban                                                                                                    |
| r/digitaljournaling    | 26k  | Participate only    | "You cannot promote one you've created", even in comments, even when asked                                                                              |
| r/sleep                | -    | Participate only    | No commercial content, no links of any kind                                                                                                             |
| r/GratitudeJournal     | -    | Dead lead           | Returns 404 (banned or gone)                                                                                                                            |

Suggested order: r/SideProject -> r/droidappshowcase -> r/opensource -> r/webdev (first
Saturday) -> r/reactnative -> r/OpenSourceApps (once approved) -> r/bulgaria. Tester-sub
comments can land any day since they are comments, not posts. One sub per day at most.

## Drafts

Every draft is a starting point in the owner's voice - edit freely, keep the copy rules.

### 1. r/SideProject

Title:

> I built a free, open-source mental well-being app. As of yesterday it is live on web, Android and iOS

Body:

> I built this over the past year and yesterday the last platform went live, so the whole thing
> finally exists the way I imagined it: one free app for looking after your mental well-being,
> on web, Android and iOS.
>
> Selftend is a set of small self-help tools: mood check-in, journal, gratitude, CBT thought
> records, breathing and grounding exercises, a staged meditation practice, sleep log, habits
> and routines. It is modular - you pick the tools you want and ignore the rest. No ads, no
> subscriptions, no selling data. It is non-profit and open source (AGPL), so it stays free.
>
> To be clear about what it is not: it is not therapy and it does not diagnose anything. It is
> the kind of structured self-help you would do on paper, made easier to keep up. Crisis
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

> Selftend - free, open-source mental well-being toolkit (no ads, no subscriptions)

Body:

> I built this. Selftend is a free, non-profit, open-source app for looking after your mental
> well-being: mood check-in, journal, gratitude, CBT thought records, breathing and grounding,
> a staged meditation practice, sleep log, habits and routines. Modular - use only the parts
> you want. No ads, no subscriptions, no selling data.
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

> Selftend - an AGPL mental well-being app that just shipped its third platform (web, Android, iOS from one Expo codebase)

Body:

> I built this and it is fully open source under AGPL-3.0:
> https://github.com/Selftend/selftend
>
> Selftend is a free, non-profit mental well-being toolkit: mood check-in, journal, gratitude,
> CBT thought records, breathing, grounding, staged meditation, sleep, habits, routines. No
> ads, no subscriptions, no tracking-based business model - the license and the non-profit
> setup are the point, because a well-being app is exactly the kind of software whose
> incentives you want inspectable.
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

> I built this. Selftend (https://selftend.org) is a free, open-source mental well-being app,
> and this week the same codebase went live on its third platform (web + Play Store + App
> Store). The web story is the part this sub might find interesting:
>
> - React Native Web static-exported via Expo Router, served as static assets on Cloudflare
>   Workers. No Node server anywhere.
> - The RNW layer has real traps: onLayout handlers attached after mount never fire, hydration
>   sees empty search params on first pass, and Modal slide-in animations swallow clicks in
>   e2e. Happy to detail any of these.
> - Supabase (Postgres + RLS) as the backend; TanStack Query on top.
> - i18n with i18next (English + Bulgarian), accessibility tested with reduced motion and
>   screen readers - a well-being app gets used on bad days, so this mattered more than usual.
>
> It is open source (AGPL): https://github.com/Selftend/selftend
> Questions about the setup very welcome.

### 5. r/reactnative

Title:

> Shipped an open-source Expo app to web, Android and iOS - lessons from making all three real

Body:

> I built this - Selftend, a free open-source mental well-being app - and as of this week the
> same Expo codebase is live on all three platforms. Things I would tell past me:
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

> Selftend - free, AGPL, non-profit mental well-being app for web, Android and iOS

Body:

> I built this. Fully open source (AGPL-3.0), non-profit, no ads, no subscriptions.
>
> Selftend is a modular mental well-being toolkit: mood check-in, journal, gratitude, CBT
> thought records, breathing and grounding, staged meditation, sleep log, habits and routines.
> Not therapy, not diagnosis - structured self-help with crisis resources kept visibly
> separate.
>
> Repo: https://github.com/Selftend/selftend
> Play Store: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend
> App Store: https://apps.apple.com/app/selftend/id6796318929
> Web: https://selftend.org

### 7. r/bulgaria (Bulgarian, discussion-first)

Title:

> Направих безплатно приложение за психично благосъстояние - изцяло на български, без реклами и без абонаменти

Body:

> Аз го направих, затова направо казвам: това е моят проект. Selftend е безплатно приложение
> с инструменти за грижа за психичното благосъстояние - дневник, проследяване на настроението,
> благодарности, CBT записи на мисли, дишане, медитация, навици и рутини. Изцяло преведено на
> български, с отворен код, без реклами, без абонаменти и без продаване на данни - проектът е
> с нестопанска цел и ще си остане безплатен.
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

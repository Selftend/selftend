# Google Play production access and staged-rollout mechanics

> Research for [wayfinder ticket #187](https://github.com/Selftend/selftend/issues/187),
> part of map #186, resolved 2026-07-23. All sources checked **2026-07-23**.
> "Official" = live support.google.com Play Console Help, developer.android.com, or
> developers.google.com pages. Community-reported items are explicitly labeled and
> should not be treated as policy.

Context: `org.vasilyoshev.selftend` is on the closed-testing (alpha) track under a
personal developer account created after November 13, 2023, with the v0.5.0 AAB
uploaded and the 14-day tester clock started around 2026-07-16.

## 1. Closed-testing requirement (personal accounts created after Nov 13, 2023)

- **Threshold: at least 12 testers opted in to the closed test** when you apply for
  production access. Official wording: "At least 12 testers must be opted-in to your
  closed test when you apply for production access." — **Official.**
- **The 14 days measure continuous opt-in, not active usage.** Testers "must have
  been opted-in for the last 14 days continuously." The official FAQ clarifies that a
  tester who opts in, tests fewer than 14 days, opts out, and opts back in does
  **not** accumulate days — the 14 days must be consecutive. — **Official.**
- Caveat: engagement matters separately. Even with the opt-in metric satisfied,
  Google can reject the production-access application for unengaged testers (see §2).
- **What pauses/resets the clock:**
  - Official: a tester opting out breaks that tester's continuity; days don't carry
    across an opt-out/opt-in cycle.
  - Official docs are **silent** on the aggregate count dipping below 12 and on
    removing/replacing the closed-track release.
  - Community-reported: if the opted-in count dips below 12 even briefly, the
    effective 14-day window restarts once you're back at 12 (Google evaluates "the
    last 14 days" with ≥12 continuously opted-in testers). Uninstalling the app does
    **not** break the requirement as long as the tester stays opted in via the Play
    opt-in link. Community guides also warn that pausing/removing the closed-track
    release can restart the period. — **Community-reported.**
- **History (20 → 12):** the requirement launched at 20 testers in November 2023 and
  was reduced to 12, reportedly on 2024-12-11. The live official page records
  neither the old number nor a change date — treat the date as
  **community-attested**.

Sources:

- <https://support.google.com/googleplay/android-developer/answer/14151465> —
  official: 12 testers, 14 continuous days, opt-out FAQ (checked 2026-07-23)
- <https://support.google.com/googleplay/android-developer/community-guide/255621488/everything-about-the-12-testers-requirement>
  — Google Play Developer Community guide (semi-official)
- Community: <https://primetestlab.com/blog/google-play-changed-20-to-12-testers>,
  <https://www.testfi.app/blog/google-play-closed-testing-requirement-explained>,
  <https://appconsolelab.com/blog/common-mistakes-that-reset-the-14-day-testing-period>

## 2. The "apply for production access" application

The application has three parts (all questions official, from answer/14151465):

1. **About your closed test** — how easy it was to recruit testers; how engaged
   testers were (which features they used, whether usage matched expected production
   use); a summary of the feedback and how it was collected.
2. **About your app** — the intended audience (be specific); how the app provides
   value to users; expected installs in the first year.
3. **Production readiness** — what changed based on closed-test learnings; how you
   decided the app is ready for production.

- **Response time:** "This usually takes 7 days or less, but may occasionally take
  longer." — **Official.**
- **Rejection reasons:**
  - Official examples: not having 12 testers opted in when applying; testers not
    being engaged; not following testing best practices (gathering and acting on
    feedback).
  - Community-reported: testers who opted in but never used the app (engagement is
    measured beyond opt-in); generic/low-effort one-line answers on the form
    (community guides advise detailed, specific answers — the "~250–300 characters
    per answer" floor is a folk rule, not official); not updating the app in
    response to feedback; app quality/policy issues found in review. Rejected
    developers are typically told more testing is required and must continue testing
    before reapplying.

Sources:

- <https://support.google.com/googleplay/android-developer/answer/14151465> —
  official: application questions, "7 days or less", rejection examples (checked
  2026-07-23)
- Community: <https://support.google.com/googleplay/android-developer/thread/283988803/production-access-rejected-after-14-days-of-closed-testing>,
  <https://www.testerscommunity.com/blog/google-play-production-access-rejected>

## 3. Health apps declaration and review at production promotion

- The Health apps declaration (Play Console > Policy > App content > Health apps)
  covers categories including **Mental Health**. Since 2024-08-31 all apps must have
  an accurate declaration; an incomplete one blocks submitting app changes for
  review. — **Official.** (Selftend's declaration is already completed — see
  `docs/android-closed-testing.md`.)
- **No official statement that health-declared apps get a separate or longer review
  at production promotion.** Official wording: the declaration "will be reviewed by
  Google as part of the app review process" — i.e., folded into standard review.
- General extended-review language (official, not health-specific): "For certain
  developer accounts, we'll take more time to thoroughly review your app… review
  times of up to seven days or longer in exceptional cases." New accounts without a
  track record are the explicitly flagged case. Community reports tying the health
  declaration specifically to longer production reviews are anecdotal and not
  corroborated.
- Obligation relevant to Selftend: non-medical-device health apps must carry a
  disclaimer that the app "is not a medical device and does not diagnose, treat,
  cure, or prevent any medical condition," plus a privacy policy link in Console and
  in-app. — **Official.**

Sources (all official, checked 2026-07-23):

- <https://support.google.com/googleplay/android-developer/answer/13996823> —
  health apps requirements, disclaimer, privacy policy
- <https://support.google.com/googleplay/android-developer/answer/14738291> —
  declaration form, reviewed "as part of the app review process"
- <https://support.google.com/googleplay/android-developer/answer/13996367> —
  health app categories
- <https://support.google.com/googleplay/android-developer/answer/9859751> —
  extended review "up to 7 days or longer"

## 4. Promoting a closed-testing release to production

- **Same AAB, no re-upload.** Promotion (Release > Testing > Closed testing >
  Promote release > Production) reuses the existing artifact. Official docs define
  the "Promoted" track state — the track's active bundles are contained in the more
  stable track's active bundles — and bundles from previous releases remain
  available via App bundle explorer. The Promote button's exact behavior
  (pre-filling a production release with the same bundle) is documented mainly in
  Google Play Developer Community threads. Note (community thread): the Promote
  option can be unavailable until the testing release itself has passed review.
- **versionCode:** a versionCode can never be re-uploaded and must monotonically
  increase (max 2,100,000,000). Promotion keeps the same versionCode because
  nothing is re-uploaded; any **new** upload needs a strictly higher versionCode. —
  **Official** (developer.android.com).
- **EAS remote versioning is irrelevant to promotion.** Promotion never builds or
  uploads anything, so `build.production.autoIncrement` / the remote version source
  play no role in the promote step. They matter only when building a **new** AAB,
  where they bump versionCode so the upload satisfies the higher-versionCode rule.
  (Inference from the official mechanics above; consistent with Expo's
  app-versions docs already linked in `docs/android-closed-testing.md`.)

Sources (checked 2026-07-23):

- <https://support.google.com/googleplay/android-developer/answer/9845334> —
  official: "Promoted" state, tested bundles released to a more stable track
- <https://support.google.com/googleplay/android-developer/answer/9859348> —
  official: releases, bundle reuse, App bundle explorer, rollout to production
- <https://developer.android.com/studio/publish/versioning> — official:
  versionCode uniqueness, monotonic increase, max value
- Community (official forum): <https://support.google.com/googleplay/android-developer/thread/208169264>,
  <https://support.google.com/googleplay/android-developer/thread/271423222>

## 5. Staged rollout in production

All from the official "Release app updates with staged rollouts" page
(answer/6346149) unless noted; checked 2026-07-23.

- **Selection:** new and existing users are eligible and "are chosen at random for
  each new release rollout." **Sticky within a release:** halting and resuming a
  rollout affects "the same set of users." — **Official.**
- **Percentages never auto-advance:** "your app's staged rollout percentage won't
  increase automatically" — increase manually via Manage rollout > Update rollout.
  — **Official.**
- **Minimum / decreasing:** the official page states no minimum and doesn't address
  decreasing. Community-reported: the Console accepts fractions down to ~0.01%, and
  the percentage cannot be lowered once set — only increased (or superseded by a
  new release). The Play Developer API's `userFraction` (official) shows fractional
  values without a stated floor.
- **Halting:** a halt stops new users from receiving the version; "users who
  already received the app version… will remain on that version" — no rollback.
  Halted releases can be resumed (same user set) via Manage rollout > Resume
  rollout. API release statuses: `inProgress`, `halted`, `completed`; resume =
  status back to `inProgress`. — **Official.**
- **New release during an in-progress staged rollout:** "the new release will use
  the same group of users as the previous release (depending on the percentage of
  the rollout)" — the new release supersedes the old (including a halted one) and
  draws from the same pool proportionally. You set the new release's percentage
  yourself at release creation; it does not inherit the previous one. — **Official**
  (group-reuse sentence verbatim; percentage-selection per release from
  answer/9859348).
- **Tracks:** staged rollout is available on production, open testing, and closed
  testing tracks. — **Official.**

Sources:

- <https://support.google.com/googleplay/android-developer/answer/6346149> —
  official: all staged-rollout mechanics above
- <https://support.google.com/googleplay/android-developer/answer/9859348> —
  official: per-release rollout percentage selection
- <https://developers.google.com/android-publisher/tracks> — official:
  `userFraction`, release statuses, resume semantics
- Community: <https://medium.com/bleeding-edge/the-art-of-staging-a-rollout-8e203b337b75>
  (cannot lower percentage), <https://capgo.app/blog/google-play-staged-rollouts-how-it-works/>
  (~0.01% floor)

## Implications for Selftend

- With the clock started ~2026-07-16 and ≥12 testers continuously opted in, the
  earliest apply date is ~2026-07-30. Keep the tester count comfortably above 12 the
  whole time — official docs don't define dip behavior, and community consensus says
  a dip restarts the window.
- Keep testers _using_ the app, not just opted in — engagement is an official
  rejection reason. Collect and act on feedback so the application's "what changed"
  and "readiness" answers are specific.
- Prepare application answers ahead of time: recruitment story (e.g., the Reddit
  tester wave), engagement summary, feedback summary and collection channel,
  intended production audience (18+ wellness/self-help), first-year install
  estimate, changes made from feedback, readiness rationale. Expect an answer in
  ≤7 days, possibly longer (new account).
- Production promotion of the tested v0.5.0 AAB needs no new build: Promote release
  from the closed track, same versionCode, EAS versioning untouched.
- First production rollout can be staged (e.g., start ~10%, increase manually,
  halt if Sentry lights up — halting doesn't roll back users who already updated).

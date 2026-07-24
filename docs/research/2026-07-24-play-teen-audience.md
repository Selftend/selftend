# Google Play: expanding a live app's target audience from 18+ to 13+

> Research for [issue #219](https://github.com/Selftend/selftend/issues/219), resolved 2026-07-24.
> Question: what changes on Google Play when Selftend's declared target audience expands from
> 18+ to include ages 13-17 (under-13 stays excluded)? All claims below cite official Google /
> IARC / EU / Ofcom sources checked 2026-07-24.

**Summary.** Declaring 13-17 (without under-13) does **not** pull Selftend into Google Play's
Families Policy — that attaches only when _children_ are in the target audience. What does
attach: the Target Audience and Content policy's teen-appropriateness expectations, its minors'
data-disclosure/parental-consent language, and a locale caveat that 13-17 "may be considered to
include children in some locales." The change itself is a declaration edit in Play Console
(Policy > App content > Target audience and content > Manage > Send for review) that triggers a
Google re-review of the declared audience's accuracy — typically days, "up to 7 days or longer
in exceptional cases." No official rule was found limiting how often the target audience can be
changed or specially restricting adding a younger group beyond that re-review. The IARC content
rating should realistically stay **Everyone / PEGI 3 / USK 0** for a CBT self-help app with no
depictions of violence/sex/drugs/gambling, no user-to-user content, and no ads; the crisis page
_referencing_ helplines is informational, not a depiction (exact questionnaire wording is behind
the Console login — open question below). The bigger 2026-moving-target is age assurance: the
Play Age Signals API (beta) is live for Brazil ECA and US state laws (TX/UT/LA), but Google
explicitly does **not** mandate it — the developer must decide whether those laws reach the app.

## 1. Target Audience and Content policy — what attaches for a 13-17 audience

Source: [Target audience and content / Manage target audience and app content settings](https://support.google.com/googleplay/android-developer/answer/9867159) (checked 2026-07-24).

- Selecting the 13-15 and 16-17 age groups carries the caveat that each "may be considered to
  include children in some locales" — Google punts the definition of "children" to local law, so
  wide distribution means a counsel check per major market (see §6, GDPR consent ages).
- Content-appropriateness guidance per group: for 13-15, avoid content that "glamorize[s]
  violent, stereotypical, demeaning, objectifying, or highly sexualized representations"; for
  16-17, avoid "extreme violence, or sexual or domestic violence" and "addictive elements."
  Selftend's guided self-help content is comfortably inside these lines.
- Minors' data: "Any collection of personal and sensitive information from children... must be
  disclosed and should be collected with parental consent if required" — disclosure via privacy
  policy + Data safety (§4); whether consent is _required_ is a per-jurisdiction legal question,
  not a Play mechanic.
- Ads: the Families Self-Certified Ads SDK requirement only applies to "ads that may be shown to
  children" — teen-only audience plus zero ads in Selftend makes this moot.
- Independent of the declaration, Google checks the **store listing for child appeal**: "If your
  app is not primarily designed for children under 13 but your listing contains marketing
  elements that suggest otherwise... Google Play may reject your app." Keep the listing free of
  youthful animation/young-character imagery (current listing is fine; keep it that way).

## 2. Families Policy does NOT attach for 13-17-only

Source: [Google Play Families policies](https://support.google.com/googleplay/android-developer/answer/9893335) (checked 2026-07-24).

- Trigger is explicit: "If one of the target audiences for your app is children, you must comply
  with the following requirements." A 13-17 + 18+ declaration with no under-13 group is outside
  Families Policy — no Families Self-Certified Ads SDKs, no identifier-transmission bans (AAID
  etc.), no Teacher Approved program eligibility/obligation.
- Caveat repeated in the policy itself: "The word 'children' can mean different things in
  different locales and in different contexts... consult with your legal counsel."
- The upcoming policy revision changes nothing here: the
  [Preview: Google Play Families Policies](https://support.google.com/googleplay/android-developer/answer/17122218)
  (effective 2026-08-26, checked 2026-07-24) keeps the children-based trigger; its notable
  addition is that anonymous-chat/stranger-chat social apps "must not target children" — not
  applicable to Selftend (no social features).

## 3. IARC content rating — expected outcome

Sources: [Content rating requirements](https://support.google.com/googleplay/android-developer/answer/9859655) and [answer/188189](https://support.google.com/googleplay/android-developer/answer/188189); [How IARC works](https://globalratings.com/how-iarc-works/) (checked 2026-07-24).

- One questionnaire (App content > Content ratings) produces per-region ratings: ESRB (Americas),
  PEGI (Europe), USK, ACB, ClassInd, GRAC, plus generic IARC. "Your questionnaire responses
  determine the ratings assigned to your app"; misrepresentation can mean removal or suspension,
  so answer accurately, not defensively.
- Ratings are driven by depicted content (violence, sexual content, language, drugs, gambling
  etc.). **Interactive Elements are reported separately from the age rating**: "Interactive
  Elements provide upfront notice about the ability to make in-game purchases (including
  randomized ones), interact with other users, share users' location, and access the Internet."
  Private journaling with no sharing → answer "no" to user-interaction/UGC-exchange questions;
  no location sharing, no purchases.
- Realistic outcome for Selftend: **Everyone / PEGI 3 / USK 0** with no descriptors. What would
  push it higher: depicting or glamorizing self-harm, violence or mature themes in exercise
  content; adding user-to-user content sharing; unrestricted web browsing inside the app; ads.
- **Open question (unverifiable from public sources):** the exact current questionnaire wording
  on suicide/self-harm. The question set sits behind the Console login and is not published by
  Google or IARC. A crisis page that _references_ helplines and prevention resources is
  informational, not a depiction, and the official pages describe ratings as based on content
  depictions — but if the live questionnaire asks about "references to" self-harm, answer yes
  truthfully and accept whatever descriptor results rather than risk a misrepresentation strike.
  Verify the actual question text in Console when re-running the questionnaire.

## 4. Data safety form — teen-audience implications

Source: [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469) (checked 2026-07-24).

- **No teen-specific fields exist.** The only audience-linked element in the form is the
  Families badge opt-in, which routes through Target audience and content and applies to
  children-targeted apps — not Selftend.
- Existing declarations must already cover what Selftend collects, unchanged by the audience
  expansion: account email under Personal info ("A user's email address"); journal entries under
  Health info ("Information about a user's health, such as medical records or symptoms") — CBT
  thought records about mood/thoughts are health-adjacent and Health info is the safer category —
  or at minimum "Other user-generated content" ("user bios, notes, or open-ended responses").
- Deletion: developers must state whether users can request data deletion; the deletion badge
  requires a user-accessible mechanism or auto-deletion/anonymization within 90 days.
- Teen data obligations come from the Target Audience policy language (§1: disclose, parental
  consent "if required") and from regional law, not from the Data safety form. Open question for
  counsel: GDPR Art. 8 digital-consent age is 13-16 depending on member state, so a 13-15 user
  in e.g. Germany may need parental consent for consent-based processing — a legal/onboarding
  question, not a Play Console one.

## 5. Changing the declaration on a live app — process and re-review risk

Source: [answer/9867159](https://support.google.com/googleplay/android-developer/answer/9867159); [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455) (checked 2026-07-24).

- Location and flow: Play Console > Policy > **App content** > Target audience and content >
  **Manage** > select age groups > answer follow-ups (ads-to-children, store-listing appeal) >
  **Send for review**. It is a declaration change, not a release artifact — it does not require
  shipping a new app version.
- Re-review: "Google will review your app to make sure the target audience that you disclose is
  accurate and your app is compliant with all Google Play Developer policies." Standard reviews
  take days; "certain developer accounts and/or categories of apps may be subjected to extended
  reviews, which may result in review times of up to 7 days or longer in exceptional cases."
  Expect the audience-accuracy review, plus the store-listing child-appeal check; a health app
  adding minors plausibly lands in the "extended review" bucket — treat 7+ days as the planning
  number.
- **The rumored "you may not change your target audience more than once" rule: not found in any
  official page checked.** Neither the policy page nor the console help documents a frequency
  limit or a special restriction on adding younger age groups beyond triggering re-review. (A
  once-annually change limit does exist, but for a different thing: custom minimum ages for the
  Age Signals API, §6.) Marked as verified-absent from public docs; Console UI may still surface
  warnings not documented publicly — note whatever the UI says when making the change.
- Failure mode if Google disagrees: rejection with the option to fix the listing or the
  declaration; existing production availability for the 18+ audience is not documented as being
  at risk from a rejected _expansion_, but this is not explicitly guaranteed anywhere — mild
  residual risk, mitigated by doing it after production access is stable.

## 6. Age signals / age assurance landscape (2025-2026)

Sources: [Play Age Signals overview](https://developer.android.com/google/play/age-signals/overview), [Understand age signals responses](https://developer.android.com/google/play/age-signals/understand-age-signals-responses), [release notes](https://developer.android.com/google/play/age-signals/release-notes), [US state age verification laws help page](https://support.google.com/googleplay/android-developer/answer/16569691) (checked 2026-07-24).

- **Play Age Signals API (beta):** returns age ranges (default `0-12`, `13-15`, `16-17`, `18+`;
  customizable minimum ages, "at least 2 years apart and can be changed once annually"),
  verification tier (TIER_A self-declared → TIER_D Government ID + selfie/Digital ID), and
  `significantChangeStatus` (parental approval APPROVED/PENDING/DECLINED for supervised users).
  Use is restricted: "You may only use information from the Play Age Signals API to provide
  age-appropriate content and experiences in compliance with laws" — no advertising, profiling,
  or analytics use. Google recommends pairing with Play Integrity API against spoofing.
- **Not mandated by Google:** "Google Play doesn't mandate the use of these features. It is your
  responsibility to determine how these laws apply to your app, and whether and how to use these
  features to meet your obligations." Google handles the store-side age verification flow and
  parental download/purchase approvals; the developer decides whether the state laws impose
  in-app obligations (e.g. acting on age category, re-obtaining parental consent after a
  "significant change" — which Google deliberately leaves to "the developer's responsibility to
  decide what constitutes a significant change for their app").
- Rollout status (per release notes and the help page, both checked 2026-07-24; **statuses are in
  flux — re-check before acting**): Brazil (Digital ECA) live since 2026-03-17; Texas SB 2420 —
  the help page says the law is "now in effect after a federal appeals court stayed the
  preliminary injunction issued in December 2025," with signals rolling out for new Texas
  accounts created after 2026-05-28 (the release notes carried a conflicting
  injunction-dependent note at time of checking); Utah live responses from 2026-05-07; Louisiana
  from 2026-07-01. Texas also requires per-SKU age ratings for in-app products — Selftend has
  none, not applicable.
- Practical read for a 13+ wellness app distributed in the US: once teens are in the audience,
  the TX/UT/LA app-store laws are the reason to evaluate integrating the Age Signals API; Google
  provides the plumbing but the compliance call (and any parental-consent UX) is the
  developer's. Open question for counsel: whether a free non-profit wellness app is in scope of
  each statute.
- **EU DSA:** the Commission's [guidelines on the protection of minors](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors)
  (Art. 28(1), published 2025-07-14, checked 2026-07-24) apply to "all online platforms
  accessible to minors, with the exception of micro and small enterprises." Selftend is not an
  online platform in the DSA sense (no dissemination of user content to the public) and is a
  micro-scale non-profit — likely out of scope on both grounds; mark as assumption, not legal
  advice.
- **UK OSA:** Ofcom's [Protection of Children codes](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/statement-protecting-children-from-harms-online)
  (published 2025-04-24; children's risk assessments due 2025-07-24; duties in force 2025-07-25;
  page returned 403 to automated fetch — dates corroborated from the statement's public
  coverage, checked 2026-07-24) bind **user-to-user and search services** likely accessed by
  children. Private journaling with no user-to-user content sharing is likely out of scope;
  flag for counsel if any sharing/community feature is ever added.

## 7. Mental-health / wellness app specifics

Sources: [Health Content and Services policy](https://support.google.com/googleplay/android-developer/answer/16679511), [Health apps declaration form](https://support.google.com/googleplay/android-developer/answer/14738291), [Health app categories](https://support.google.com/googleplay/android-developer/answer/13996367) (checked 2026-07-24).

- The Health apps declaration (App content page) is mandatory for **all** apps; Selftend's CBT
  features fall under "Health and fitness apps" ("fitness, nutrition, wellness, and sleep";
  stress-management apps are the named example). This declaration already exists for the current
  18+ release — the audience change does not add a new health declaration.
- Standing requirements that continue to apply: privacy policy link in Console _and_ in-app; no
  misleading/harmful health claims; non-medical apps must state the app "is 'not a medical
  device and does not diagnose, treat, cure, or prevent any medical condition'" and "remind
  users to consult a healthcare professional for medical advice." Selftend's existing
  wellness-not-therapy framing satisfies the spirit; verify the exact disclaimer wording exists
  in the listing/app.
- **No documented extra review gate for mental-health content aimed at teens** was found in the
  Health policy, Families policy, or Target Audience policy — the teen exposure is handled
  through the generic audience re-review (§5). The 2026 Child Safety Standards-type rules target
  social/dating apps, not health apps. Marked as verified-absent from public docs.

## Recommendations for Selftend

1. **Sequence:** do nothing until production access is granted (~2026-07-30) and the app is
   stable in production — then submit the audience change as its own isolated review event.
   Don't stack it on the production-access review. Budget 7+ days for the re-review.
2. **Pre-flight before flipping the declaration:** re-read the store listing for anything
   child-appealing; confirm the crisis-guidance page stays clearly visible and separate; confirm
   the "not a medical device" disclaimer + consult-a-professional reminder wording; confirm
   content clears the 13-15 / 16-17 appropriateness guidance (it does today).
3. **Re-run the IARC questionnaire in the same pass**, reading the live question text on
   self-harm/suicide references and answering truthfully; expect Everyone / PEGI 3 to hold.
4. **Data safety:** no new fields needed; sanity-check journal entries are declared (Health info
   preferred) and the deletion path is accurate. Note in the change description that nothing in
   data practices changed.
5. **Counsel questions to park (not blockers):** GDPR consent ages 13-16 for EU teens; whether
   TX/UT/LA app-store statutes reach a free non-profit wellness app; locales where 13-17 counts
   as "children."
6. **Watch items:** Play Age Signals API rollout per state (re-check release notes; injunction
   status moves), and the Families Policies revision effective 2026-08-26 (no teen impact as
   previewed). If Age Signals integration is ever adopted, min-age customization is limited to
   one change per year — pick ranges deliberately.

## Sources

All checked 2026-07-24.

- Target audience and content (policy + Console management) — [support.google.com/googleplay/android-developer/answer/9867159](https://support.google.com/googleplay/android-developer/answer/9867159)
- Google Play Families policies — [answer/9893335](https://support.google.com/googleplay/android-developer/answer/9893335)
- Preview: Google Play Families Policies (effective 2026-08-26) — [answer/17122218](https://support.google.com/googleplay/android-developer/answer/17122218)
- Content rating requirements (IARC in Play Console) — [answer/9859655](https://support.google.com/googleplay/android-developer/answer/9859655), [answer/188189](https://support.google.com/googleplay/android-developer/answer/188189)
- IARC, How IARC works — [globalratings.com/how-iarc-works/](https://globalratings.com/how-iarc-works/)
- Data safety section — [answer/10787469](https://support.google.com/googleplay/android-developer/answer/10787469)
- Prepare your app for review — [answer/9859455](https://support.google.com/googleplay/android-developer/answer/9859455)
- Health Content and Services policy — [answer/16679511](https://support.google.com/googleplay/android-developer/answer/16679511)
- Health apps declaration form — [answer/14738291](https://support.google.com/googleplay/android-developer/answer/14738291)
- Health app categories and additional information — [answer/13996367](https://support.google.com/googleplay/android-developer/answer/13996367)
- US state age verification laws (Play help) — [answer/16569691](https://support.google.com/googleplay/android-developer/answer/16569691)
- Play Age Signals API: overview — [developer.android.com/google/play/age-signals/overview](https://developer.android.com/google/play/age-signals/overview); responses — [understand-age-signals-responses](https://developer.android.com/google/play/age-signals/understand-age-signals-responses); release notes — [release-notes](https://developer.android.com/google/play/age-signals/release-notes)
- EU Commission, DSA guidelines on protection of minors (2025-07-14) — [digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors)
- Ofcom, Protection of Children statement/codes (2025-04-24; automated fetch blocked, dates from public statement coverage) — [ofcom.org.uk](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/statement-protecting-children-from-harms-online)

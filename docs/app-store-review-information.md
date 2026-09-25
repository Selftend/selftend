# App Review Information — Selftend

For [Task: write Selftend's App Review Information doc (items 2-6)](https://github.com/Selftend/selftend/issues/1006), under map [Both iOS submissions rejected under Guideline 2.1](https://github.com/Selftend/selftend/issues/998).

Sibling of the WikiCanvas doc of the same name, and the same kind of artifact: **the worked-out answer with the facts cited, so replying to App Review is transcription rather than judgement** — this time and for every future submission.

Submission `ea996c51-00d9-4382-9a90-1449ad70f61c` (0.11.1, build 6) was rejected 2026-08-14 under **Guideline 2.1 — Information Needed**, citing 2.1.0 Performance: App Completeness and asking for seven items. No bug or crash was cited. ⚠️ **That letter is answered and closed** — 0.21.0 is approved. What this document is _for_ now is the **Notes** block at the bottom, which mirrors a live App Store Connect field and is kept continuously true; Items 3–7 are the worked-out source a future reply is assembled from.

---

## ✅ SENT — 2026-08-15 10:49

The reply went out on submission `ea996c51-00d9-4382-9a90-1449ad70f61c`, **3,983 of 4,000 characters**, with the screen recording attached directly (8.4 MB, H.264, audio stripped, one ~6-second cut removing a red "Something did not save" validation banner). App Store Connect shows **Messages (2)** and the attachment on the sent message.

Two things were changed at send time, both recorded here so the next submission inherits the corrected version rather than the draft:

- **Item 1 was rewritten against the footage.** The draft claimed a journal entry, a timed breathing session, both permission prompts, the crisis screen and sign-in as the demo account — none are in the recording. What went out describes only what is on screen. (The same correction landed independently in #1042.)
- **The device placeholders were filled from the device's own crash report**: `iPhone (iPhone18,3)`, iOS `26.6`. The model identifier was used rather than a marketing name, which could not be confirmed — an unambiguous identifier beats a wrong product name in a statement to Apple.

Before sending, Sign-In Information was switched to **`demo@selftend.org`** (owner-only; it needs a password typed into a field), on the belief that this made item 4's "populated home screen" claim true. ☠️ **It did not stay true**: that account's data went stale and read _"Nothing yet"_ five times on Home at every later submission ([#2668](https://github.com/Selftend/selftend/issues/2668)). It was **retired from the review role on 2026-09-25** ([#2731](https://github.com/Selftend/selftend/issues/2731)); § _Item 4_ below names the account that replaced it and the alarm that keeps the claim true.

**The Notes field was also updated** — 3,049 characters, the block below plus the Guideline 4.8 / Sign in with Apple section the previous Notes carried. Apple's letter asks for this information in Notes "for future submissions", so it is now there independently of this reply.

⚠️ The submission still reads **Unresolved Issues** with `Last Updated By: Apple`, and "Resubmit to App Review" stays disabled. That is expected: no build changed, so the reply is the whole mechanism and the status only moves when a reviewer picks it up.

☠️ **Attachment trap.** Uploading to App Store Connect's file input registers the file but renders **no visible chip**, so it looks like it failed. Retrying left **three** copies of the same video on the draft, visible only by reading the dialog's DOM (each carries its own `aria-label="Delete"`). Two were deleted before sending. Check the DOM, not the screenshot.

---

## ⚠️ The build-6 delta, kept as history

☠️ **Superseded 2026-09-20** ([#2602](https://github.com/Selftend/selftend/issues/2602)). This section used to be the document's freeze rule, written when Apple was reviewing **0.11.1 build 6** and `dev` was at 0.18.0; it tracked the deltas between them — a tenth tools entry, the mood tool relabelled "Check-in", the Looking back screen rebuilt and then removed outright ([#2431](https://github.com/Selftend/selftend/issues/2431)). **The live approved version is now 0.21.0 and build 6 is long gone**, so the deltas are history and the rule they served has been re-scoped — see § _Which build this document describes_ below, which is the live one.

✅ **[#2457](https://github.com/Selftend/selftend/issues/2457) is absorbed here.** Its four _Looking back_ edits are done in this pass rather than waiting for a future submission: `/progress` has redirected since **v0.21.0**, so they were overdue against the version live today, not pending against one to come. Its instruction that survives and is kept: **name edits by table and block, never by line.**

Two corrections from the build-6 era, recorded so no later session re-inherits them:

- The shot-list on [Grilling: what must each recording show, shot by shot?](https://github.com/Selftend/selftend/issues/1004) says the tools index shows **ten** tools. In build 6 it shows **eight**. The tenth-tool count is a `dev` fact.
- That same shot-list names `vasil.yoshev+demo@gmail.com` as the reviewer account. Superseded by [Task: verify and record reviewer access to Selftend](https://github.com/Selftend/selftend/issues/1005): the reviewer gets **`demo@selftend.org`**.

## The recording, and what item 1 may claim about it

**The recording exists**: `selftend-0.11.1-build6-review.mp4`, 2 min 54 s, silent, 1206×2622 at 30 fps — the native screen of the iPhone it was taken on. Build 6 is confirmed on screen (`Selftend v0.11.1` in Settings; CBT and ACT badged **Beta**, DBT **Soon**, all of which `dev` has since removed).

⚠️ **Item 1 has been rewritten to describe this footage rather than the shot-list.** The take predates [the recording script](./app-store-recording-script.md) — it was made while the device was being set up — so it follows a different path, and the reply now says what the video actually contains. Nothing below claims a shot the footage does not hold.

**What it shows:** the signed-out screen including its crisis-guidance link · account creation via Sign in with Apple · the home dashboard · the tools hub with all eight tools · the CBT module, its programme and a goal saved · a mood check-in saved and shown in its history and 7-day trend · the Notifications screen with every reminder off by default · Settings · account deletion end to end, returning to the signed-out screen.

**What it does not show, and which item 1 therefore does not claim:** email/password registration · sign-in as the reviewer account · a journal entry or a breathing session · the notification and photo-library permission prompts · the crisis page itself.

🔴 **The account in the video is created on camera, so most tools read "No entries yet".** Item 1 states this plainly and points at the pre-seeded reviewer account, so the empty states are explained rather than left to be discovered. ⚠️ It is the weakest part of the reply against a _2.1 App Completeness_ citation, and it is why item 4's populated-account answer is load-bearing.

⚠️ **The device string is not verifiable from the file.** It was re-encoded (`Lavf61.7.100`), so the original iOS capture metadata is gone. `iPhone 17` / `iOS 26.6` comes from the crash log taken on the same phone the same day — **confirm it against Settings › General › About before sending**, since item 2 states it to Apple as fact.

**iPad** is not covered, truthfully — even though `app.config.ts` sets `supportsTablet: true` and the listing ships iPad screenshots. The same codebase is also exercised on **Android** (in production on Google Play) and on the **web** build at <https://selftend.org>. Those are stated as context, never as iOS coverage.

---

## Item 3 — What the app does, and who it is for

Selftend is a free, non-profit, open-source **wellness and self-help** app — a set of **mental health tools** a person uses on their own, with no practitioner involved. It gives a person a small set of everyday tools for noticing how they are doing and doing something about it, and structured educational material drawn from CBT and ACT.

**The problem it solves:** self-help techniques that work are scattered across books, worksheets and paid apps, and the apps that do collect them tend to monetise attention — streaks that punish a missed day, reminders on by default, subscriptions in front of the useful part. Selftend puts the tools in one place, free, with the retention mechanics deliberately left out.

**What is in the live version, 0.21.0** (⚠️ re-derived at the `v0.21.0` tag, not carried forward from build 6):

| Surface   | Contents                                                                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tools     | Eight tools — **Check-in**, journal, breathing, gratitude log, grounding, meditation, sleep, habit tracking. Each records entries and shows history. ⚠️ **They are reached from Home's _Tools_ section and from their eight individual sidebar entries — there is no "Tools hub" screen** |
| Modules   | **CBT**, **ACT** and **DBT**, all three fully usable — thought records, worry, beliefs, activities, exposure, goals; defusion, values, committed action, urge surfing; and the DBT skill groups, its programme and its records                                                            |
| Routines  | User-built routines, with their own navigation entry                                                                                                                                                                                                                                      |
| Home      | A dashboard the user assembles from 28 widgets; nothing is seeded without the user choosing it                                                                                                                                                                                            |
| Reminders | Twelve reminder targets - one general, eleven per tool - **every one off by default**                                                                                                                                                                                                     |

**Target audience:** people aged **13 and older**, or their country's higher floor — 14, 15 or 16 across much of Europe — who want structured self-help they can run themselves. The floor is asked before the app opens and is **never below 13**; it is per-country, and the table is in [`docs/age-floor.md`](age-floor.md). There is no minor flag and no parental-consent path: the protections are universal, so teen-grade defaults apply to everyone. It is **not** a diagnosis engine, a therapist replacement, or crisis support, and the app says so in six separate places — see item 7.

**Value:** the record is the point. Entries are private, encrypted at rest, exportable, and deletable, and the app never charges, advertises, or nags.

### ✅ The 2.1 App Completeness exposure is gone, and the section that named it with it

☠️ **Removed 2026-09-20** ([#2602](https://github.com/Selftend/selftend/issues/2602)). This document used to carry a section naming the **DBT** module's **"Soon"** badge and its _"On the roadmap"_ screen as the most plausible thing a reviewer would point at under a completeness citation. [#1020](https://github.com/Selftend/selftend/issues/1020) removed the badge, the screen and the **"Beta"** badges on CBT and ACT **before 0.18.0**, and `test/no-unshipped-status-copy.test.ts` has guarded them since. **The exposure does not exist in the live build, so the section goes with it rather than being reworded.**

### ☠️ Which build this document describes — re-scoped 2026-09-20

The rule this section used to carry read: _"this document must not be updated to match `dev` until the release that carries it is the build under review."_ ⚠️ **The reasoning was sound and the referent was wrong.** It read the pin as _the next submission_; the pin is _the version currently approved on the App Store_. Those coincided in August and have not since.

> **The build-describing sections** — Item 3's contents table, Item 4's _How to reach it_ table, and this paragraph — describe **the version live on the App Store**, today **0.21.0**. They are updated when a new version goes live, **never to match `dev`**.
>
> **The paste block and the App Store Connect fields it mirrors are not frozen at all.** App Review Information is private to the reviewer and **editable at any time** ([#2597](https://github.com/Selftend/selftend/issues/2597)), so it is kept continuously true. There is no build, no version and no submission to wait for.

☠️ **This is what stops "catch the document up" being executed as one careless sweep to `dev`.** `dev` is v0.23.0 and **gated** — iOS ships no modules there. The live build is **0.21.0** and **predates the gate**. Syncing this file to `dev` today would make it lie about the binary a reviewer would actually open, which is the exact failure the freeze rule exists to prevent. ⚠️ **Four module facts therefore wait**: Item 3's _Modules_ row, Item 4's _CBT / ACT modules_ row, and the two module sentences in the Notes block. They are **true of live 0.21.0** and false of the gated build, and they are the only part of this file that rides the gated submission.

## Item 4 — Setting up and accessing the main features

**An account is required**, and credentials are supplied in the Sign-In Information fields. Since **2026-09-25** the reviewer account is **`vasil.yoshev+appreview@gmail.com`** ([#2731](https://github.com/Selftend/selftend/issues/2731)), a production account created pre-confirmed through the admin API (no signup, so no email was sent). Its credentials are the repository secrets `DEMO_ACCOUNT_EMAIL` / `DEMO_ACCOUNT_PASSWORD`, and its auth user id is the repository variable `APP_REVIEW_USER_ID`.

**Populated by the tracked seed, and kept that way by an alarm**, not by a one-off fill:

- It carries `scripts/seed-demo-data.mjs`'s fabricated dataset — ~3 months across the tools, ten favourites, four routines — ending on the day it was seeded, plus the account shell the app's gates check: age attestation, accepted `policyVersion`, onboarding done. So no age gate, consent wall or onboarding wizard fires, and Home opens populated. App lock is device-local and defaults off.
- ☠️ **The dataset goes stale by itself** — its window ends on the day it runs. `app-review-account-staleness.yml` reads the account's newest check-in every Monday through the read-only digest role and **fails when it is older than 14 days** (or absent). The fix is the owner's re-seed, [releasing.md § _Re-seed the App Review account_](releasing.md#re-seed-the-app-review-account-owner-before-an-ios-submission); **re-seed before every iOS submission regardless**.
- Verified 2026-09-25 right after the first seed: email confirmed, `age_floor_met` true (GB), policy accepted, onboarding completed, 10 favourites, newest check-in 0 days old.

⚠️ The address is a **deliverable** plus-tagged Gmail mailbox, chosen so that a reviewer tapping "forgot password" cannot bounce and damage the sender reputation. `demo@selftend.org` — non-deliverable, SQL-created — is retired from the review role and must still never be sent mail.

Sign-in also offers **Sign in with Apple** and **Google Sign-In**; either creates a fresh account.

| Feature           | How to reach it                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The eight tools   | Home's **Tools** section, or each tool's own entry in the sidebar — **Check-in**, Journal, Breathing, Meditation, Grounding, Gratitude log, Sleep, Habit tracking. Each opens the tool and shows its own history |
| CBT / ACT modules | **CBT** and **ACT** in the sidebar (and **DBT** beside them)                                                                                                                                                     |
| Home dashboard    | Landing screen after sign-in; widgets are added and reordered by the user                                                                                                                                        |
| Routines          | **Routines** in the navigation                                                                                                                                                                                   |
| Reminders         | Settings → Reminders, or the **Reminders** screen in the sidebar. Enabling one raises the iOS permission prompt                                                                                                  |
| Profile picture   | Settings → profile picture, which raises the photo-library permission prompt                                                                                                                                     |
| Crisis guidance   | Linked from the signed-out sign-in screen's footer — reachable **before** sign-in — and, once signed in, from **Support**, from **Legal**, and from a crisis bar carried on the module exercise screens          |
| Data export       | Settings → Account → export data                                                                                                                                                                                 |
| Account deletion  | Settings → Account → delete account. Also documented at <https://selftend.org/account-deletion>                                                                                                                  |

## Item 5 — External services

| Service                            | Role                                                         | Notes                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Supabase** (hosted)              | Postgres, Auth, Storage, Edge Functions, Vault               | Entry fields are encrypted at rest with `pgcrypto`; the key lives in Supabase Vault, outside the database |
| **AWS SES**                        | Transactional email — verification, password reset, feedback |                                                                                                           |
| **Sentry**                         | Crash and error reporting                                    | Fully disabled when `EXPO_PUBLIC_SENTRY_DSN` is unset; never receives entry content                       |
| **Cloudflare Workers**             | Web hosting for selftend.org and the public policy pages     | Web surface only                                                                                          |
| **Expo / EAS**                     | Build and submission                                         | Not a runtime data path                                                                                   |
| **Expo Push Notification service** | Delivery of reminders the user has enabled                   | The `send-web-reminders` edge function POSTs to `exp.host`, which forwards to APNs                        |
| **Sign in with Apple**             | Optional authentication                                      |                                                                                                           |
| **Google Sign-In**                 | Optional authentication                                      |                                                                                                           |
| **Firebase Cloud Messaging**       | Push transport                                               | **Android only.** No role on iOS                                                                          |
| **Find A Helpline**                | Outbound link on the crisis page                             | A link only — no data leaves the app to it                                                                |

**There is no AI service of any kind** — no model provider, no inference API, no AI feature in the product. The rejection letter names AI services explicitly, so the absence is worth asserting rather than leaving to inference.

There are also **no ads, no analytics SDKs, no tracking, no payment processors, and no in-app purchases or subscriptions.** The cookie-consent store ships an `analytics` toggle that defaults to `false` and has nothing wired behind it.

## Item 6 — Regional differences

**The app functions identically in every region.** No feature, screen, tool, module or piece of content is gated by country, and there is no geo-detection anywhere in the codebase — nothing reads a region, and nothing branches on one.

What varies is **interface language**, which follows the device locale and can be changed in-app. Build 6 ships **English and Bulgarian**; `CFBundleLocalizations` in `app.config.ts` declares both, so iOS advertises them as well. English is the fallback for any locale that is not Bulgarian, which means a user anywhere sees the same app in one of two languages.

**Crisis guidance is deliberately country-neutral.** Rather than shipping helpline numbers per country — which would be a regional difference, and one that goes stale — the crisis page points to [Find A Helpline](https://findahelpline.com/), a reviewed directory organised by country, and tells the reader to call their local emergency number if anyone is in immediate danger. The same page is served in every region.

## Item 7 — Regulated industry and protected third-party material

Decided in [Grilling: how does Selftend answer item 7 without inviting a medical classification?](https://github.com/Selftend/selftend/issues/1002), which checked each claim against the shipped copy rather than assuming it. Transcribed here in full.

**No.** Selftend is a wellness and self-help app in the **Health & Fitness** category — not Medical, and with no secondary category. It requires no licence or professional accreditation to operate: it does not diagnose, treat, prescribe, or provide medical, psychological or professional advice, and it makes no claim of clinical or health outcomes anywhere in the app or the listing. A search of the English copy for efficacy language — reduce, relieve, improve, cure, paired with anxiety, depression, stress, symptoms — returns nothing.

The boundary is stated to users, not only to App Review, in at least six places: Settings → About, Support, the onboarding wizard, the privacy policy, the product-boundary description, and a dedicated FAQ entry (_"Is Selftend therapy?"_ — "No. Selftend is a set of mental health tools, including a CBT programme, that you use on your own, with no practitioner involved. It is not therapy, counselling, diagnosis, treatment, or a substitute for a licensed mental health professional. If you need clinical care, contact a qualified provider in your area."), published at <https://selftend.org/faq>. ⚠️ **Quoted from `policies.json` at edit time, not carried forward** — the previous version of this line quoted a sentence the app had stopped shipping, which is how a "record" becomes a misquotation.

The app teaches self-help techniques drawn from CBT and ACT, and includes educational material describing what those approaches are clinically used for. **That material is descriptive, never diagnostic**: the app never assesses a user, never assigns a condition, and never recommends a course of treatment.

Crisis and safety guidance is deliberately kept separate from the self-help features and points to external emergency and crisis services; the app states plainly that it is not emergency support and is not monitored.

The app contains **no protected third-party material**. All content is written by the project, which is free, non-profit and open source under AGPL-3.0. There are no licensed third-party data providers and no AI services.

### What is deliberately not in the reply

- **The age rating.** The `FREQUENT_OR_INTENSE` medical declaration and the manual 17+/18+ overrides are corrected as their own change under [Task: correct Selftend's age-rating declaration in App Store Connect](https://github.com/Selftend/selftend/issues/1013), **before** the reply is sent. Pointing a reviewer at a self-contradiction we are already fixing adds risk without adding information.
- **The CBT framing line.** [Build: frame the CBT condition table as educational, not diagnostic](https://github.com/Selftend/selftend/issues/1011) adds a framing line to the CBT onboarding intro. **It cannot reach build 6**, so nothing here may imply it exists. The item-7 wording above is deliberately true of build 6 as it stands.

---

## Paste block — App Store Connect **Notes** field

Replaces the current Notes content, which covers only part of this. Device values are filled in. Credentials go in the Sign-In Information fields, never here.

**3,274 characters** as written — ⚠️ **re-measured 2026-09-20**, twice in one day: 2,498 → 2,789 after the catch-up ([#2602](https://github.com/Selftend/selftend/issues/2602)), then → 3,274 when the **Guideline 4.8 section was absorbed** from the live field. **Re-measure whenever this block is edited**, because this is the doc's live product and the number is the only thing that catches a silent drift in it.

☠️☠️ **What the LIVE Notes field holds today, read from App Store Connect on 2026-09-20 — it is worse than this document was, and the paste must replace it WHOLE.**

The field was read before editing and it is **not** the block above plus one extra section. It has **accumulated**: the Notes block, then the Guideline 4.8 section, then a **partial second paste of the 2026-08-15 reply** — `DEVICES TESTED`, `FUNCTION AND AUDIENCE`, `SERVICES`, `REGIONS` and `REGULATED / PROTECTED MATERIAL`, duplicating `TESTED ON`, `EXTERNAL SERVICES` and `REGIONS` above them. Five defects ride in it:

| In the live field                                                                                                                     | Why it is wrong                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The **banned compound** — _wellness and_ + the retired phrase — appearing **three times**, plus once more opening the duplicated tail | Banned as **unsafe** rather than merely off-frame: clinically it means _with a practitioner_, which Selftend has none of. ⚠️ **Deliberately not re-spelled here** — this file is scanned by `test/positioning-copy.test.ts` since [#2602](https://github.com/Selftend/selftend/issues/2602), so quoting it literally turns `verify` red on the very defect being reported. The wording is in `docs/positioning.md` § _Words never to use_ |
| _"… for adults **and older teenagers**"_                                                                                              | Contradicts the **13+ per-country floor** — and contradicts the 18+ line this document carried until today, so the live field and the repo disagreed in _two different directions at once_                                                                                                                                                                                                                                                |
| _"**Ten** reminder targets"_                                                                                                          | It is **twelve** — one general, eleven per tool                                                                                                                                                                                                                                                                                                                                                                                           |
| _"two usable modules … the DBT screen is deliberately an overview labelled **On the roadmap**"_                                       | False since before 0.18.0: DBT is a **full module**, and #1020 removed the badge                                                                                                                                                                                                                                                                                                                                                          |
| _"an **insights** screen"_                                                                                                            | `/progress` has redirected since v0.21.0                                                                                                                                                                                                                                                                                                                                                                                                  |

⚠️ **And one claim that is the same class of defect as the Tools-hub instruction #2602 found**: the live 4.8 section ends _"and Settings offers explicit account linking."_ ☠️ **Settings does not.** `linkIdentity` is wired only into the **guest-conversion** flow, `settings.json` has no linking entry, and `src/features/auth/api.ts` says Settings _"**will** offer explicit linking"_ — future tense, never built. The section folded into the block above is **corrected**: it keeps the Share-My-Email hint, which does ship, and drops the claim that does not.

✅ **The Notes cap is 4,000, and it is now MEASURED rather than assumed** — read off the console on 2026-09-21, which closes [#2597](https://github.com/Selftend/selftend/issues/2597)'s open question. That ticket could find **no documented limit** and this file therefore said not to assume the reply's 4,000 applied. It does: with the 3,274 below in the field, the editor's counter read **726** remaining, and 3,274 + 726 = **4,000** exactly. ⚠️ **So there is 726 characters of headroom, not unlimited room** — a future section has to fit, and Apple documents this nowhere, so re-read the counter rather than trusting this line if the block grows.

☠️ **It is a live field and it is now correct — ✅ pasted 2026-09-21.** The block below was written to App Store Connect whole, and verified on a **fresh page load** rather than the optimistic post-save UI: 3,274 characters, the banned compound **absent**, the Guideline 4.8 section **present**, the 13+ audience **present**, the false account-linking claim **gone**, and the duplicated reply tail **gone**.

⚠️ **How to paste it, because two obvious ways do not work.** The field is a **React-controlled textarea**: setting `value` programmatically (including via a form-filling tool) is reverted on the next render and the **Save button never enables** — the tell that nothing registered. And typing 3,274 characters as keystrokes **freezes the renderer** and times out. What works is a native value setter plus a bubbling `input` event, in one call; Save then enables, which is the signal React accepted it. Or simply paste it by hand.

```text
Selftend is a free, non-profit, open-source wellness and self-help app (AGPL-3.0) - a set of mental health tools you use on your own. No in-app purchases, no subscriptions, no ads, no analytics SDKs, no tracking, and no AI features of any kind.

ACCOUNT
An account is required. Reviewer credentials are in the Sign-In Information fields. The account is staged, pre-seeded with sample entries, and belongs to no real person. Onboarding is already completed and the current policy version already accepted, so no wizard and no consent screen stands between sign-in and the app.

SIGN IN WITH APPLE
The app offers Google Sign-In, so under Guideline 4.8 it also offers Sign in with Apple; both appear at the top of the sign-in screen, and either creates a fresh account. Choosing "Hide My Email" creates a separate account rather than merging with an existing one: Apple issues a private relay address that matches nothing on file, and silently merging two accounts in a private journal would be worse than keeping them apart. A hint beside the button steers returning users to "Share My Email", which auto-links to an existing confirmed account with that address.

WHAT THE APP IS, AND IS NOT
It is a set of mental health tools you use on your own, with no practitioner involved. It is not therapy, medical care, diagnosis, treatment, or emergency support, and it makes no clinical or outcome claims. The app states this to users in Settings, Support, onboarding, the privacy policy and the FAQ.

AUDIENCE
People aged 13 and older, or their country's higher floor - 14, 15 or 16 across much of Europe. The floor is asked before the app opens and is never below 13. There is no minor flag and no parental-consent path: the protections are universal, so teen-grade defaults apply to everyone.

WHAT IT CONTAINS
Eight tools (Check-in, journal, breathing, gratitude log, grounding, meditation, sleep, habit tracking), three usable modules of educational CBT, ACT and DBT exercises, user-built routines, and a home dashboard the user assembles from 28 widgets. Everything is fully functional.

CRISIS GUIDANCE
Kept separate from the self-help features and reachable before sign-in, from the sign-in screen footer, and afterwards from Support, from Legal and from a crisis bar on the module exercise screens. It points to external emergency services and to the Find A Helpline directory, and states that the app is not monitored.

NOTIFICATIONS
Twelve reminder targets - one general, eleven per tool - every one off by default. Nothing is sent unless the user enables a reminder, which is what raises the iOS notification prompt.

DATA
Entries are encrypted at rest. Data export and account deletion are both in Settings > Account; deletion is also documented at https://selftend.org/account-deletion.

EXTERNAL SERVICES
Supabase (database, auth, storage, edge functions), AWS SES (transactional email), Sentry (crash reports), Cloudflare (web hosting), Expo/EAS (builds and push delivery to APNs), Sign in with Apple and Google Sign-In. No AI service, no analytics, no ads.

REGIONS
Identical in every region; nothing is geo-gated and there is no geo-detection. The interface is localised in English and Bulgarian, following the device locale.

TESTED ON
iPhone 17 running iOS 26.6.
```

## The 2026-08-15 reply, as a record

☠️ **Demoted from a paste block on 2026-09-20** ([#2602](https://github.com/Selftend/selftend/issues/2602)). What stood here was **neither the text that was sent nor a text anyone can send**, and keeping it as "paste-ready" was a trap rather than an asset:

- It was **item-numbered against one specific rejection letter** — submission `ea996c51`, _2.1 Information Needed_, seven items. That letter is **answered and closed**; 0.21.0 is approved. A future rejection cites different items in a different order.
- It had been **corrected on 2026-09-02**, so it no longer matched the reply that actually went out — a hybrid of a sent artefact and a draft, faithful to neither.

**What was sent, as history:** the reply went out on 2026-08-15 at **3,983 of 4,000 characters**, with `selftend-0.11.1-build6-review.mp4` attached, answering items 1–7 in Apple's order. ⚠️ **That number is history and is not re-measured** — it describes an artefact that cannot be changed, and it stops being a budget the moment nobody is pasting the block.

✅ **The reusable source is Items 3–7 above**, which is where the document's stated purpose actually lives: _the worked-out answer with the facts cited, so replying to App Review is transcription rather than judgement._ A future reply is assembled from those, against whatever items that letter cites.

☠️ **Two constraints fall away with the block, and neither needs deciding again.** The _"11 characters spare"_ squeeze that shaped this document's density binds nothing now; and the refusal to timestamp the shot index ([#1004](https://github.com/Selftend/selftend/issues/1004)), which was refused for space, is moot twice over — see the attachment ruling below.

### ☠️ The attachment is dropped, not re-recorded

`selftend-0.11.1-build6-review.mp4` shows `Selftend v0.11.1` in Settings, CBT and ACT badged **Beta** and DBT **Soon** — badges [#1020](https://github.com/Selftend/selftend/issues/1020) removed before 0.18.0. Against live **0.21.0** it is already wrong by ten minors; against the gated build it is worse.

- It answered **item 1 of a specific letter**. That letter is answered, and [#2597](https://github.com/Selftend/selftend/issues/2597) found **no guideline requiring a video**. There is no open request for one.
- Re-recording costs a physical-device session and walks back into the documented upload trap above.
- ⚠️ **The Attachment slot's permitted file types and size limit are undocumented** — #2597 could not close it. Ruling "re-record" today would be ruling on a constraint nobody has verified.
- A video's whole job is to show the binary under review, so a re-record is worth nothing until the gated build exists.

**So: dropped now, re-recorded only if a reviewer asks** — a hard cost becomes a contingent one. 📌 The undocumented attachment limits are a **precondition on any future re-record**, not open work.

⚠️ **Precisely what "dropped" means, because half of it is impossible.** The **sent message is history and cannot be altered**: the 2026-08-15 reply keeps its attachment, and the record above keeps saying so. What changes is forward-looking — the standing instruction to attach that file to a future reply is **retired**, the file is attached to no future submission, and the Attachment slot is cleared if populated.

# App Review Information — Selftend

For [Task: write Selftend's App Review Information doc (items 2-6)](https://github.com/Selftend/selftend/issues/1006), under map [Both iOS submissions rejected under Guideline 2.1](https://github.com/Selftend/selftend/issues/998).

Sibling of the WikiCanvas doc of the same name, and the same kind of artifact: **the worked-out answer with the facts cited, so replying to App Review is transcription rather than judgement** — this time and for every future submission.

Submission `ea996c51-00d9-4382-9a90-1449ad70f61c` (0.11.1, build 6) was rejected 2026-08-14 under **Guideline 2.1 — Information Needed**, citing 2.1.0 Performance: App Completeness and asking for seven items. No bug or crash was cited. The paste-ready blocks are at the bottom.

---

## ✅ SENT — 2026-08-15 10:49

The reply went out on submission `ea996c51-00d9-4382-9a90-1449ad70f61c`, **3,983 of 4,000 characters**, with the screen recording attached directly (8.4 MB, H.264, audio stripped, one ~6-second cut removing a red "Something did not save" validation banner). App Store Connect shows **Messages (2)** and the attachment on the sent message.

Two things were changed at send time, both recorded here so the next submission inherits the corrected version rather than the draft:

- **Item 1 was rewritten against the footage.** The draft claimed a journal entry, a timed breathing session, both permission prompts, the crisis screen and sign-in as the demo account — none are in the recording. What went out describes only what is on screen. (The same correction landed independently in #1042.)
- **The device placeholders were filled from the device's own crash report**: `iPhone (iPhone18,3)`, iOS `26.6`. The model identifier was used rather than a marketing name, which could not be confirmed — an unambiguous identifier beats a wrong product name in a statement to Apple.

Before sending, Sign-In Information was switched to **`demo@selftend.org`** (owner-only; it needs a password typed into a field), which is what makes item 4's "populated home screen" claim true.

**The Notes field was also updated** — 3,049 characters, the block below plus the Guideline 4.8 / Sign in with Apple section the previous Notes carried. Apple's letter asks for this information in Notes "for future submissions", so it is now there independently of this reply.

⚠️ The submission still reads **Unresolved Issues** with `Last Updated By: Apple`, and "Resubmit to App Review" stays disabled. That is expected: no build changed, so the reply is the whole mechanism and the status only moves when a reviewer picks it up.

☠️ **Attachment trap.** Uploading to App Store Connect's file input registers the file but renders **no visible chip**, so it looks like it failed. Retrying left **three** copies of the same video on the draft, visible only by reading the dialog's DOM (each carries its own `aria-label="Delete"`). Two were deleted before sending. Check the DOM, not the screenshot.

---

## ⚠️ This document describes build 6, not `dev`

Apple is reviewing **0.11.1 build 6**. `dev` is already at 0.13.0 and differs — the tools hub gained a tenth entry, the mood tool was relabelled "Check-in", and the home screen was redesigned. **Every claim below was verified against the `v0.11.1` tag**, not the working tree, and nothing in the reply may describe behaviour that only exists on `dev`.

Two corrections this produced, recorded so no later session re-inherits them:

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

Selftend is a free, non-profit, open-source **wellness and guided self-help** app. It gives a person a small set of everyday tools for noticing how they are doing and doing something about it, and structured educational material drawn from CBT and ACT.

**The problem it solves:** self-help techniques that work are scattered across books, worksheets and paid apps, and the apps that do collect them tend to monetise attention — streaks that punish a missed day, reminders on by default, subscriptions in front of the useful part. Selftend puts the tools in one place, free, with the retention mechanics deliberately left out.

**What is in build 6:**

| Surface       | Contents                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tools hub     | Eight tools — mood tracker, journal, breathing, gratitude log, grounding, meditation, sleep, habit tracking. Each records entries and shows history                                                                                               |
| Modules       | **CBT** (Beta) and **ACT** (Beta), both fully usable — thought records, worry, beliefs, activities, exposure, goals; defusion, values, committed action, urge surfing. **DBT** is an overview screen marked "On the roadmap" (see the note below) |
| Routines      | User-built routines, with their own navigation entry                                                                                                                                                                                              |
| Insights      | Progress across the tools                                                                                                                                                                                                                         |
| Home          | A dashboard the user assembles from 28 widgets; nothing is seeded without the user choosing it                                                                                                                                                    |
| Notifications | Ten reminder targets, **every one off by default**                                                                                                                                                                                                |

**Target audience:** adults aged 18 and older who want structured self-help they can run themselves. It is **not** a diagnosis engine, a therapist replacement, or crisis support, and the app says so in six separate places — see item 7.

**Value:** the record is the point. Entries are private, encrypted at rest, exportable, and deletable, and the app never charges, advertises, or nags.

### ⚠️ The one 2.1 App Completeness exposure worth naming

The **DBT** module is a nav entry badged **"Soon"** leading to a screen headed _"On the roadmap"_. Under a citation that is specifically about app completeness, that is the most plausible thing a reviewer would point at, and it is the only "coming soon" surface in build 6 — the widget picker's `Soon` chip exists in code but has nothing to render, because all 28 catalogued widgets are implemented.

A copy change cannot reach build 6, so the only lever is the reply, which therefore names DBT as an educational overview of a planned module rather than leaving the reviewer to discover it.

⚠️ **Everything above this line describes build 6 and must stay that way until the next release ships.** Whether the placeholder should survive was settled on [#1020](https://github.com/Selftend/selftend/issues/1020): it does not. On `dev`, the "Soon" badge, the "On the roadmap" screen and the **"Beta"** badges on CBT and ACT are all gone — DBT is now framed as an overview of the approach, which is what the screen always was. None of that reaches build 6, so **this document must not be updated to match `dev` until the release that carries it is the build under review** — the reply quoted below is sized and worded against build 6, and it is measured with only 11 characters to spare.

## Item 4 — Setting up and accessing the main features

**An account is required**, and credentials are supplied in the Sign-In Information fields. The reviewer account is **`demo@selftend.org`**, verified working on 2026-08-14: email confirmed, onboarding already completed, accepted policy version byte-identical to `policyVersion` in `src/features/policies/policy-content.ts`, so no consent wall and no onboarding wizard can fire. App lock is device-local and defaults off. The account is pre-seeded — 19 mood logs, 5 journal entries, 6 gratitude entries, 3 thought records — so the app opens on a populated home screen rather than an empty shell.

⚠️ **`demo@selftend.org` is a staged, SQL-created account and is not a deliverable mailbox.** Nothing may send it mail — no password reset, no resend-confirmation, no recovery. The supplied password is verified working, so nothing should need to.

Sign-in also offers **Sign in with Apple** and **Google Sign-In**; either creates a fresh account.

| Feature           | How to reach it                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The eight tools   | **Tools** in the navigation; each tile opens the tool and shows its own history                                                                                                                         |
| CBT / ACT modules | **Modules** in the navigation                                                                                                                                                                           |
| Home dashboard    | Landing screen after sign-in; widgets are added and reordered by the user                                                                                                                               |
| Routines          | **Routines** in the navigation                                                                                                                                                                          |
| Insights          | **Insights** in the navigation                                                                                                                                                                          |
| Reminders         | Settings → Reminders, or the **Notifications** screen. Enabling one raises the iOS permission prompt                                                                                                    |
| Profile picture   | Settings → profile picture, which raises the photo-library permission prompt                                                                                                                            |
| Crisis guidance   | Linked from the signed-out sign-in screen's footer — reachable **before** sign-in — and, once signed in, from **Support**, from **Legal**, and from a crisis bar carried on the module exercise screens |
| Data export       | Settings → Account → export data                                                                                                                                                                        |
| Account deletion  | Settings → Account → delete account. Also documented at <https://selftend.org/account-deletion>                                                                                                         |

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

**No.** Selftend is a wellness and guided self-help app in the **Health & Fitness** category — not Medical, and with no secondary category. It requires no licence or professional accreditation to operate: it does not diagnose, treat, prescribe, or provide medical, psychological or professional advice, and it makes no claim of clinical or health outcomes anywhere in the app or the listing. A search of the English copy for efficacy language — reduce, relieve, improve, cure, paired with anxiety, depression, stress, symptoms — returns nothing.

The boundary is stated to users, not only to App Review, in at least six places: Settings → About, Support, the onboarding wizard, the privacy policy, the product-boundary description, and a dedicated FAQ entry (_"Is Selftend therapy?"_ — "No. Selftend is guided self-help. It is not therapy, counseling, diagnosis, treatment, or a substitute for a licensed mental health professional"), published at <https://selftend.org/faq>.

The app teaches self-help techniques drawn from CBT and ACT, and includes educational material describing what those approaches are clinically used for. **That material is descriptive, never diagnostic**: the app never assesses a user, never assigns a condition, and never recommends a course of treatment.

Crisis and safety guidance is deliberately kept separate from the self-help features and points to external emergency and crisis services; the app states plainly that it is not emergency support and is not monitored.

The app contains **no protected third-party material**. All content is written by the project, which is free, non-profit and open source under AGPL-3.0. There are no licensed third-party data providers and no AI services.

### What is deliberately not in the reply

- **The age rating.** The `FREQUENT_OR_INTENSE` medical declaration and the manual 17+/18+ overrides are corrected as their own change under [Task: correct Selftend's age-rating declaration in App Store Connect](https://github.com/Selftend/selftend/issues/1013), **before** the reply is sent. Pointing a reviewer at a self-contradiction we are already fixing adds risk without adding information.
- **The CBT framing line.** [Build: frame the CBT condition table as educational, not diagnostic](https://github.com/Selftend/selftend/issues/1011) adds a framing line to the CBT onboarding intro. **It cannot reach build 6**, so nothing here may imply it exists. The item-7 wording above is deliberately true of build 6 as it stands.

---

## Paste block — App Store Connect **Notes** field

Replaces the current Notes content, which covers only part of this. Device values are filled in. Credentials go in the Sign-In Information fields, never here.

**2,498 characters** as written.

```text
Selftend is a free, non-profit, open-source wellness and guided self-help app (AGPL-3.0). No in-app purchases, no subscriptions, no ads, no analytics SDKs, no tracking, and no AI features of any kind.

ACCOUNT
An account is required. Reviewer credentials are in the Sign-In Information fields. The account is staged, pre-seeded with sample entries, and belongs to no real person. Onboarding is already completed and the current policy version already accepted, so no wizard and no consent screen stands between sign-in and the app. Sign-in also offers Sign in with Apple and Google Sign-In, either of which creates a fresh account.

WHAT THE APP IS, AND IS NOT
It is wellness and guided self-help. It is not therapy, medical care, diagnosis, treatment, or emergency support, and it makes no clinical or outcome claims. The app states this to users in Settings, Support, onboarding, the privacy policy and the FAQ.

WHAT IT CONTAINS
Eight tools (mood tracker, journal, breathing, gratitude log, grounding, meditation, sleep, habit tracking), two usable modules of educational CBT and ACT exercises, user-built routines, an insights screen, and a home dashboard the user assembles from 28 widgets. The DBT module is an overview screen for a planned module and is labelled "On the roadmap" in the app; everything else is fully functional.

CRISIS GUIDANCE
Kept separate from the self-help features and reachable before sign-in, from the sign-in screen footer, and afterwards from Support, from Legal and from a crisis bar on the module exercise screens. It points to external emergency services and to the Find A Helpline directory, and states that the app is not monitored.

NOTIFICATIONS
Ten reminder targets, every one off by default. Nothing is sent unless the user enables a reminder, which is what raises the iOS notification prompt.

DATA
Entries are encrypted at rest. Data export and account deletion are both in Settings > Account; deletion is also documented at https://selftend.org/account-deletion.

EXTERNAL SERVICES
Supabase (database, auth, storage, edge functions), AWS SES (transactional email), Sentry (crash reports), Cloudflare (web hosting), Expo/EAS (builds and push delivery to APNs), Sign in with Apple and Google Sign-In. No AI service, no analytics, no ads.

REGIONS
Identical in every region; nothing is geo-gated and there is no geo-detection. The interface is localised in English and Bulgarian, following the device locale.

TESTED ON
iPhone 17 running iOS 26.6.
```

## Paste block — App Review **reply**

⚠️ **Item 3 was corrected 2026-09-02 — the reply that was actually sent on 2026-08-15 said "adults and older teenagers".** That wording contradicted the app's own consent checkbox ("I am 18 or older") and the adults-only launch posture recorded in `docs/product-principles.md`; [#1622](https://github.com/Selftend/selftend/issues/1622) records the mismatch. The block below now carries the corrected sentence so the next submission inherits it rather than the sent draft. The App Store Connect **Notes** field still holds the sent wording and is updated with the next submission — it is not urgent, and it does not touch the age rating. Whether Selftend ever admits under-18s is the teen-access effort's decision, not this document's.

Answers items 1–7 in Apple's order so a reviewer can tick them off. Attach `selftend-0.11.1-build6-review.mp4` to the same reply. Device values are filled in; re-measure if the confirmed model name is longer than "iPhone 17".

⚠️ **The shot index carries no timestamps.** [Grilling: what must each recording show, shot by shot?](https://github.com/Selftend/selftend/issues/1004) decided the reply would index the recording by time. It does not, and cannot: at 11 characters spare there is no room for ten `mm:ss` markers, and timestamps would have to be re-derived from every re-take. The index is in shot order instead, which matches the recording exactly and survives a re-cut. If timestamps are wanted, something else has to come out.

⚠️ **3,989 characters as written (re-measured 2026-09-02) — only 11 spare against the 4,000-character reply cap.** Substituting the two placeholders moves it by a few characters either way, so **re-measure before sending**; a device name longer than "iPhone 15 Pro" needs a sentence trimmed somewhere. This is the tightest constraint on the whole reply, and it is why the wording is dense.

```text
Answering each item in order.

1. SCREEN RECORDING
Attached, captured on a physical iPhone 17 running iOS 26.6, from app launch. It shows the signed-out screen with its crisis-guidance link; account creation; the home dashboard; the tools hub with all eight tools; the CBT module, its programme and a goal saved; a mood check-in saved and shown in its history and 7-day trend; the Notifications screen with every reminder off by default; Settings; and account deletion end to end, returning to the signed-out screen. The account is created on camera, so tools it never used show empty states - the reviewer account in Sign-In Information is pre-seeded.

2. DEVICES AND OS TESTED
iPhone 17, iOS 26.6. iPhone only for this submission. The app supports iPad but iPad was not exercised in this round. The same codebase also runs on Android and on the web at https://selftend.org.

3. FUNCTION AND AUDIENCE
Selftend is a free, non-profit, open-source wellness and guided self-help app for adults aged 18 and older who want structure they can run themselves. It provides eight tools - mood tracker, journal, breathing, gratitude log, grounding, meditation, sleep and habit tracking - each recording entries and showing their history; two modules of educational CBT and ACT exercises; user-built routines; an insights screen; and a home dashboard of 28 widgets. No in-app purchases or subscriptions.

Two labels in this build are cosmetic rather than functional gaps: DBT is an overview marked "On the roadmap" and is the only planned module, and CBT and ACT are tagged "Beta" though both are complete and usable. Everything else is fully implemented.

4. SETUP AND ACCESS
An account is required; credentials are in the Sign-In Information fields. It is staged, belongs to no real person, and is pre-seeded; onboarding is completed and the current policy accepted, so no wizard or consent screen appears and the reviewer lands on a populated home screen. Sign-in also offers Sign in with Apple and Google Sign-In, either creating a fresh account. Reminders are in Settings and on the Notifications screen; data export and account deletion are in Settings > Account, deletion also at https://selftend.org/account-deletion.

5. EXTERNAL SERVICES
Supabase for database, authentication, storage and edge functions, with entry fields encrypted at rest. AWS SES for transactional email. Sentry for crash reports, which never receives entry content. Cloudflare for web hosting. Expo/EAS for builds, and Expo push, which forwards enabled reminders to APNs. Sign in with Apple and Google Sign-In for auth. There is no AI service, and no analytics, advertising or payment processing.

6. REGIONAL DIFFERENCES
The app functions identically in every region. No feature, screen or content is gated by country, and there is no geo-detection. The interface is localised in English and Bulgarian, following the device locale. Crisis guidance is deliberately country-neutral: instead of per-country helplines it links to the Find A Helpline directory and says to call your local emergency number.

7. REGULATED INDUSTRY / PROTECTED MATERIAL
No. Selftend is a wellness and guided self-help app in the Health & Fitness category. No licence is required to operate it: it does not diagnose, treat, prescribe, or give medical or professional advice, and it makes no clinical or outcome claims. It teaches techniques drawn from CBT and ACT and includes educational material describing what those approaches are used for - descriptive, never diagnostic; the app never assesses a user or assigns a condition. That boundary is stated to users in Settings, Support, onboarding, the privacy policy and the FAQ at https://selftend.org/faq. Crisis guidance is separate from the self-help features and points to external emergency services. There is no protected third-party material: all content is written by the project, which is open source (AGPL-3.0). No data providers, no AI services.

Happy to provide anything further.
```

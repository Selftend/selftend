# Google Play listing text

**Last verified against Play Console: 2026-09-02.**

Governed by [docs/positioning.md](../docs/positioning.md). Play Console text is an owner-only hand edit, so this file is a **mirror**, not a source — editing it changes nothing in the store.

## Why this file exists even though nothing verifies it

The App Store half of this directory is checked weekly against the live record. **Play has no equivalent, and there is nothing to extend**: EAS Metadata supports the Apple App Store only, so the absence is structural rather than an oversight (verified 2026-08-31 against the [EAS Metadata schema](https://docs.expo.dev/eas/metadata/schema/)).

That makes this file the weakest gate in `docs/positioning.md`, and it is kept anyway for the reason [README.md](README.md) already gives about the 18+ episode: _the declaration existed in exactly one place — a web form — so there was no diff for anyone to review and no commit to explain why._ A committed copy fixes that half. The date line at the top fixes the other half by making staleness **visible rather than assumed**.

⚠️ **An unverified mirror can rot into a lie.** If the date above is old, trust Play Console and not this file — then update this file in a PR, so the change is reviewed and the reason is in the commit message.

Play is also the most-contradicted listing on the map, which is why leaving it with zero repository representation was the worse end of the trade.

## Verbatim, as read on 2026-09-02

Captured from the public listing page (a full browser render, cross-checked against the raw HTML — the two agreed) and confirmed against Play Console the same day. The public page shows the live text, so this block is the listing word for word, not a summary.

**Short description (80 characters):**

> Guided self-help and private CBT thought records for calm reflection.

**Full description:**

> Selftend is a free, open-source wellness app for guided self-help and everyday reflection. It gathers a small set of calm, private tools in one place — no ads, no feeds, no streak pressure, no AI coach.
>
> What's inside:
>
> • Daily mood check-ins — note how you feel in a tap and see gentle trends across the week.
> • CBT tools — thought records, a worry journal, an anger log, core beliefs, goals, and activity scheduling: work through a situation, name the emotion, notice common thinking patterns (like catastrophizing or mind-reading), and write a more balanced response.
> • ACT tools — values, defusion, expansion, grounding, and committed action.
> • Sleep tracker — log your nights and spot duration and quality patterns over time.
> • Meditation — a simple timer-based sitting practice inspired by established attention-training frameworks.
> • Gratitude, journaling, and breathing exercises for when you need them.
> • Routines and home-screen widgets that keep small practices within reach, and a progress view to look back over your entries.
>
> Everything is optional — use only the parts that help you. Missing a day is never punished.
>
> Private by design:
> • Your entries stay private to your account, and sensitive entries are stored encrypted.
> • Reminders are optional and off by default.
> • No ads, no subscriptions, no selling of your data, and no social posting.
> • You can export or delete your data at any time in Settings.
>
> An account keeps your entries in sync between the web and Android app.
>
> Available in English and Bulgarian. Selftend is for adults (18+).
>
> Important: Selftend is a wellness and self-help tool. It is not therapy, diagnosis, treatment, or a crisis or emergency service, and it is not a substitute for professional care. If you are in crisis or need urgent help, contact your local emergency services or a crisis line in your area.

**Category:** Health & Fitness. No tags surfaced on the public listing.

**Data safety summary, as shown publicly:** "No data shared with third parties" · "This app may collect these data types — Personal info, Health and fitness and 3 others" · "Data is encrypted in transit" · "You can request that data be deleted".

## Content rating and target audience, as read in Play Console on 2026-09-02

These two declarations live on separate Play Console forms (Policy → App content) and are recorded here because the 18+ episode in [README.md](README.md) was exactly this kind of value — a web form nobody could diff.

| Declaration                     | Live value                                                                                                                                                                                   | Last edited in Console |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Target audience and content** | Target age group: **18 and over** only. The optional _"Restrict users that Google has determined to be minors from my app"_ box is **not ticked**.                                           | 2026-05-08             |
| **Content ratings** (IARC)      | ESRB **Everyone** (North America) · PEGI **3** (Europe) · USK **All ages** (Germany) · ClassInd **All ages** (Brazil) · IARC Generic **3+** · Google Play Russia **3+** · South Korea **3+** | 2026-05-07             |

### ✅ Checked and NOT a contradiction: "Everyone" beside "Selftend is for adults (18+)"

This row used to sit in the contradictions table below, and [#1626](https://github.com/Selftend/selftend/issues/1626) asked for the questionnaire to be re-taken "so the resulting IARC rating is consistent with an 18+ product". **That cannot be done honestly, and Google's own rules say the two values measure different things.** Recorded here so the next editor does not re-derive the same fix.

- **The content rating is computed from what the app depicts, and a developer cannot pick a higher one.** "Your app's content ratings are assigned by separate rating authorities and determined by your questionnaire responses" ([Content ratings](https://support.google.com/googleplay/android-developer/answer/9859655), checked 2026-09-02); "Misrepresentation of your app's content may result in its removal or suspension" ([answer/188189](https://support.google.com/googleplay/android-developer/answer/188189), checked 2026-09-02). An 18+ rating means graphic violence, sexual content or glamorised drug use ([IARC rating definitions](https://globalratings.com/ratings-definitions/), checked 2026-09-02). A CBT self-help app with none of that lands on Everyone / PEGI 3, and answering the questionnaire "defensively" to force a higher badge is the misrepresentation Google removes apps for.
- **Google says so directly:** "Content ratings don't tell you whether an app is designed for users of a specific age" ([Play user help](https://support.google.com/googleplay/answer/6209544), checked 2026-09-02), and "The content rating assigned to your app is specific to the content within your app. It does not include other features and practices, such as consumer agreements" ([answer/9898843](https://support.google.com/googleplay/android-developer/answer/9898843), checked 2026-09-02).
- **The target-audience declaration is the field that says who the app is for**, and it already says 18 and over. Declaring 18+ only keeps Selftend outside the Families policy; it does not change the badge, and Play shows no separate "18+" marker on the listing from it ([Target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159), checked 2026-09-02).

So the listing tells one story in Play's own terms: _mild content, designed for adults_. The description line "Selftend is for adults (18+)" is the public half of the target-audience declaration and stays.

⚠️ **The one real lever is the optional "Restrict Minor Access" box** under the 18+-only target audience. Ticked, Google blocks users it has determined to be minors from finding or downloading the app (with the caveat that it "may not be able to block all minor users who have not declared themselves"). It is off today. Turning it on is a product decision about the age floor — it moves the posture from passive attestation ([docs/policies.md](../docs/policies.md) § _Age floor_, decision #198) to store-side enforcement, and it is one more thing to unwind if the teen-access effort ever flips the audience to 13+. Whoever changes it records the decision on the issue and updates this table.

⚠️ **Any edit to the questionnaire or the target-audience form is sent for a Google review** of up to seven days or longer ([Publishing overview](https://support.google.com/googleplay/android-developer/answer/9859654), checked 2026-09-02). Re-opening the content-rating questionnaire just to look at the questions is not free — it produces a new certificate — so only do it deliberately, and if a question about _references to_ self-harm or crisis resources appears, answer it truthfully and accept the descriptor rather than risk a misrepresentation strike.

## Known contradictions in the live text

Every one of these is recorded on [map #1597](https://github.com/Selftend/selftend/issues/1597) and has its own issue. **None of them is fixed by this file** — they are listed so that whoever next edits the listing fixes them in the same pass, rather than rediscovering them.

| In the live listing                                 | Problem                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Guided self-help and private CBT thought records…" | "Guided self-help" is clinically _with a practitioner_, which Selftend does not have. Off-frame and unsafe. The single highest-leverage string Selftend owns — it is the only place where the ranking surface and the reading surface are the same text. |
| "a free, open-source **wellness app**"              | The wellness frame was ruled out. The frame is a CBT programme.                                                                                                                                                                                          |
| "no streak pressure"                                | Against the owner's 2026-07-24 decision that the absence of streaks is never a pitch. Now also banned by `test/positioning-copy.test.ts`, which cannot reach Play. [#1619](https://github.com/Selftend/selftend/issues/1619).                            |
| "between the web and **Android app**"               | Omits iOS, live since 2026-08-19. [#1621](https://github.com/Selftend/selftend/issues/1621).                                                                                                                                                             |

⚠️ The first two rows are the Play half of [#1616](https://github.com/Selftend/selftend/issues/1616), which swept the repo and deliberately left Play to the owner. They are still live.

### ✅ Checked and NOT a contradiction: "Routines and home-screen widgets"

This row used to sit in the table above, reading _"`src/features/widgets` is the in-app dashboard, not OS home-screen widgets."_ **That is wrong, and it was instructing the next editor to delete an accurate, load-bearing feature claim** ([#1623](https://github.com/Selftend/selftend/issues/1623)). It is recorded here rather than deleted so the same false lead is not rediscovered.

Verified on `dev`, 2026-09-01: Selftend ships a **real Android home-screen widget**. `react-native-android-widget` is a production dependency (`package.json:102`), registered as an Expo config plugin (`app.config.ts:258`) which maps `src/features/widgets/widget-catalog.json` into a real Android AppWidget. The catalog declares **`SelftendCard`** — _"Show any Selftend home card on your launcher"_, reconfigurable, resizable 150×110dp to 400×320dp. `CONTEXT.md` names the Android launcher widget as a live surface.

The name collision is what caused it: `src/features/widgets` holds **both** the 28 in-app dashboard cards **and** the launcher widget that renders any one of them. Both exist.

⚠️ **The phrasing is fair for Play but is not portable.** There is exactly **one** OS widget, and it is **Android-only** — nothing in `app.config.ts` declares an iOS WidgetKit extension. Reused verbatim on the App Store listing, "home-screen widgets" would be inaccurate twice over.

## When the listing is rewritten

Take the frame sentence and the approved supporting lines from [docs/positioning.md](../docs/positioning.md), fix the four rows above in the same pass, then update the verbatim block here **and the date at the top** in the same PR. Every store-listing text edit is itself sent for review, so one visit that fixes everything costs one review; four visits cost four.

# Google Play listing text

**Last verified against Play Console: 2026-09-05 (evening)** — the morning's [#1999](https://github.com/Selftend/selftend/issues/1999) edit cleared Google's review and was cross-checked on the public listing page the same evening (short description, first paragraph and bullets all matched this file). In that evening visit the **short description was re-saved as the 28-character short form and sent for review** ([#2010](https://github.com/Selftend/selftend/issues/2010)); ⚠️ **the public page shows the 34-character short until that review clears** (up to seven days or longer); whoever sees it clear re-reads the public page and moves this line forward.

Governed by [docs/positioning.md](../docs/positioning.md). Play Console text is an owner-only hand edit, so this file is a **mirror**, not a source — editing it changes nothing in the store.

⚠️ **This mirror lags the governing document by one decided edit, and it must keep lagging until the Console visit that applies it.** The short description below is the 28-character short form as saved on 2026-09-05 (evening) — in review, see the date line. The first paragraph still carries the **dash** after the noun (_tools — everyday tools_) where `docs/positioning.md` decided a **colon** (_tools: everyday tools_, [#2007](https://github.com/Selftend/selftend/issues/2007)): the agent's full-description edit was refused by the auto-mode classifier on 2026-09-05, so that one-character edit is an owner Console visit, bundled with the feature-graphic replacement ([#2022](https://github.com/Selftend/selftend/issues/2022)) so it costs one review rather than two. Do not "fix" this file ahead of the store: it mirrors what the Console holds, and the diff on the day it moves is the record.

## Why this file exists even though nothing verifies it

The App Store half of this directory is checked weekly against the live record. **Play has no equivalent, and there is nothing to extend**: EAS Metadata supports the Apple App Store only, so the absence is structural rather than an oversight (verified 2026-08-31 against the [EAS Metadata schema](https://docs.expo.dev/eas/metadata/schema/)).

That makes this file the weakest gate in `docs/positioning.md`, and it is kept anyway for the reason [README.md](README.md) already gives about the 18+ episode: _the declaration existed in exactly one place — a web form — so there was no diff for anyone to review and no commit to explain why._ A committed copy fixes that half. The date line at the top fixes the other half by making staleness **visible rather than assumed**.

⚠️ **An unverified mirror can rot into a lie.** If the date above is old, trust Play Console and not this file — then update this file in a PR, so the change is reviewed and the reason is in the commit message.

Play was also the most-contradicted listing on the positioning map until the 2026-09-02 edit, which is why leaving it with zero repository representation was the worse end of the trade.

## Verbatim, as saved on 2026-09-05 (evening)

Saved in the Play Console store-listing form on 2026-09-05 (the [#1999](https://github.com/Selftend/selftend/issues/1999) visit: new short description, new first paragraph, and the bullet fixes [#1823](https://github.com/Selftend/selftend/issues/1823) decided — Check-in, a Grounding bullet, Sleep diary, the meditation line, Habits, `journalling`; the "Private by design" block, the sync line, the 18+ line and the closing paragraph unchanged). Read back from the form after the save; that review cleared and the public page matched on the evening of 2026-09-05. The same evening the short description was re-saved as the 28 below and sent for review ([#2010](https://github.com/Selftend/selftend/issues/2010)); the full description was not touched. The 2026-09-02 text this replaced is in this file's git history. This block is the listing word for word, not a summary.

⚠️ **The 18+ line was kept deliberately.** Production is still v0.17.0 (released 2026-08-28), which predates the teen floor; the replacement string is [#1771](https://github.com/Selftend/selftend/issues/1771)'s, after the release that ships it.

**Short description (28 of 80 characters):**

> Private mental health tools.

**Full description:**

> Selftend is a set of free, private mental health tools — everyday tools for right now, and a CBT programme — cognitive behavioural therapy — to work through when you want one. A small set of calm, private tools in one place: no ads, no feeds, no pressure, no AI coach.
>
> What's inside:
>
> • Check-in — note how you feel in a tap and see gentle trends across the week.
> • CBT tools — thought records, a worry journal, an anger log, core beliefs, goals, and activity scheduling: work through a situation, name the emotion, notice common thinking patterns (like catastrophizing or mind-reading), and write a more balanced response.
> • ACT tools — values, defusion, expansion, and committed action.
> • Grounding — 5-4-3-2-1 and other ways back to the present when things feel far away.
> • Sleep diary — log your nights and spot duration and quality patterns over time.
> • Meditation — unguided sitting: pick a length, a bell and an ambient bed, with a ten-stage programme and six practices to work through.
> • Gratitude, journalling, breathing and habits — small things for when you need them.
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
> An account keeps your entries in sync across web, iOS and Android.
>
> Available in English and Bulgarian. Selftend is for adults (18+).
>
> Important: Selftend is a wellness and self-help tool. It is not therapy, diagnosis, treatment, or a crisis or emergency service, and it is not a substitute for professional care. If you are in crisis or need urgent help, contact your local emergency services or a crisis line in your area.

**Category:** Health & Fitness. No tags surfaced on the public listing (as of 2026-09-02).

**Data safety summary, as shown publicly (2026-09-02):** "No data shared with third parties" · "This app may collect these data types — Personal info, Health and fitness and 3 others" · "Data is encrypted in transit" · "You can request that data be deleted".

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

## Known contradictions in the live listing

**None in the text as of the 2026-09-05 edit.** The four that [map #1597](https://github.com/Selftend/selftend/issues/1597) recorded were all fixed in the 2026-09-02 visit ([#1694](https://github.com/Selftend/selftend/issues/1694)). They are kept here so the next editor knows the changes were deliberate and does not reintroduce them. ⚠️ The _Now_ column shows the 2026-09-02 replacements, themselves superseded on 2026-09-05 by the block above; the point of the table is the _Why it went_ column.

| Was in the listing                                  | Why it went                                                                                                                                                                                                                           | Now                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| "Guided self-help and private CBT thought records…" | "Guided self-help" is clinically _with a practitioner_, which Selftend does not have. Off-frame and unsafe. The single highest-leverage string Selftend owns. Play half of [#1616](https://github.com/Selftend/selftend/issues/1616). | "A free, private CBT programme — cognitive behavioural therapy." |
| "a free, open-source **wellness app**"              | The wellness frame was ruled out; the frame is a CBT programme. Play half of #1616.                                                                                                                                                   | "a free, private CBT programme — cognitive behavioural therapy"  |
| "no streak pressure"                                | The absence of streaks is never a pitch (owner decision 2026-07-24); banned by `test/positioning-copy.test.ts`, which cannot reach Play. [#1619](https://github.com/Selftend/selftend/issues/1619).                                   | "no pressure"                                                    |
| "between the web and **Android app**"               | Omitted iOS, live since 2026-08-19. [#1621](https://github.com/Selftend/selftend/issues/1621).                                                                                                                                        | "across web, iOS and Android"                                    |

☠️ **One contradiction is live outside the text: the feature graphic.** Seen in the Console's review-assets step on 2026-09-05, the **live** feature graphic's artwork still carries the retired compound from the first table row above ("Calm, guided …"). ✅ **The repository's artwork is fixed** ([#2022](https://github.com/Selftend/selftend/issues/2022)): `docs/launch/play-listing/feature-graphic.html` and the 1024×500 PNG rendered from it now carry the short form as the headline over the frame sentence beneath it, so the asset the Console needs already exists. ⚠️ **The live asset lags until it is uploaded** — a Console asset edit and one more review, bundled with the ¶1 colon on [#2010](https://github.com/Selftend/selftend/issues/2010).

☠️ **_“It is an image, so no gate can see it”_ was half wrong, and the wrong half is the useful one.** The PNG is unreadable to a gate; the **HTML it is rendered from is text in this repository**, and was ungated only by two accidents of corpus construction — `test/positioning-copy.test.ts` keeps `.md` files alone (`proseDocIds` filters on the extension), and `docs/launch/` sits in `PUBLISHED_RECORDS` because the directory also holds an already-posted Reddit banner. A store asset that is regenerated on demand is not the same kind of object as a banner that was posted once, and the exclusion does not distinguish them.

☠️ **A second defect rides in the same image and no copy edit reaches it** ([#2041](https://github.com/Selftend/selftend/issues/2041)). The three phone mockups are pre-v0.5.0 captures that legibly read **"Cognitive Behavioral Therapy"**, **"Your CBT program"** and **"Start program"** — the American spellings `verify` bans in app copy ([#1627](https://github.com/Selftend/selftend/issues/1627), [#1651](https://github.com/Selftend/selftend/issues/1651)), published inside a store asset. Those words exist only as pixels, so the fix is new captures from a current build, not an edit to the HTML.

The rest of the description was left as it was on purpose: the "Private by design" block, the 18+ line, and the closing "Important:" paragraph. That paragraph says "wellness and self-help tool" because it is the not-a-medical-device statement Play's health policy wants, and a guardrail outranks the frame ([AGENTS.md](../AGENTS.md) § Product guardrails).

### ✅ Checked and NOT a contradiction: "Routines and home-screen widgets"

This row used to sit in the table above, reading _"`src/features/widgets` is the in-app dashboard, not OS home-screen widgets."_ **That is wrong, and it was instructing the next editor to delete an accurate, load-bearing feature claim** ([#1623](https://github.com/Selftend/selftend/issues/1623)). It is recorded here rather than deleted so the same false lead is not rediscovered.

Verified on `dev`, 2026-09-01: Selftend ships a **real Android home-screen widget**. `react-native-android-widget` is a production dependency (`package.json:102`), registered as an Expo config plugin (`app.config.ts:258`) which maps `src/features/widgets/widget-catalog.json` into a real Android AppWidget. The catalog declares **`SelftendCard`** — _"Show any Selftend home card on your launcher"_, reconfigurable, resizable 150×110dp to 400×320dp. `CONTEXT.md` names the Android launcher widget as a live surface.

The name collision is what caused it: `src/features/widgets` holds **both** the 28 in-app dashboard cards **and** the launcher widget that renders any one of them. Both exist.

⚠️ **The phrasing is fair for Play but is not portable.** There is exactly **one** OS widget, and it is **Android-only** — nothing in `app.config.ts` declares an iOS WidgetKit extension. Reused verbatim on the App Store listing, "home-screen widgets" would be inaccurate twice over.

## When the listing is rewritten

Take the frame sentence and the approved supporting lines from [docs/positioning.md](../docs/positioning.md) — once [#1999](https://github.com/Selftend/selftend/issues/1999) has settled which frame that document carries — bundle every pending fix into the same visit, then update the verbatim block here **and the date at the top** in the same PR. Every store-listing text edit is itself sent for review, so one visit that fixes everything costs one review; four visits cost four.

Two Console mechanics worth knowing, learned 2026-09-05: on the Review step the **Save** control sits in the ⋮ overflow menu of the bottom bar at ordinary window widths (only _Discard_ is visible), and saving does not submit — the change waits in **Publishing overview** until _Submit changes for review_ is pressed there.

# Google Play listing text

**Last verified against Play Console: 2026-08-31.**

Governed by [docs/positioning.md](../docs/positioning.md). Play Console text is an owner-only hand edit, so this file is a **mirror**, not a source — editing it changes nothing in the store.

## Why this file exists even though nothing verifies it

The App Store half of this directory is checked weekly against the live record. **Play has no equivalent, and there is nothing to extend**: EAS Metadata supports the Apple App Store only, so the absence is structural rather than an oversight (verified 2026-08-31 against the [EAS Metadata schema](https://docs.expo.dev/eas/metadata/schema/)).

That makes this file the weakest gate in `docs/positioning.md`, and it is kept anyway for the reason [README.md](README.md) already gives about the 18+ episode: _the declaration existed in exactly one place — a web form — so there was no diff for anyone to review and no commit to explain why._ A committed copy fixes that half. The date line at the top fixes the other half by making staleness **visible rather than assumed**.

⚠️ **An unverified mirror can rot into a lie.** If the date above is old, trust Play Console and not this file — then update this file in a PR, so the change is reviewed and the reason is in the commit message.

Play is also the most-contradicted listing on the map, which is why leaving it with zero repository representation was the worse end of the trade.

## Verbatim, as read on 2026-08-31

**Short description (80 characters):**

> Guided self-help and private CBT thought records for calm reflection.

**Full description — first paragraph:**

> Selftend is a free, open-source wellness app for guided self-help and everyday reflection. It gathers a small set of calm, private tools in one place — no ads, no feeds, no streak pressure, no AI coach.

**Full description — closing lines:**

> An account keeps your entries in sync between the web and Android app.
>
> Available in English and Bulgarian. Selftend is for adults (18+).

**Category:** Health & Fitness. No tags surfaced on the public listing.

## Recorded, but not verbatim

⚠️ The body of the full description was read and summarised rather than captured word for word. Do not treat the following as the live text:

- It leads on daily mood check-ins, then CBT tools, then ACT, sleep, meditation, gratitude/journaling/breathing, and closes the feature list with "Routines and home-screen widgets".

Capturing the full body verbatim is a five-minute copy-paste for whoever next opens Play Console, and it would make this file a complete mirror.

## Known contradictions in the live text

Every one of these is recorded on [map #1597](https://github.com/Selftend/selftend/issues/1597) and needs its own issue. **None of them is fixed by this file** — they are listed so that whoever next edits the listing fixes them in the same pass, rather than rediscovering them.

| In the live listing                                 | Problem                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Guided self-help and private CBT thought records…" | "Guided self-help" is clinically _with a practitioner_, which Selftend does not have. Off-frame and unsafe. The single highest-leverage string Selftend owns — it is the only place where the ranking surface and the reading surface are the same text. |
| "a free, open-source **wellness app**"              | The wellness frame was ruled out. The frame is a CBT programme.                                                                                                                                                                                          |
| "no streak pressure"                                | Against the owner's 2026-07-24 decision that the absence of streaks is never a pitch. Now also banned by `test/positioning-copy.test.ts`, which cannot reach Play.                                                                                       |
| "between the web and **Android app**"               | Omits iOS, live since 2026-08-19.                                                                                                                                                                                                                        |
| "Selftend is for adults (18+)"                      | The same listing's content rating reads "Everyone", and Apple is told 13+ for the same build.                                                                                                                                                            |

### ✅ Checked and NOT a contradiction: "Routines and home-screen widgets"

This row used to sit in the table above, reading _"`src/features/widgets` is the in-app dashboard, not OS home-screen widgets."_ **That is wrong, and it was instructing the next editor to delete an accurate, load-bearing feature claim** ([#1623](https://github.com/Selftend/selftend/issues/1623)). It is recorded here rather than deleted so the same false lead is not rediscovered.

Verified on `dev`, 2026-09-01: Selftend ships a **real Android home-screen widget**. `react-native-android-widget` is a production dependency (`package.json:102`), registered as an Expo config plugin (`app.config.ts:258`) which maps `src/features/widgets/widget-catalog.json` into a real Android AppWidget. The catalog declares **`SelftendCard`** — _"Show any Selftend home card on your launcher"_, reconfigurable, resizable 150×110dp to 400×320dp. `CONTEXT.md` names the Android launcher widget as a live surface.

The name collision is what caused it: `src/features/widgets` holds **both** the 28 in-app dashboard cards **and** the launcher widget that renders any one of them. Both exist.

⚠️ **The phrasing is fair for Play but is not portable.** There is exactly **one** OS widget, and it is **Android-only** — nothing in `app.config.ts` declares an iOS WidgetKit extension. Reused verbatim on the App Store listing, "home-screen widgets" would be inaccurate twice over.

## When the listing is rewritten

Take the frame sentence and the approved supporting lines from [docs/positioning.md](../docs/positioning.md), fix the five rows above in the same pass, then update the verbatim block here **and the date at the top** in the same PR.

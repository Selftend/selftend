# The Google Play promo video

**Last verified against the live listing: 2026-09-22** — the video is still attached, still
public, and still the **first tile in the media carousel, before screenshot `01`**. It is the
first moving thing a visitor to the Play page sees.

⚠️ **This file is a record, not a mirror, and it cannot become one.** The other files in this
directory hold text a gate can read. This one describes **36 seconds of pixels**, and no gate
in this repository can read a pixel — the same honest gap [#2618](https://github.com/Selftend/selftend/issues/2618)
recorded for the screenshot set. What it buys is that the asset **exists in the repository at
all**: until [#2626](https://github.com/Selftend/selftend/issues/2626) nothing in `store/`,
`docs/launch/` or `docs/campaign/` recorded that a video was attached to the Play listing, so
the listing's most prominent asset had never been held to the standard its stills were.

☠️ **The video is not re-cuttable from this repository.** The campaign harness's `capture-lib.js`
lives outside the repo, on the owner's machine (`docs/campaign/capture/shoot.js:10` — _"executes
on the owner's machine only"_). So of the three ways this asset can go, **only _pull_ is available
without the owner's machine.**

## What is live

| Field                    | Value                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Video id                 | `_Dz9sawqGY4`                                                                                                 |
| Watch URL                | <https://www.youtube.com/watch?v=_Dz9sawqGY4>                                                                 |
| As the listing serves it | `data-trailer-url="https://www.youtube.com/embed/_Dz9sawqGY4?vq=large&rel=0&autohide=1&showinfo=0"`           |
| Title                    | "Selftend — The quiet minute (Google Play)"                                                                   |
| Channel                  | `@Selftend`                                                                                                   |
| Duration                 | 36 seconds                                                                                                    |
| Uploaded                 | **2026-08-18T15:28−07:00**                                                                                    |
| Its description          | "A quiet minute across the app — check-in, breathing, journal, a CBT thought record, and an evening routine." |
| Position                 | First tile in the Play media carousel, ahead of screenshot `01`                                               |
| Thumbnail                | `maxresdefault.jpg` — a plain title card, `SELFTEND · GOOGLE PLAY` / "The quiet minute."                      |

📌 **Where it came from.** This is the Play variant of the campaign trailer scripted at
`docs/campaign/scripts/trailer.md` ("The quiet minute" promo), storyboard
[#625](https://github.com/Selftend/selftend/issues/625). ⚠️ **The script says ~29s and the
published cut is 36s** — the scripts index records the intended length, not the delivered one,
and nothing in `docs/campaign/` carries a published video id. That index is a production record;
this file is the published-asset record, and the two are not interchangeable.

☠️ **Uploaded one day before the screenshot seed date.** [#2616](https://github.com/Selftend/selftend/issues/2616)
dated the live screenshot set to ~2026-08-19 from its own seed. This video is from the same
campaign run and photographs the same product state — **before [#2114](https://github.com/Selftend/selftend/issues/2114)**
deleted the Tools hub, and before the [#1627](https://github.com/Selftend/selftend/issues/1627) /
[#1651](https://github.com/Selftend/selftend/issues/1651) spellings reached the surfaces it films.

## What it shows

Read second by second on 2026-09-21 ([#2626](https://github.com/Selftend/selftend/issues/2626)),
by the storyboard method recorded below.

| seconds | scene                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| 0–3     | Title card — "For the loud days — and the quiet ones."                                 |
| 4–7     | **Home** — "Good morning, Sam.", sections **"Your tools"** and **"Guided programmes"** |
| 8–9     | Check-in — "How are you feeling?", emotion chips, a dated entry                        |
| 10–12   | Breathing session — eyebrow `BOX BREATHING`, "Inhale", "Cycle 1 of 19 · 5:02 left"     |
| 13–15   | Journal entry                                                                          |
| 16–19   | **New thought record**                                                                 |
| 20–23   | **Evening wind-down** (a routine)                                                      |
| 24–26   | Home again                                                                             |
| 27–32   | "Free. Open source. No ads, subscriptions, or paywalls."                               |
| 33–36   | "Download Selftend." + Google Play badge                                               |

## ☠️ Finding 1 — it photographs a Home the app no longer renders

The Home section headers in frame are **"Your tools"** and **"Guided programmes"**.

- ⚠️ **Neither string exists in `src/i18n/locales/en/` as a Home section header.** "Your tools"
  survives only inside `graduationBodyEmpty` in the CBT/ACT/DBT namespaces; "Guided programmes"
  does not appear at all.
- ✅ Today's Home reads **"Favourites"** then **"Tools"** — verified against `01-home.png` from
  [run 35623729810](https://github.com/Selftend/selftend/actions/runs/35623729810).

Home is the video's most-shown screen — it appears twice, ~7 of 36 seconds — and it is a shape
the product has replaced. This is the [#2041](https://github.com/Selftend/selftend/issues/2041)
situation exactly: **store imagery is copy, and the remedy for stale pixels is new captures, not
a copy edit.**

## ☠️ Finding 2 — a date is in frame

The check-in and journal screens carry a visible **`Aug 18, 2026`** timestamp — confirming the
same campaign run as the stills, and confirming the pre-#2114 product state above.

## ✅ What came back clean

- **No `TOOLS ·` or `MODULES ·` breadcrumb prefix** anywhere legible; the breathing eyebrow reads
  a plain `BOX BREATHING`.
- **No Tools hub screen.** Home lists the tools directly, so the `<Redirect href="/" />` screen
  never appears.
- **The closing copy holds** — free, open source, no ads, no subscriptions, no paywalls — squarely
  inside the guardrails.
- **No banned compound in any legible text**, and the on-page description and the thumbnail were
  both read separately and are clean (the [#2010](https://github.com/Selftend/selftend/issues/2010)
  sweep reached the nine YouTube descriptions on 2026-09-06).
- 📌 Note **"Guided programmes" is not the retired compound** — `docs/positioning.md` is explicit
  that _programme_ does not re-import what killed the banned phrasing. Finding 1 is a staleness
  finding, not a positioning one.

## ⚠️ What is unchecked — not cleared

The storyboard gives 37 frames at **320×180** and only three at 1280×720, all three landing
inside the same breathing-session moment. At 320×180 body copy is unreadable. So these were
**never read**, and no one should record them as passed:

- the US/UK spellings (`program`, `behavioral`, `favorites`, `judgment`) in small body copy
- small breadcrumbs on the thought-record and routine screens
- anything in the Home tool-row subtitles

📌 Reading those needs the video itself — a YouTube extractor plus the `ffmpeg` already on the
owner's machine — or eyes on a full-screen playback. **A new tool on the owner's machine is the
owner's call**, which is why it was not installed.

## How to re-read it, without downloading anything

☠️ **Playback in a driven browser does not work** and the dead end is recorded so it is not
repeated: the player loads and reports `duration: 36`, but the media never buffers — `readyState`
stays `0`, `videoWidth`/`videoHeight` stay `0`, `buffered` stays empty, through `playVideo()`, a
click on the play control, and the `k` shortcut. Seeking cannot produce a frame that was never
decoded.

✅ **YouTube's own storyboard works instead.** Fetch the watch page, read
`"playerStoryboardSpecRenderer":{"spec":...`, take the last `|`-separated descriptor
(`width#height#count#cols#rows#interval#name#sigh`), and request
`…/storyboard3_L<level>/M<n>.jpg?sqp=<sqp>&sigh=<sigh>`. Level `L3` returns five sheets covering
all 37 seconds. No extractor, no download, no playback.

## Standing verdict

☠️ **RULED 2026-09-23 ON [#2626](https://github.com/Selftend/selftend/issues/2626): KEEP IT.**
This section previously read _"Re-cut or pull - not keep."_ That verdict was written before the
question was put to the owner, and it is **superseded**. Recorded rather than deleted, because a
verdict that flipped is worth more than one that appears never to have been in doubt.

**The video stays on the listing.** The re-cut rides the **next campaign run** - not a date, and
not "when someone gets to it".

⭐ **Why keep, when [#2041](https://github.com/Selftend/selftend/issues/2041) says stale pixels
want new captures.** #2041's precedent is narrower than it looks. It was about a **guardrail
violation** rendered as pixels - a feature graphic carrying _"Your CBT program"_ and
_"Start program"_, copy `docs/positioning.md` bans, unfixable by editing because the words were an
image. **This video contains no violation**: no banned compound, no `TOOLS ·` or `MODULES ·`
breadcrumb, no dead Tools hub, and the closing line _"Free. Open source. No ads, subscriptions, or
paywalls."_ sits squarely inside the guardrails.

What is stale here is **cosmetic** - Home's headers read _"Your tools"_ and _"Guided programmes"_
where the app now reads _"Favourites"_ and _"Tools"_, plus a visible `Aug 18, 2026`. ⚠️ **A
visitor cannot know a header was renamed.** Pulling the listing's only moving asset - its first
tile, before screenshot `01` - to fix an invisible defect trades a real loss for no gain.

⛔ **Pull now** was rejected. The consistency argument with
[#2618](https://github.com/Selftend/selftend/issues/2618) is genuine, but that ruling removed
frames from a set that **kept working without them**; this removes the asset entirely. And the
surfaces shown are **replaced, not dead** - nothing in the video points at a screen that no longer
exists.

⛔ **Re-cut now** was rejected as unavailable rather than wrong: `capture-lib.js` lives on the
owner's machine outside the repo (`docs/campaign/capture/shoot.js:10`), so it is an owner session
with no agent path, competing with the App Store capture work that is on the critical path.

⚠️ **The unchecked body copy above is accepted knowingly.** This record does **not** claim the
video has been fully read - only that every rule the storyboard method could reach came back
clean.

📌 **Whoever opens Visit B may still overturn this on the Console**, and updates this file the
same day - `store/play-listing.md`'s _live first, file second_ rule governs this file too. If the
video is ever pulled, this record stays and says so; the point of the account is that the change
is diffable.

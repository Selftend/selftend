# Video campaign production sources

Open sources for the Selftend video campaign. Decisions behind everything here live on the
[campaign map (#612)](https://github.com/Selftend/selftend/issues/612) and its closed tickets;
this directory is the contributor-visible half of the production system decided in
[#621](https://github.com/Selftend/selftend/issues/621).

## Source-of-truth split

| Lives here (repo, open)                                                                                                    | Lives in Drive (owner-held)                   |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Narration scripts (`scripts/`) — the caption source of truth                                                               | Editable Premiere projects (`.prproj`)        |
| Per-screen capture scripts (added alongside the capture baseline, [#623](https://github.com/Selftend/selftend/issues/623)) | Raw captures, narration WAV, rendered masters |
| Asset/licensing registry (`assets.md`)                                                                                     | Reusable type-bookend graphics templates      |
| This runbook                                                                                                               |                                               |

Drive location: `Adobe Premiere Projects/Selftend/`. Naming: clips `<topic>-<screen-id>-vNN`,
masters `<topic>-master-vNN.mp4`, narration `vo/<video>/<line-id>.wav`.

## Style rules (binding, from the map)

- Structure and template: [#622](https://github.com/Selftend/selftend/issues/622) (six-part walkthrough grammar); trailer storyboard: [#625](https://github.com/Selftend/selftend/issues/625).
- Motion: one restrained cut — full-frame motion limited to crossfades and ≤3% scale; faster motion only inside the device frame ([#620](https://github.com/Selftend/selftend/issues/620)).
- Narration: synthetic voice, disclosed ("Narrated with a synthetic voice" in every description), generated per script line id ([#639](https://github.com/Selftend/selftend/issues/639)); calm, ~130–145 wpm.
- Claims gate: age-silent, no humans, territory-silent, no outcome/medical claims; flagged in-app strings stay out of frame ([#617](https://github.com/Selftend/selftend/issues/617)).
- Captions: generated from these scripts as SRT, uploaded as files — never platform auto-captions.
- Evaluation and stop conditions: [#624](https://github.com/Selftend/selftend/issues/624) — full-library review each minor release; shown UI may lag the live app by at most two releases.

## Replacing one changed screen (the whole point)

Storyboards map beats → screen ids. When a release changes a screen:

1. Re-run that screen's capture script.
2. Drop the same-named, version-bumped clip into the Premiere bin.
3. Re-render the master; if a narration line changed, regenerate only that line id with the same voice/settings.
4. Replace per platform (YouTube re-upload per the [#634](https://github.com/Selftend/selftend/issues/634) package rules).
5. Log the swap in `assets.md`.

No full rebuild, ever.

## Scripts index

| File                                        | Video                                               | Storyboard                                              |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `scripts/trailer.md`                        | "The quiet minute" promo (~29s + Reddit cut)        | [#625](https://github.com/Selftend/selftend/issues/625) |
| `scripts/getting-started.md`                | Getting started (~2.5–3 min)                        | [#626](https://github.com/Selftend/selftend/issues/626) |
| `scripts/mood-journal-gratitude.md`         | Mood, journal & gratitude (~3 min)                  | [#627](https://github.com/Selftend/selftend/issues/627) |
| `scripts/breathing-grounding-meditation.md` | Breathing, grounding & meditation (~3 min)          | [#628](https://github.com/Selftend/selftend/issues/628) |
| `scripts/habits.md`                         | Habits (~2.5 min)                                   | [#629](https://github.com/Selftend/selftend/issues/629) |
| `scripts/routines.md`                       | Routines (~2.5 min)                                 | [#630](https://github.com/Selftend/selftend/issues/630) |
| `scripts/reminders-widgets.md`              | Quiet reminders, notifications & widgets (~2.5 min) | [#631](https://github.com/Selftend/selftend/issues/631) |
| `scripts/cbt.md`                            | CBT (≤4 min, deep-method)                           | [#632](https://github.com/Selftend/selftend/issues/632) |
| `scripts/act.md`                            | ACT (≤4 min, deep-method)                           | [#633](https://github.com/Selftend/selftend/issues/633) |

Scripts are written at storyboard fidelity: on-screen UI strings quoted in narration are
re-verified against the live app at capture time, and any drift is fixed in the script first
(script → captions → VO, in that order).

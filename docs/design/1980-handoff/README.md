# The Claude Design handoff — the DBT module (#1994)

The second destination artefact of map [#1980](https://github.com/Selftend/selftend/issues/1980)
(_the DBT module: a decided spec plus a design brief_), assembled **2026-09-05** for
[#1994](https://github.com/Selftend/selftend/issues/1994). The first artefact is the spec,
[`docs/modules/dbt-mckay-skills-workbook.md`](../../modules/dbt-mckay-skills-workbook.md); every line
of the brief is taken from it. The package is kept in the repo so the follow-on implementation map reads
the same brief the designs came from.

☠️ **This package closes the DBT map. It does not open the implementation.** Whatever Claude Design
returns starts a new map; nothing in this folder is a ticket.

The package is three things:

| Part                         | Where                                                 | What it is                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. The prompt**            | [`prompt.md`](prompt.md)                              | One pasteable block. The module's sentence as the frame, the arrival state, the three hard rules with their reading tests, the six screens with their decided copy, fields, states and coverage, the _follows shipped patterns_ appendix, the never-write table, the visual system, and what not to design. |
| **2. The screenshots**       | [`../1980-before/`](../1980-before/) — labelled below | The DBT overview being replaced and the shipped patterns the six screens inherit or depart from, captured from a local build of `dev` on the seeded demo account.                                                                                                                                           |
| **3. The decisions summary** | this file, below                                      | One line per decision, linked to the ticket that holds it, so a design question that turns out to be a product question is traced, not re-litigated.                                                                                                                                                        |

## How to use it

1. Paste the whole of `prompt.md` from its first `##` heading to the end.
2. Upload the images in the manifest below, in screen order, and name each with its label.
3. When a design question comes back that is really a product question, find the row in
   § _The decisions_ and open the ticket. The answer is on its resolution comment. Do not answer it
   from the brief, and do not re-open it in the design tool.

⚠️ **The prompt is excluded from the copy gate on purpose** (`PUBLISHED_RECORDS` in
`test/positioning-copy.test.ts`): its _Never write_ table spells the banned phrases and the American
spellings out in order to ban them, exactly as `docs/positioning.md` and the tools-first brief do,
because the designer reads the brief and never the repo. Nothing in it is copy to ship. This README
stays inside the gate.

⚠️ **The captures are at 390 wide; the designs are at 360.** 390 was the capture width the earlier
`1822-before` set used and this set kept for comparability; `docs/accessibility.md` rules **360dp** as
the narrowest supported viewport. The tools-first brief's visual-system section said 390 and was
corrected in the same change that added this folder.

## The image set, labelled

Every file lives in [`../1980-before/`](../1980-before/) and is described in that folder's README,
which also records what each capture can and cannot support - read its **☠️ Read this first**. Every
image is **`dev` at `eceef15d`** on the seeded demo account, 390×844 and 1440×900, light and dark; a
`RoutineFab` pill (`2/3 +1`) overlays every shot bottom-right and is not page content. Labels marked
_inherit_ are a pattern the screen builds on; _depart_ marks the thing the brief changes.

### S1 — the DBT module home

| Upload as                  | File(s)                                                                                                                | Notes                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `S1 overview, phone light` | `01-dbt-overview-phone-light.png`, `-scroll1.png`                                                                      | The surface being replaced. Prose only - no stats, no info glyph, no action; the safety callout still names CBT; "crisis" on card 1. _Depart._ |
| `S1 overview, phone dark`  | `01-dbt-overview-phone-dark.png`, `-scroll1.png`                                                                       | Same, dark.                                                                                                                                    |
| `S1 overview, desktop`     | `01-dbt-overview-desktop-light.png`, `-desktop-dark.png`                                                               | Whole page above the fold at 1440.                                                                                                             |
| `S1 CBT home`              | `02-cbt-home-phone-light.png` … `-scroll5.png`; `02-cbt-home-desktop-light.png` … `-scroll4.png`; the two `-dark` tops | The sibling anatomy: crumb → h1 → tagline → stats → programme card → sections; `Shared tools` rows under the pillars. _Inherit._               |
| `S1 ACT home`              | `03-act-home-phone-light.png` … `-scroll3.png`; `03-act-home-desktop-light.png` … `-scroll2.png`; the two `-dark` tops | Three lifetime stats (nearer DBT's two than CBT's windowed pair); the `4/1` milestone. _Inherit._                                              |
| `S1 modules index`         | `00-modules-index-phone-light.png`, `-desktop-light.png`                                                               | The tile the module lives on (`Four skill groups` becomes _For when feelings run high_, copy only).                                            |

### S2 — the coping plan (builder and card)

Nothing shipped is its twin - the designer is told so in the brief. Upload `04-thought-record-form-empty-phone-light.png` as `S2 form chrome (reference only)` for the `MobileFormScreen` chrome, the bar and the footer; the card has no before.

### S3 — the emotion record form

| Upload as                      | File(s)                                                                                                                    | Notes                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `S3 thought record, empty`     | `04-thought-record-form-empty-phone-light.png`, `-phone-dark.png`, `-desktop-light.png`                                    | The rail at `0 of 6`, the `Before you start` card, the crisis bar. _Inherit._                  |
| `S3 thought record, two parts` | `05-thought-record-form-filled-phone-light.png` … `-scroll2.png`; `-phone-dark` trio; `-desktop-light.png`, `-scroll1.png` | The rail filling, the sticky `Discard draft` / `Finish later · Save record` footer. _Inherit._ |

### S4 — the timed session (muscle relaxation)

| Upload as                         | File(s)                                                                                                   | Notes                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `S4 breathing, ready`             | `08-breathing-session-ready-phone-light.png`, `-phone-dark.png`, `-desktop-light.png`                     | The intro shape before `Start`. _Inherit._                                                                                                |
| `S4 breathing, running`           | `08-breathing-session-running-phone-light.png`, `-phone-dark.png`, `-desktop-light.png`                   | `FocusSessionShell`, the countdown, `Cycle 1 of 8 · 2:05 left`, `Pause` · `Finish early` - the exit DBT departs from. _Inherit / depart._ |
| `S4 grounding, step 1 and step 3` | `07-grounding-session-step1-*.png`, `07-grounding-session-step3-*.png` (phone light, phone dark, desktop) | Back/Next, the segment bar, `Take as long as you need`, `Finish early`. A **step flow with no clock** - the step shape only. _Inherit._   |
| `S4 grounding home`               | `06-grounding-home-phone-light.png`, `-scroll1.png`; `-desktop-light.png`, `-scroll1.png`                 | Context: the technique cards a session opens from.                                                                                        |

### S5 — the script (builder step 2 and the card)

Not captured: the `WizardScreen` multi-step pattern (`/modules/cbt/beliefs/new` on the same stack)
could not be reached without creating draft state on the demo account, and the card has no twin. The
brief describes the wizard's shape; `S3`'s form chrome is the nearest reference.

### S6 — the programme card

| Upload as                  | File(s)                                                                     | Notes                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `S6 CBT card, in progress` | `02-cbt-home-phone-light.png`, `02-cbt-home-desktop-light.png` (top slices) | `YOUR PROGRAMME`, phase title, `This phase` rows, `Today's practice`, `Advance to next phase`. _Inherit._                                                                                                                                            |
| `S6 ACT card, in progress` | `03-act-home-phone-light.png`, `03-act-home-desktop-light.png` (top slices) | `ACT PROGRAMME`; `4/1` printed as-is. _Inherit._                                                                                                                                                                                                     |
| `S6 CBT graduation`        | `12-cbt-graduation-phone-light.png`, `-desktop-light.png`                   | **The model**: filters zero lines, no closing prescription.                                                                                                                                                                                          |
| `S6 ACT graduation`        | `13-act-graduation-phone-light.png`, `-desktop-light.png`                   | The two defects DBT does not copy: `Keep using them.` and zero-count lines. _Depart._ ☠️ [#2013](https://github.com/Selftend/selftend/issues/2013) has since fixed both on the live ACT home, so this shot is the _before_, not the current surface. |

### Context

| Upload as | File(s)                                                                                                     | Notes                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Sidebar` | `11-sidebar-open-phone-light.png`, `-scrolled.png`; `-phone-dark` pair; `11-sidebar-open-desktop-light.png` | Tools above Modules, `Looking back`, DBT active with the anchor glyph. Not a design surface. |

## The decisions

One line each. **The answer lives on the ticket's resolution comment, never here.** Ordered by the
route the map walked.

| Decision                                                                                                                                                | Gist for the designer                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Overlap inventory: every workbook skill mapped to the shipped surface it links to](https://github.com/Selftend/selftend/issues/1981)                   | 127 skills classed link / build / learn-only / omit; the builds collapse onto the surfaces in this brief. Why a skill you expect is a link, not a screen.             |
| [DBT vocabulary in public use, and the copy gates a DBT surface must pass](https://github.com/Selftend/selftend/issues/1983)                            | No acronym on any surface but a learn section; the names table; the _Judgement_ spelling.                                                                             |
| [The fourth-module contract, verified against code](https://github.com/Selftend/selftend/issues/1982)                                                   | Why every DBT surface reuses the module-home shell and shared components.                                                                                             |
| [The safety cut](https://github.com/Selftend/selftend/issues/1985)                                                                                      | Rules S1–S5; the Stop; where the callout and the bar sit; the card view with no bar; caution copy inline, never a modal.                                              |
| [Distress tolerance: the coping plan, its menus, the interrupt, and chapters 1–3](https://github.com/Selftend/selftend/issues/1986)                     | The plan's three sections and one fallback list; Pause and choose records nothing; muscle relaxation's variants, caution and Stop; offline is native-only.            |
| [Mindfulness: the wise mind check-in, the judgement record, and what links out](https://github.com/Selftend/selftend/issues/1987)                       | Wise mind is a pause with a typed note and no draft; the judgement record's three fields; a DBT phase reads DBT tables only.                                          |
| [Emotion regulation: the emotion record, the opposite-action plan, and the post-MVP exposure section](https://github.com/Selftend/selftend/issues/1988) | The six parts on the rail; no rating; the cap line; the one door; the opposite-action plan as an open record with no age.                                             |
| [Interpersonal effectiveness: the script, saying no, and the ladder](https://github.com/Selftend/selftend/issues/1989)                                  | The three-step script; the card with _If they push back_; the list is the ladder; no _who_.                                                                           |
| [The programme: four phases, signals, graduation, and the one reminder](https://github.com/Selftend/selftend/issues/1990)                               | One card, three states; every target 1; the filtered graduation; the invitation's copy; no launcher, no Home surface.                                                 |
| [Module home, routes and copy](https://github.com/Selftend/selftend/issues/1991)                                                                        | Everything on screen 1; the tool names; the learn route; the string set; the Bulgarian nouns.                                                                         |
| [Data model and module contract](https://github.com/Selftend/selftend/issues/1992)                                                                      | One-document plan (no per-item entity); records delete from the detail and never edit; sessions immutable, no history; DBT rows appear on _Looking back_.             |
| [Capture the before](https://github.com/Selftend/selftend/issues/1984)                                                                                  | The 66 shots; grounding is a step flow, breathing is timed; the graduation pair; the seed's stale policy version.                                                     |
| [The design brief](https://github.com/Selftend/selftend/issues/1993)                                                                                    | Six screens plus the appendix; 360 light with dark and desktop where earned; the category sentence quoted once as orientation and the module's sentence as the frame. |
| [Assemble the spec and the brief, and close the map](https://github.com/Selftend/selftend/issues/1994)                                                  | This folder and the spec.                                                                                                                                             |

### Decided elsewhere, binding on the brief

| Decision                                                                                                                                                                 | Gist                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| [The safety string names no module (#1957)](https://github.com/Selftend/selftend/issues/1957)                                                                            | The crisis callout's text is not the designer's; it still says _a CBT programme_ on `dev` and is being moved. |
| [The cold-water caution (#1996)](https://github.com/Selftend/selftend/issues/1996)                                                                                       | `TechniqueCaution` is the shipped caution component and its shape (two lines, above Start, never a modal).    |
| [Which surfaces carry the frame (map #1755)](https://github.com/Selftend/selftend/issues/1755)                                                                           | Post-threshold surfaces carry no category sentence; every DBT screen is post-threshold.                       |
| [The frame sentence (#2007) and the doc (#2008)](https://github.com/Selftend/selftend/issues/2007)                                                                       | The category sentence the prompt quotes once as orientation; `docs/positioning.md` is its home.               |
| [Home → Favourites (map #1885)](https://github.com/Selftend/selftend/issues/1885)                                                                                        | Home's module card: a `DBT` mark, no stat line; its sub becomes _For when feelings run high_.                 |
| [Retention by return, not engagement (ADR-0004)](../../adr/0004-retention-by-return-not-engagement.md)                                                                   | "Fulfilling, and done." Nothing is designed to be reopened.                                                   |
| [The update offer is a modal (ADR-0003)](../../adr/0003-update-offer-is-a-modal.md)                                                                                      | Unprompted modals only on a fact about the app, never the person's behaviour or state.                        |
| [ACT spec §4 is stale (#2011)](https://github.com/Selftend/selftend/issues/2011) · [ACT graduation zero lines (#2013)](https://github.com/Selftend/selftend/issues/2013) | Why the ACT spec's machinery and the ACT graduation are not the model.                                        |

## Carried forward, not in the brief

- **Bulgarian.** Every string needs its `bg` twin at implementation; the brief asks the designer only to leave room. One noun is decided (_Устойчивост на стрес_) and given as a length sample.
- **The DBT® mark** - an open question for the pre-launch legal review (`docs/licensing.md`).
- **The child-safety re-run and the DPIA re-read** - recorded in `docs/child-safety-review.md` and `docs/dpia-minors-assessment.md`; the re-run is owed at implementation.
- **The coping-plan pick copy** - the spec gives the families and example picks; the implementation finalises the set through the copy gates.
- **The sibling h1 casing** (CBT and ACT title case, DBT sentence case) - an observation for the implementation map, not a redesign.
- **The 360 rail-caption question on screen 3** - the one layout question this brief expects the designer to answer rather than the code.
- **The implementation map** - cut from whatever comes back; not this folder's.

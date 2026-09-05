# The DBT overview and the patterns it will be designed beside — the "before" for #1984

Captured **2026-09-05** for [#1984](https://github.com/Selftend/selftend/issues/1984), a task ticket on
map [#1980](https://github.com/Selftend/selftend/issues/1980) (the DBT module: spec plus a Claude Design
brief). The brief ([#1993](https://github.com/Selftend/selftend/issues/1993)) designs the DBT home, its
records, its sessions and its programme _on_ these shipped patterns, so every shot here is a pattern to
inherit or to depart from — never a proposal, and never copy to reuse.

Everything is the **`dev` branch at `eceef15d`** (the tip when the export was built), rendered from a
static web export served locally against a freshly reset local Supabase, signed in as the seeded demo
account. Nothing here was taken live. The one `dev` commit that landed on a captured surface family
between the export and this folder is [#1996](https://github.com/Selftend/selftend/issues/1996) (the
cold-water grounding technique's inline caution, `2cb062a9`); no shot shows that technique, so the set is
current for what it shows.

---

## ☠️ Read this first

- **The live site still serves `main` (`v0.17.0`, `56476011`), 146 commits behind `dev`.** The DBT
  overview a real person sees today is the `main` one; the `1822-before` set records how far live
  copy lags. This folder deliberately records `dev`, because the brief designs against what the next
  release ships. Nothing here shows `main`.
- **The demo account re-gates after every reset.** `supabase/seed.sql` seeds
  `policy_version_accepted = '2026-05-20-local-preferences'`, and `policyVersion` on `dev` is
  `2026-09-04-teen-floor` (#1806), so the consent modal covers every screen until the column is set to
  the current version. The capture did that locally before the first shot. Not a product bug — a seed
  that has fallen behind the policy version — but anyone reproducing this set will hit it first.
- **The ticket's item 4 named the wrong pattern.** A grounding technique session is a **step flow**
  with no clock — `Next` / `Back`, "Take as long as you need", `Finish early` (`07-*`). The **timed**
  guided session in the app is breathing (`08-*`): a countdown, "Cycle 1 of 8 · 2:05 left", `Pause`,
  `Finish early`. Both are here. Muscle relaxation and the wise mind check-in
  ([#1986](https://github.com/Selftend/selftend/issues/1986),
  [#1987](https://github.com/Selftend/selftend/issues/1987)) inherit the breathing engine's timing and
  the grounding flow's step shape respectively — and depart from both on early exit (DBT records on
  completion only; `Stop` saves nothing).
- **Both graduation surfaces were reachable only by marking the seeded programmes complete in the
  local database** (`cbt_program_completed_at` / `act_program_completed_at` set, then cleared). The seed
  leaves both programmes mid-phase. `12-*` / `13-*` are therefore the real components on the real seeded
  counts, but not a state the demo account is in.
- **A floating routine pill (`RoutineFab`, "2/3 +1") sits bottom-right on every shot.** It is the
  demo account's seeded routines-for-today progress, not part of any captured surface. Design around it
  as a persistent overlay, not as page content.

---

## Surface 1 — the DBT overview (`/modules/dbt`)

`DbtModuleScreen` (`src/features/modules/dbt-module-screen.tsx`), every theme × size. This is the
surface the DBT home replaces.

| shot                                                                     | what it shows                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `01-dbt-overview-phone-light.png` / `-scroll1.png`                       | 390×844, light, top and scrolled to the foot (two slices)     |
| `01-dbt-overview-phone-dark.png` / `-scroll1.png`                        | 390×844, dark, the same two slices                            |
| `01-dbt-overview-desktop-light.png` / `01-dbt-overview-desktop-dark.png` | 1440×900; the whole page fits above the fold at desktop width |

**Verbatim `dev` copy, in document order** (`modules:dbt.*`, `common:safety.*`):

- Eyebrow `OVERVIEW · DBT`, crumb `← MODULES · DBT`
- `<h1>` **Dialectical behaviour therapy**
- _Skills for high emotion intensity - distress tolerance, emotion regulation, mindfulness, and
  interpersonal effectiveness. An overview of the approach, not a set of exercises._
- Card with the anchor glyph: **What DBT is** — _DBT was developed for high-emotion-intensity
  experiences. It pairs acceptance with change in equal measure. Selftend's guided exercises are in the
  CBT and ACT modules._
- `<h3>` **The four skill groups** — four cards, a 2×2 stack on phone and one row of four on desktop:
  `Mindfulness` / _Observing, describing, participating with full attention._ · `Distress tolerance` /
  _Getting through a crisis without making it worse._ · `Emotion regulation` / _Reducing vulnerability,
  understanding emotions, changing painful ones._ · `Interpersonal effectiveness` / _Asking, saying no,
  and keeping the relationship and self-respect intact._
- `CrisisSupportCallout` (red-hairline card): **Use urgent support for urgent risk** — _Selftend is a
  CBT programme for when there is time and safety to reflect. It is not emergency support and is not
  monitored by crisis responders._ → `Open crisis guidance`

Three things the brief already knows, now confirmed in frame:

- The **safety string names CBT on the DBT page** — the [#1957](https://github.com/Selftend/selftend/issues/1957)
  ruling (the safety string names no module) has not shipped.
- The skill-group card for distress tolerance uses **"crisis" for ordinary distress**, the S4 finding
  from [#1985](https://github.com/Selftend/selftend/issues/1985).
- The overview has **no header stats, no info glyph, no primary action** — it is prose. Its siblings
  (Surface 2) open with a stat line, a bell, a `?` and a primary button, which is the shape
  [#1991](https://github.com/Selftend/selftend/issues/1991) gives the DBT home.

The page title casing differs between the three modules: the DBT page reads **Dialectical behaviour
therapy** (sentence case), the CBT page **Cognitive Behavioural Therapy** and the ACT page
**Acceptance & Commitment Therapy** (title case). The modules index (`00-*`) is sentence case for all
three. Recorded so the brief picks one on purpose.

---

## Surface 2 — the sibling module homes (`/modules/cbt`, `/modules/act`)

`CbtHomeScreen` and `ActHomeScreen` on the seeded demo account (17 thought records; 9 choice points,
29 thoughts unhooked, 4 committed actions). The DBT home sits beside these in the sidebar and on the
modules index, so their anatomy is the baseline.

| shot                                                          | what it shows                                                                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `02-cbt-home-phone-light.png` … `-scroll5.png`                | the whole CBT home in six 390×844 slices, light                                                                             |
| `02-cbt-home-desktop-light.png` … `-scroll4.png`              | the whole CBT home in five 1440×900 slices, light                                                                           |
| `02-cbt-home-phone-dark.png` / `02-cbt-home-desktop-dark.png` | the top of the CBT home, dark, both sizes                                                                                   |
| `03-act-home-phone-light.png` … `-scroll3.png`                | the whole ACT home in four 390×844 slices, light                                                                            |
| `03-act-home-desktop-light.png` … `-scroll2.png`              | the whole ACT home in three 1440×900 slices, light                                                                          |
| `03-act-home-phone-dark.png` / `03-act-home-desktop-dark.png` | the top of the ACT home, dark, both sizes                                                                                   |
| `00-modules-index-phone-light.png` / `-desktop-light.png`     | `/modules` — the index the DBT tile lives on (`Dialectical behaviour therapy · Four skill groups`, the only unstarred tile) |

**Anatomy both homes share, top to bottom:** crumb → `<h1>` → one-sentence description → a
**stat line** (`17 thought records · 2 this month`; `9 choice points mapped · 29 thoughts unhooked ·
4 committed actions`) → a **primary button** on CBT only (`+ New thought record`; ACT has none) → the
**programme card** (Surface 5) → module-specific sections. The desktop column is centred at roughly
720px; phone is edge-to-edge with 16px gutters.

Two things visible in the top slices that the DBT home decision inherits or departs from:

- The CBT stat line is **two stats, one of them windowed** (`2 this month`); the ACT stat line is
  **three lifetime stats**. [#1991](https://github.com/Selftend/selftend/issues/1991) gives DBT two
  lifetime stats (_records · sessions_) — nearer ACT's shape than CBT's.
- The ACT card's first milestone reads **`4/1`** on the seeded account — a done-count past its target
  is printed as-is, not clamped. Worth knowing before the DBT programme card (every leg target 1,
  [#1990](https://github.com/Selftend/selftend/issues/1990)) is drawn.

On the modules index at phone width the two-letter monogram box wraps its three-letter label
(`CB` / `T`) — `00-modules-index-phone-light.png`, all three tiles. Off-map; recorded so it is not read
as intended.

---

## Surface 3 — the one-column form with the sticky rail (`/modules/cbt/new`)

The thought record form (`app/(app)/modules/cbt/new.tsx`) — the pattern the emotion record
([#1988](https://github.com/Selftend/selftend/issues/1988), a six-part column on this rail) inherits.
The script builder ([#1989](https://github.com/Selftend/selftend/issues/1989)) inherits `WizardScreen`
instead, which is **not** captured: no wizard was reachable without saving a record on the demo account.

| shot                                                                                      | what it shows                                                                                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `04-thought-record-form-empty-phone-light.png` / `-phone-dark.png` / `-desktop-light.png` | the form as it opens: rail at `0 of 6 parts filled in`, the `Before you start` card, the `Not for emergencies · Crisis resources` bar |
| `05-thought-record-form-filled-phone-light.png` … `-scroll2.png`                          | the first two parts typed (demo text, never saved), scrolled through three slices                                                     |
| `05-thought-record-form-filled-phone-dark.png` … `-scroll2.png`                           | the same, dark                                                                                                                        |
| `05-thought-record-form-filled-desktop-light.png` / `-scroll1.png`                        | the same at 1440, two slices                                                                                                          |

**The rail** is a sticky strip under the header: six labelled segments (`Situation · Thoughts ·
Feelings · Patterns · Evidence · Balanced`) and a count line (`1 of 6 parts filled in`). It fills as
parts are typed, not as steps are advanced — there are no steps; the whole form is one scroll. The
footer is sticky too: `Discard draft` (destructive, above) and `Finish later` · `Save record` (a row).
The typed text was a throwaway sentence; the draft was abandoned by navigating away, nothing was saved.

The crisis surface here is the hairline **`CrisisSupportBar`** (`Not for emergencies · Crisis
resources ›`), not the red callout the homes carry — the two-surface split
[#1991](https://github.com/Selftend/selftend/issues/1991) relies on.

---

## Surface 4 — the guided sessions

| shot                                                                                        | what it shows                                                                                                          |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `06-grounding-home-phone-light.png` / `-scroll1.png`; `-desktop-light.png` / `-scroll1.png` | `/tools/grounding` — the technique cards the session opens from                                                        |
| `07-grounding-session-step1-phone-light.png` / `-phone-dark.png` / `-desktop-light.png`     | `/tools/grounding/54321`, step 1 of the 5-4-3-2-1 **step flow**                                                        |
| `07-grounding-session-step3-*.png` (same three)                                             | the same flow on step 3 (`SOUND · 3 OF 5`, segment bar three-fifths filled)                                            |
| `08-breathing-session-ready-phone-light.png` / `-phone-dark.png` / `-desktop-light.png`     | `/tools/breathing/session?pattern=box-breathing` before `Start`                                                        |
| `08-breathing-session-running-*.png` (same three)                                           | the **timed** session nine seconds in: `Inhale · 1s · then Hold`, `Cycle 1 of 8 · 2:05 left`, `Pause` · `Finish early` |

**Step flow anatomy** (`GroundingSession`): back-crumb with the technique name and `3 of 5` at the
right, a five-segment bar, a centred glyph disc, an eyebrow (`SOUND · 3 OF 5`), the instruction as an
`<h1>`, a hint line, then a footer — _Take as long as you need._ → `Back` · `Next` → `Finish early`
(ghost). **Timed anatomy** (breathing): a breath disc with four phase dots, the phase word as the
heading, a countdown, two sliders (`Breath 70%` · `Ambient 50%`), then `Pause` · `Finish early`.

The one departure the brief draws rather than reuses: on both shipped sessions `Finish early`
**saves a partial row**, and the back gesture opens a finish-or-continue dialog (#928). DBT sessions
record on completion only and `Stop` saves nothing ([#1986](https://github.com/Selftend/selftend/issues/1986)).

---

## Surface 5 — the programme surfaces

The programme card is not a separate route: it is the second block of each module home, so its
"phase view" is the top slice of Surface 2. Listed here by name so the brief can find it.

| shot                                                                               | what it shows                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02-cbt-home-phone-light.png`, `02-cbt-home-desktop-light.png` (and the dark pair) | the **CBT programme card**: eyebrow `YOUR PROGRAMME` with the route glyph, a gear and a `?`; phase title `Change what you do · Behavioural change`; a theme sentence; `This phase` (two milestone rows, `1/1` ticked and `0/1`); `Today's practice` (one row, `0/1`); `Advance to next phase` (tinted)      |
| `03-act-home-phone-light.png`, `03-act-home-desktop-light.png` (and the dark pair) | the **ACT programme card**: eyebrow `ACT PROGRAMME`; `Open up · Defusion & acceptance`; the same row anatomy, `4/1` on the first milestone                                                                                                                                                                  |
| `12-cbt-graduation-phone-light.png` / `-desktop-light.png`                         | the CBT home once `cbt_program_completed_at` is set: **Programme complete** — _You built real skills. Here's what you did:_ — four ticked lines (`16 thought records · 18 activities completed · 5 goals set · 3 beliefs examined`) → `Done`                                                                |
| `13-act-graduation-phone-light.png` / `-desktop-light.png`                         | the ACT home once `act_program_completed_at` is set: **You finished the ACT programme** — _You built skills to be present, open up, and do what matters. Keep using them._ — four ticked lines (`8 choice points mapped · 28 thoughts unhooked · 34 feelings made room for · 4 committed actions`) → `Done` |

Two facts for the DBT programme ([#1990](https://github.com/Selftend/selftend/issues/1990) rules the
CBT shape):

- The CBT graduation **filters zero lines and prints no "keep using them"**; the ACT one carries the
  _Keep using them._ sentence and would print `0 …` lines on an empty account
  ([#2013](https://github.com/Selftend/selftend/issues/2013)). The two shots are the two shapes side by
  side.
- The graduation card's counts are **programme-window counts, not the header's lifetime counts** —
  the ACT header says `29 thoughts unhooked`, the card `28`; the CBT header `17 thought records`, the
  card `16`. A DBT header of lifetime stats above a windowed graduation card will show the same
  one-off gap; it is the shipped behaviour, not a defect.

---

## Surface 6 — the sidebar

| shot                                                | what it shows                                          |
| --------------------------------------------------- | ------------------------------------------------------ |
| `11-sidebar-open-phone-light.png` / `-scrolled.png` | the drawer open from `/modules/dbt`, 390, top and foot |
| `11-sidebar-open-phone-dark.png` / `-scrolled.png`  | the same, dark                                         |
| `11-sidebar-open-desktop-light.png`                 | the drawer open at 1440 — an overlay panel, not a rail |

**Order on `dev`:** `Home` · `Looking back` · `Routines` — **TOOLS**: `Check-in` · `Journal` ·
`Breathing` · `Grounding` · `Gratitude log` · `Meditation` · `Sleep` · `Habit tracking` — **MODULES**:
`CBT` · `ACT` · `DBT` — `Reminders` · `Settings` · `Support` (then the donate row, off the phone fold).

Against the live sidebar the `1822-before` set recorded: **Tools now sit above Modules** (the
tools-first inversion has landed on `dev`), and `Insights` has become **`Looking back`**. `DBT` is the
active row (tinted) with the anchor glyph — the same glyph the overview's `What DBT is` card uses. The
drawer is the same overlay panel at every width; there is no persistent desktop rail.

---

## Capture technique, and what it can and cannot support

- **Local static export, not the dev server and not the live site.** `node scripts/e2e-web-server.js 8099`
  with the e2e `EXPO_PUBLIC_*` values (local Supabase URL and anon key, the e2e VAPID key, a
  `.test.local` support address) built `dist-e2e/` from the checkout at `eceef15d` and served it with
  SPA fallback. Local Supabase was reset (`npm run db:reset`) on the same checkout first, so migrations,
  `config.toml` and the demo seed were all `dev`'s.
- **Signed in by session injection, exactly as the e2e suite does** (`test/e2e/session-injection.ts`):
  a headless password sign-in as `demo@test.local`, the auth-js session written into `localStorage`
  under the app's storage keys, plus the cookie-consent key. No sign-in form was rendered and no email
  was sent.
- **Theme was forced two ways at once**, because the account's stored preference overrides the
  browser's on the first settings pull (`use-settings-sync.ts`): `user_preferences.theme` was set to
  the theme under capture, `selftend:theme` in `localStorage` to the same value, and the browser's
  `prefers-color-scheme` emulated to match. The column was cleared afterwards.
- **Viewports are 1:1** — 390×844 and 1440×900 at device scale 1, like `1822-before`. Reduced motion
  was on, so no shot catches a transition; the animated variants are not represented.
- **The app scrolls inside a container, not the document**, so `fullPage` is useless here (the 1822
  finding). Every `-scrollN` slice is a real viewport screenshot after scrolling that container by one
  viewport height minus 80px of overlap; the note in `manifest.json` records the scroll offset each
  slice was taken at. Layout is faithful in every file.
- **Local-database edits made for the capture:** `policy_version_accepted` set to the current
  version (see _Read this first_), `theme` set per batch and cleared, the two `*_program_completed_at`
  columns set for `12-*` / `13-*` and cleared. All on the local stack; nothing touched staging or
  production, and the local database is reset by every `db:reset` anyway.
- **English only, demo account only.** Every string is the seeded demo content or the app's own copy;
  the one typed sentence (Surface 3) was a throwaway that was never saved. Bulgarian parity stays in the
  map's fog.
- **Not captured, and why:** the `WizardScreen` multi-step pattern (`beliefs/new`, `exposure/new`,
  `goals/new`) — the script builder's base — because reaching a mid-wizard state means creating draft
  state on the demo account, and the DBT home's own routes do not exist yet. If the brief needs it,
  `04-*`'s sibling is `/modules/cbt/beliefs/new` on the same stack.
- `manifest.json` is the machine-readable list: one entry per file with the note the capture script
  wrote at the moment of the shot.

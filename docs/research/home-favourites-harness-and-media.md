# What a new Home invalidates: e2e testIDs, Maestro flows and shipped store media

Research for [#1893](https://github.com/Selftend/selftend/issues/1893), a child of map
[#1885](https://github.com/Selftend/selftend/issues/1885). **Audit only — no product code was changed.**

Read against `origin/dev` at `d87efd4c`. Every claim below cites a file and a line; anything that could not
be settled from the repository is marked **UNVERIFIED** with the read that would settle it.

## The redesign this is measured against

From #1885's _Settled while charting_ table, which is the frame and is not re-opened here:

- Home becomes **greeting → Favourites → all 8 tools → all 3 modules** (decision 13).
- **`Right now` is deleted entirely** (decision 3).
- **`/arrange` is deleted**, along with Home's two header actions (decision 7).
- **The 15 CBT/ACT exercise shortcuts and `routines-today` die from Home** (decision 6).
- **A favourited item appears twice on Home**, plainly and unmarked (decision 5), rendering the
  **identical card** to its catalogue copy (decision 8).
- **Empty Favourites is one quiet line, no box, no button** (decision 12).
- **Onboarding no longer seeds Home** (decision 10); existing rows are **migrated by `toolKey`, deduped**
  (decision 11).
- **The `home:edit` tour stop is deleted; `home:navigation` stays** (decision 18).
- **The greeting block is untouched** (decision 15).
- The modules list is **always plain** — no programme-progress card (decision 9).

---

## 1. TestIDs

### 1.1 What Home's subtree registers today

Home is `src/features/home/today-screen.tsx`, routed at `app/(app)/index.tsx:1-3`. Its subtree is
`RightNowTier` (`right-now-tier.tsx`), `ToolTierRow` → `ToolRow` (`tool-row-stats.tsx` → `tool-row.tsx`),
`resolveWidget` → `ProgramWidget` (`widget-registry.tsx:445-449` → `widgets/program-widget.tsx`), and
`HomeTour` (`src/features/tours/home-tour.tsx`).

Two files named in the ticket register **no testIDs of their own**: `src/features/home/tool-row-stats.tsx`
and `src/features/home/widget-registry.tsx`. `tool-row-stats.tsx` renders `ToolRow`, which carries the ids;
`widget-registry.tsx` resolves a component and returns it untouched.

| testID                      | Registered at                            | References inside `src/`                                                                                                                                              | References **outside `src/`**                                                                                                                                                                                                                                                      |
| --------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-layout`               | `src/features/home/today-screen.tsx:296` | `today-screen.test.tsx:173, 223, 600, 652` (all `fireEvent(..., "layout")` to drive the 640 breakpoint)                                                               | **`.maestro/app-store-screenshots.yaml:139`** (inside `extendedWaitUntil`, `timeout: 90000`, lines 137-140) · `test/e2e/panel-navigation.e2e.test.ts:21, 52` · `test/e2e/settings-account.e2e.test.ts:353` · comment-only mention at `test/e2e/routine-scheduling.e2e.test.ts:134` |
| `home-greeting`             | `today-screen.tsx:227`                   | `today-screen.test.tsx:271, 276` (`.children` `toHaveLength(2)`)                                                                                                      | **none**                                                                                                                                                                                                                                                                           |
| `home-empty-state`          | `today-screen.tsx:348`                   | `today-screen.test.tsx:428, 452, 547, 563`                                                                                                                            | **none**                                                                                                                                                                                                                                                                           |
| `home-empty-mark`           | `today-screen.tsx:117`                   | `today-screen.test.tsx:577` (needs `{ includeHiddenElements: true }` — the mark sets `accessibilityElementsHidden`)                                                   | **none**                                                                                                                                                                                                                                                                           |
| `right-now-tier`            | `right-now-tier.tsx:150`                 | `right-now-tier.test.tsx:129, 137, 149, 161` · `today-screen.test.tsx:115` (jest mock), `624`, `626`                                                                  | **none**                                                                                                                                                                                                                                                                           |
| `right-now-mood`            | `right-now-tier.tsx:159`                 | `right-now-tier.test.tsx:117, 159, 190, 196`                                                                                                                          | **none**                                                                                                                                                                                                                                                                           |
| `right-now-sleep`           | `right-now-tier.tsx:176`                 | `right-now-tier.test.tsx:105, 118, 169, 177, 184, 190, 196`                                                                                                           | **none**                                                                                                                                                                                                                                                                           |
| `right-now-habits`          | `right-now-tier.tsx:195`                 | `right-now-tier.test.tsx:98, 119, 190, 196`                                                                                                                           | **none**                                                                                                                                                                                                                                                                           |
| `tool-row-${id}`            | `tool-row.tsx:99`                        | `tool-row.test.tsx:73, 83, 87, 96, 136, 144` · `tool-row-stats.test.tsx:478` · `today-screen.test.tsx:122` (mock), `233, 234, 242, 243, 251, 608, 609, 613, 678, 679` | `test/e2e/home-widgets.e2e.test.ts:205` (`tool-row-sleep-latest`) · `test/e2e/sign-up-onboarding.e2e.test.ts:107` (`tool-row-sleep-latest`)                                                                                                                                        |
| `tool-row-stat-${id}`       | `tool-row.tsx:128`                       | `tool-row.test.tsx:128` · `tool-row-stats.test.tsx:233`                                                                                                               | **none**                                                                                                                                                                                                                                                                           |
| `programme-card-${module}`  | `widgets/program-widget.tsx:81`          | `widgets/program-widget.test.tsx:127, 136`                                                                                                                            | `test/e2e/program-widgets.e2e.test.ts:88, 148`                                                                                                                                                                                                                                     |
| `programme-badge-${module}` | `widgets/program-widget.tsx:95`          | `widgets/program-widget.test.tsx:44`                                                                                                                                  | `test/e2e/program-widgets.e2e.test.ts:113, 131, 147`                                                                                                                                                                                                                               |
| `programme-line-${module}`  | `widgets/program-widget.tsx:108`         | `widgets/program-widget.test.tsx:45`                                                                                                                                  | **none**                                                                                                                                                                                                                                                                           |

`ProgramWidget` is reachable **only** from Home: `WIDGET_REGISTRY` (`widget-registry.tsx:40-43`) maps it to
`cbt-programme` / `act-programme`, and `resolveWidget` is called only by `today-screen.tsx:43` (via
`WidgetContent`). There is no second mounting site, so every `programme-*` id above is a Home id.

### 1.2 The tour overlay — Home-only, and Maestro depends on it

`HomeTour`'s queue is gated on `pathname === "/"` (`src/features/tours/home-tour.tsx:62`), so the overlay's
ids are effectively Home's:

| testID              | Registered at                             | References outside `src/`                                                                |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `tour-tooltip-card` | `src/features/tours/tour-overlay.tsx:99`  | **`.maestro/app-store-screenshots.yaml:149`** (the conditional dismissal, lines 146-154) |
| `tour-skip-all`     | `src/features/tours/tour-overlay.tsx:141` | **`.maestro/app-store-screenshots.yaml:152`**                                            |

Decision 18 deletes only the `home:edit` **stop** (`home-tour.tsx:20`), not the overlay, so both ids survive.

### 1.3 `/arrange` (deleted by decision 7)

| testID                           | Registered at            | References                                                                                                                                                |
| -------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arrange-layout`                 | `arrange-screen.tsx:351` | **No references anywhere in the repo.** Dead on arrival.                                                                                                  |
| `arrange-handle-${id}`           | `arrange-screen.tsx:93`  | `arrange-screen.test.tsx:161, 219, 220, 234, 247, 300, 320, 328, 342, 356, 382, 398` · **`test/e2e/home-widgets.e2e.test.ts:72, 75, 129, 141, 172, 194`** |
| `arrange-chip-run`               | `arrange-screen.tsx:549` | `arrange-screen.test.tsx:435, 469, 483, 518, 534, 548, 581, 608, 654` — none outside `src/`                                                               |
| `arrange-chip-group-${category}` | `arrange-screen.tsx:554` | `arrange-screen.test.tsx:457, 484` — none outside `src/`                                                                                                  |
| `arrange-chip-${id}`             | `arrange-screen.tsx:573` | `arrange-screen.test.tsx:203, 439-444, 461-463, 493, 499, 519, 520, 561, 726` · **`test/e2e/home-widgets.e2e.test.ts:126, 128, 176, 193, 235`**           |

The route file itself is `app/(app)/arrange.tsx`.

### 1.4 `app/` carries no Home testID

`grep -rn "testID" app/` returns matches only in `app/(app)/support.tsx` and
`app/(app)/tools/breathing/session.tsx`. `app/(app)/index.tsx` is a three-line re-export. **No Home testID is
registered or referenced from the router tree.**

### 1.5 The two load-bearing claims — both verified

1. **`settings-account.e2e` scopes to `home-layout`.** ✅
   `test/e2e/settings-account.e2e.test.ts:353` — `const home = page.getByTestId("home-layout");`, then
   lines 354-355 assert `home.getByText("Check-in", { exact: true })` and
   `home.getByText("Self-care log", { exact: true })`. Test:
   _"replays the introduction, re-arms tips separately, and preserves Home widgets"_ (declared at line 281,
   inside `test.describe("settings - onboarding actions")` at line 267).

2. **`.maestro/app-store-screenshots.yaml` waits on it for 90s.** ✅
   Lines 136-140:
   ```yaml
   # Home can take a moment: the session restores and the first queries resolve.
   - extendedWaitUntil:
       visible:
         id: "home-layout"
       timeout: 90000
   ```

`home-layout` is also the **duplicate-mount canary**: `panel-navigation.e2e.test.ts:21` counts roots by that
id and is explicitly written as a count test because "both copies render, the older one is merely hidden, so
every visual assertion passed while the bug was live" (`panel-navigation.e2e.test.ts:9-11`).

**Conclusion for the spec: `home-layout` must survive the redesign under exactly that name.** Renaming it is
a three-place change across two harnesses (Maestro + two Playwright specs) with no compile-time guard, and
the Maestro half fails silently at 90 seconds inside a 75-minute macOS job.

### 1.6 Other outside-`src/` couplings that are not testIDs

- `test/module-identity-neutral.test.ts:132-142` allowlists Home files **by path string**, including
  `src/features/home/tool-row.tsx`, `tool-row-stats.tsx`, `widget-tint.ts`,
  `widgets/widget-card-header.tsx` and `widgets/program-widget.tsx`. Deleting or moving any of them needs
  this list edited in the same change.
- `test/seed-widget-layouts.test.ts:100-112` pins the demo `/arrange` tail, including `"routines-today"`.
- `scripts/seed-demo-data.mjs:335-350` seeds the demo account's 14 `widget_preferences` rows, with a comment
  block (lines 331-334) whose whole justification is `/arrange`'s add row.

---

## 2. Playwright e2e

`playwright.config.ts:29-30` — `testDir: "./test/e2e"`, `testMatch: /.*\.e2e\.test\.ts$/`. **61 spec files.**

### 2.1 Specs that assert on Home's contents — these break

| Spec                                 | Home assertions (file:line)                                                                                                                                                                                                                                                                      | Why it breaks                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth-injection.e2e.test.ts`         | `:8` `goto("/(app)")`, `:9` `getByRole("heading", { name: "Your tools", level: 2 })`                                                                                                                                                                                                             | The heading is renamed. This is the suite's **session-injection canary** — if it goes red every other spec's failure mode is misread.                                                                                                                                                                                                                                                              |
| `panel-navigation.e2e.test.ts`       | `:26-29`, `:39-43`, `:62-66` — the same `"Your tools"` h2 three times; `:21`, `:52` `home-layout`                                                                                                                                                                                                | Heading renamed. `home-layout` survives iff the id is kept.                                                                                                                                                                                                                                                                                                                                        |
| `guest-chrome.e2e.test.ts`           | `:28-30` `"Your tools"` h2                                                                                                                                                                                                                                                                       | Heading renamed.                                                                                                                                                                                                                                                                                                                                                                                   |
| `guest-conversion.e2e.test.ts`       | `:65-68` `"Your tools"` h2                                                                                                                                                                                                                                                                       | Heading renamed.                                                                                                                                                                                                                                                                                                                                                                                   |
| `guest-signin-abandon.e2e.test.ts`   | `:96`, `:128` `"Your tools"` h2 (both tests)                                                                                                                                                                                                                                                     | Heading renamed.                                                                                                                                                                                                                                                                                                                                                                                   |
| `home-widgets.e2e.test.ts`           | **whole file** — `:100, 117, 198, 221, 239` `"Your tools"` h2; `:105` clicks `Arrange`; `:233` clicks `Add tool`; `:106, 234` assert `/\/arrange$/`; `:111-113` the arrange banner; `:119, 178, 184` `"Guided programmes"` h2; every `arrange-*` locator; `:205-207, 210` post-`Done` Home state | Both tests die with `/arrange` and the two header actions (decision 7). `:207` `expect("Self-care log").toHaveCount(0)` **inverts** — Self-care log is one of the 8 tools and will always be on Home.                                                                                                                                                                                              |
| `widget-onboarding-skip.e2e.test.ts` | `:41`, `:63` `"Add tools you want to check in with each day"`                                                                                                                                                                                                                                    | That string is `navigation.json:76` `today.emptyTitle`, rendered inside the dashed `home-empty-state` box (`today-screen.tsx:348-354`). Decision 12 replaces the whole box with one quiet line.                                                                                                                                                                                                    |
| `button-tours.e2e.test.ts`           | `:14` `HOME_TOUR_KEYS = ["home:edit", "home:navigation"]`; `:184-202` (empty-dashboard skip), `:204-215` (shows the edit tip), `:218-231` (`Skip all tips` writes both keys)                                                                                                                     | Decision 18 deletes `home:edit`. Three of the five home tests assert on the edit tip's copy (`:196, 210, 226`) or on both keys landing in `shown_button_tours` (`:215, 231`). The remaining two (`:234-245`, `:247-257`) survive, though `:235` seeds `HOME_TOUR_KEYS` — a key the product would no longer write.                                                                                  |
| `routine-scheduling.e2e.test.ts`     | `:43` seeds `routines-today`; `:83` and `:138` `"Routines today"`; `:141` `"Nothing scheduled today"`                                                                                                                                                                                            | `routines-today` is dropped from Home by decision 6, and `/routines` is on neither the tools nor the modules list (#1885, _Out of scope_). The spec's own "positive control" (`:79-85`) disappears.                                                                                                                                                                                                |
| `program-widgets.e2e.test.ts`        | `:75, 111, 128, 145` `goto("/")`; `:83-87` card text on Home; `:88, 148` `programme-card-cbt`; `:113, 131, 147` `programme-badge-cbt` (`"Phase 2 of 5"`, `toHaveCount(0)`, `"Complete"`)                                                                                                         | Decision 9: the modules list on Home is **always plain**, no programme-progress card. The entire badge/ordinal contract this spec exists to pin has no Home surface left.                                                                                                                                                                                                                          |
| `settings-account.e2e.test.ts`       | `:348` `goto("/")`; `:353-355` scope to `home-layout` and assert `"Check-in"` and `"Self-care log"` inside it                                                                                                                                                                                    | **Strict-mode break from decision 5.** A favourited item appears twice on Home, rendering the identical card (decision 8), so `home.getByText("Check-in", { exact: true })` resolves **two** nodes and Playwright throws. Also `:299` seeds `shown_button_tours: ["home:edit"]` and `:327` asserts it round-trips — that survives as a DB fact but becomes a value the product no longer produces. |
| `sign-up-onboarding.e2e.test.ts`     | `:107` `getByText("Check-in", { exact: true })`; `:108` `tool-row-sleep-latest`                                                                                                                                                                                                                  | Decision 10 — onboarding no longer seeds Home, so the "personalization payoff" this block asserts no longer exists. Independently, `:107` hits the same duplicate-name strict-mode problem.                                                                                                                                                                                                        |

**12 of 61 specs.**

### 2.2 Specs that pass through `/` without asserting Home — these survive

They use Home only as a place to land, set `localStorage`, clear gates, or grant permissions:

- `draft-lifecycle.e2e.test.ts:16` (then `dismissPostSignInModals`, then away)
- `journal-overview.e2e.test.ts:52` (sets language/theme, then `/tools/journal`)
- `reminder-rearm.e2e.test.ts:201, 225, 275, 353` — followed by `waitForAppShell` (`:139-143`), which asserts
  the header's `"Open navigation"` button, not Home
- `reminder-time-entry.e2e.test.ts:54` (sets language/theme, then `/notifications`)
- `settings-preferences.e2e.test.ts:61, 115, 148` — asserts the account menu, header-owned
- `toast-position.e2e.test.ts:58` (clears gates, then away)
- `landing-page.e2e.test.ts` and `landing-guest-entry.e2e.test.ts` — `"/"` **signed out** is the landing
  screen, not Home (`landing-guest-entry.e2e.test.ts:32-56`)

### 2.3 The shared helper

`test/e2e/helpers.ts:225-235` `dismissHomeTour` waits for the `"Skip all tips"` button and clicks it if
present. It is best-effort and survives: `home:navigation` stays (decision 18), so the overlay still fires on
Home. `dismissPostSignInModals` (`helpers.ts:180-215`) calls it at line 214, which is why nearly every spec
depends on it indirectly.

### 2.4 The pattern under all of it

Every one of the 12 breaks is a **copy locator**, not a testID: `"Your tools"`, `"Guided programmes"`,
`"Arrange"`, `"Add tool"`, `"Add tools you want to check in with each day"`, `"Routines today"`. Only three
testIDs are used from e2e at all — `home-layout`, `tool-row-sleep-latest`, and the `arrange-*` / `programme-*`
families.

☠️ **And the replacement surface has no testIDs to move to.** `src/features/tools/tools-screen.tsx` and
`src/features/modules/modules-screen.tsx` register **zero** testIDs (verified by grep). If decision 8's single
shared card is built from those, the harness loses `tool-row-${id}` and gains nothing — so _the shared card
needs a testID as part of the implementation slice_, not afterwards.

---

## 3. Maestro

`.maestro/` contains **exactly one** flow: `app-store-screenshots.yaml`. It is driven by
`.github/workflows/app-store-screenshots.yml` (`:242-246`) on a `macos-26` matrix of iPhone 6.9" and iPad 13".

### 3.1 What it does with Home

| Lines   | Command                                                                                         | Depends on                           |
| ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| 137-140 | `extendedWaitUntil visible: id "home-layout"`, `timeout: 90000`                                 | **`home-layout`**                    |
| 146-154 | conditional `runFlow` — if `tour-tooltip-card` visible, tap `tour-skip-all`, wait for animation | `tour-tooltip-card`, `tour-skip-all` |
| 156-158 | `waitForAnimationToEnd` 10s, then `takeScreenshot screenshots/01-home`                          | Home's rendered content              |

Everything after line 160 leaves Home by deep link and never returns.

The flow's own header (lines 21-25) states the design rule: **"Selectors are ids, not visible copy"**, because
an earlier revision waited on the text `Today` and would never have matched. It therefore has exactly **one**
Home coupling — `home-layout` — plus the two tour ids. Keep those three names and the flow needs no edit at
all.

### 3.2 The capture sequence, and whether it still makes sense

| #   | Screenshot     | Route reached      | Wait selector                                                       |
| --- | -------------- | ------------------ | ------------------------------------------------------------------- |
| 00  | `00-sign-in`   | sign-in            | `id: sign-in-email` (`:51-56`)                                      |
| 01  | `01-home`      | `/`                | `id: home-layout` (`:137-158`)                                      |
| 02  | `02-cbt`       | `/modules/cbt`     | text `"Cognitive Behavioural Therapy"` (`:160-173`)                 |
| 03  | `03-mood`      | `/tools/check-in`  | text `"Check-in"` (`:175-188`)                                      |
| 04  | `04-journal`   | `/tools/journal`   | text `"Journal"` (`:190-203`)                                       |
| 05  | `05-breathing` | `/tools/breathing` | text `"Breathing exercises"` (`:205-218`)                           |
| 06  | `06-insights`  | `/progress`        | text `"Insights"` (`:220-233`)                                      |
| 07  | `07-tools`     | `/tools`           | text `"Standalone trackers any module can call into…"` (`:235-248`) |

The list is mirrored a second time in `.github/workflows/app-store-screenshots.yml:302-311` (`required=(…)`,
with the comment _"Keep in step with .maestro/app-store-screenshots.yaml"_), and the job fails if any name is
missing (`:314-319`), wrong-sized (`:328-337`) or byte-identical to another (`:339-347`).

**Two content-level problems the redesign creates, neither of which the guards can see:**

1. ☠️ **`01-home` and `07-tools` become near-duplicates.** Decision 8 puts the _identical_ card on Home that
   `/tools` shows. After the redesign, `01-home` is greeting + Favourites + the same 8 tool cards `07-tools`
   shows, + 3 module cards. The images will not be byte-identical (the greeting, the Favourites block and the
   module list differ), so the duplicate gate at `:342` passes — but two of eight listing images would be
   showing substantially the same content. That is a listing-quality decision the spec should make
   deliberately, not discover at upload.

2. ☠️ **The demo account's Home becomes almost entirely duplicated.** `scripts/seed-demo-data.mjs:335-350`
   seeds 14 widget ids for the demo account, and the Maestro flow signs in as exactly that account
   (`.maestro/app-store-screenshots.yaml:58-75`, `MAESTRO_DEMO_EMAIL`). Mapping those 14 through
   `WIDGET_META`'s `toolKey` (`widget-registry.tsx`) and deduping, per decision 11:

   | Seeded id                                       | `toolKey`                               |
   | ----------------------------------------------- | --------------------------------------- |
   | `mood-checkin`                                  | `mood`                                  |
   | `breathing-suggested`                           | `breathing`                             |
   | `journal-week`                                  | `journal`                               |
   | `gratitude-latest`                              | `gratitude`                             |
   | `habits-today`                                  | `habits`                                |
   | `sleep-latest`                                  | `sleep`                                 |
   | `meditation-pick`                               | `meditation`                            |
   | `grounding-log`                                 | `grounding`                             |
   | `self-care`, `cbt-open-record`, `cbt-programme` | `cbt`                                   |
   | `act-drop-anchor`, `act-programme`              | `act`                                   |
   | `routines-today`                                | `routines` — **no card on either list** |

   That is **all 8 tools** (the exact set `src/features/tools/tools-screen.tsx:48-97` lists) plus 2 of the 3
   modules. So the demo account's Favourites would contain nearly the whole catalogue, and `01-home` would
   photograph every card twice with a duplicate of the tools list immediately below. **The demo seed needs
   re-thinking as part of this effort, or the listing screenshot is worse than the one it replaces.**

### 3.3 The flow is not currently producing anything

`.github/workflows/app-store-screenshots.yml:24-33` — **STATUS: this workflow does NOT currently produce
usable screenshots.** The app cannot complete a TLS handshake to Supabase from inside the simulator on the
free runners (issue #547); the capture reaches sign-in submit and stops. Line 29: _"The 0.9.0 listing was shot
from the web build instead."_ And lines 35-37: `workflow_dispatch` only exists once the file reaches `main`.

**So the Maestro breakage risk is theoretical today.** Keeping `home-layout` costs nothing and preserves the
flow for whenever #547 is answered; the sequence question above is real regardless of which harness shoots it.

---

## 4. Shipped store media

### 4.1 What the repository actually holds

`store/README.md:5-9` enumerates the directory exhaustively — three files:

| File                        | Mirrors                                                                                   | Guarded by                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `store/apple-advisory.json` | the age-rating half of the ASC record                                                     | `.github/workflows/store-metadata-drift.yml` weekly; `test/store-advisory-invariants.test.ts` on every PR |
| `store/apple-info.json`     | ASC listing **text** (`subtitle`, `promoText` — two fields, verified by reading the file) | the same weekly workflow, via `scripts/check-store-listing-drift.mjs`                                     |
| `store/play-listing.md`     | the Google Play listing **text**                                                          | **nothing**                                                                                               |

`.github/workflows/store-metadata-drift.yml` compares `.apple.advisory` (`:144-145`) and the listing text
(`:206-208`). **It does not read, compare, or even mention screenshots or media.** Grepping `store/` for
`screenshot|image|media|graphic` returns one hit, `play-listing.md:70`, about content-rating definitions.

The only Home-showing image committed anywhere is `docs/launch/reddit-post/screen-dashboard.png`, used by
`docs/launch/reddit-post/banner.html:137` to build the Play **feature graphic** —
`docs/launch/play-listing/README.md:12-15` says those phone screenshots _"predate v0.5.0"_ and that
_"the listing's actual screenshot slots still need fresh captures from the current build (owner step on #201)."_
That README has not been touched since `e764ef29` (2026-07-23); issue #201 closed 2026-07-24.

### 4.2 The count

**The repository does not record which screenshots are uploaded to Google Play or to App Store Connect, in
what quantity, or which of them show Home.** There is no `fastlane/`, no `store.config.json` (deliberately —
`store/README.md`, _"What it is deliberately not"_), no media manifest, and no doc listing the uploaded slots.

**The count must come from the consoles** — mark this **UNVERIFIED**. What would settle it:

- **Google Play**: Play Console → Store presence → Main store listing → _Phone screenshots_ (☠️ 9:16 only),
  plus the 7-inch and 10-inch tablet slots if filled. Count the frames showing Home.
- **App Store Connect**: app `6796318929` → the current version → Media Manager, per display size
  (iPhone 6.9″ and iPad 13″ are the two the capture workflow targets,
  `.github/workflows/app-store-screenshots.yml:63-73`). Count the frames showing Home per size — ASC
  duplicates the set across sizes, so one Home shot is at least two uploaded files.

### 4.3 What the repository _does_ let us conclude

**Whatever is on those listings almost certainly already predates today's Home.**

`git log` on `src/features/home/today-screen.tsx` puts the current design at **2026-08-14**:

- `e1a620f4` _"the Your tools tier becomes rows, with nine tool stats (#988)"_
- `44749167` _"the Guided programmes tier — honest ordinal badge, no bar (#993)"_
- `12ae1458` _"the Right now tier — mood card and two derived nudges (#994)"_
- `636580e6` _"the greeting, two header actions, and the empty state (#979)"_
- `706b99bb` _"arrange becomes a route, and AddWidgetModal dies (#980)"_

Against that:

- Play's listing slots were filled for the go-live checklist #201, **closed 2026-07-24** — three weeks
  _before_ the current Home existed.
- ASC's images: `.github/workflows/app-store-screenshots.yml:29` records that _"the 0.9.0 listing was shot
  from the web build"_, and `docs/app-store-review-information.md:32` says of build 6 (0.11.1) that on `dev`
  _"the home screen was redesigned"_ — i.e. the submitted build's Home was already the older design.

So a Home screenshot on either listing today is **at least one Home design stale already**, and the
Favourites redesign would make it two. That is a materially different situation from "shipping a change
breaks fresh media".

**UNVERIFIED**: whether either listing's media has been re-uploaded since 2026-08-14. Settled by the same two
console reads, checking each asset's upload date.

---

## 5. Recommendation

**Re-shooting store media belongs in a _later_ effort, not in this one. The harness work belongs in this one.**

The cost I measured:

- **Harness — must be in this effort, and it is not small.** 12 of 61 Playwright specs assert on Home's
  contents. Two die outright (`home-widgets`, `program-widgets`), one loses its positive control
  (`routine-scheduling`), one loses its subject (`widget-onboarding-skip`), three of five tests in
  `button-tours` go, and six more break on the single string `"Your tools"` — including
  `auth-injection`, the suite's session canary. Two additional breaks (`settings-account:354`,
  `sign-up-onboarding:107`) are **strict-mode violations created by decision 5**, which is the kind of failure
  that reads as a flake rather than as a contract change. None of this can be deferred: it is the merge gate.
- **`home-layout` — free, and must be paid.** Keeping the name costs one line of the new layout. Losing it
  costs a silent 90-second timeout in a 75-minute macOS job (`.maestro/app-store-screenshots.yaml:137-140`)
  plus two Playwright specs with no compile-time guard.
- **Maestro — no edit needed if the three ids survive.** And the flow does not currently produce usable
  screenshots at all (`.github/workflows/app-store-screenshots.yml:24-29`, issue #547), so there is nothing
  live to break.
- **Store media — the repo can neither count it nor guard it.** The drift workflow covers age rating and
  listing text only. The count requires two console reads nobody in this repo can do from CI, and every
  indication is that the shipped Home shots are **already stale by one design generation** (§4.3). Re-shooting
  now would also photograph a demo account whose Favourites hold nearly the entire catalogue (§3.2), i.e. the
  worst possible frame of the new Home.

Doing media in this effort would mean: fix the demo seed, answer #547 _or_ build a web-capture path, read both
consoles, re-shoot at four device sizes, and re-upload — none of which the Home spec depends on, all of which
is blocked on an owner with console access. Doing it later means the listings stay as stale as they already
are for a few more weeks, which is a cost the repo has been carrying since 2026-08-14 without incident.

**Concretely: this effort should carry three things and hand off the fourth.**

1. Keep `home-layout` on the new root, verbatim. Non-negotiable.
2. Give the new shared card a `testID` (`src/features/tools/tools-screen.tsx` and
   `src/features/modules/modules-screen.tsx` have none today), and disambiguate the favourite copy from the
   catalogue copy — otherwise decision 5 turns every plain-text Home locator into a strict-mode error.
3. Update the 12 specs in §2.1 in the same slices that change the copy they assert on, and update
   `scripts/seed-demo-data.mjs` and `test/seed-widget-layouts.test.ts` with the `widget_preferences`
   migration.
4. **File a separate ticket** for: read both consoles, count the Home frames, decide whether `01-home` and
   `07-tools` should both exist on a listing after decision 8, fix the demo seed for capture, then re-shoot.

---

## 6. Open questions and UNVERIFIED items

| Item                                                                                                                                                                     | Status                                                                                                        | What would settle it                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Number of Home-showing screenshots on the Play listing                                                                                                                   | **UNVERIFIED** — the repo records no media inventory                                                          | Play Console → Main store listing → Phone screenshots (9:16 only), plus tablet slots |
| Number of Home-showing screenshots in App Store Connect                                                                                                                  | **UNVERIFIED**                                                                                                | ASC app `6796318929` → current version → Media Manager, per display size             |
| Whether either listing's media has been re-uploaded since 2026-08-14                                                                                                     | **UNVERIFIED**                                                                                                | Asset upload dates in the same two console views                                     |
| Whether `programme-card-${module}` survives as an id on the new plain module card                                                                                        | Spec question for #1885, not a fact in the repo                                                               | The Home spec's closing comment                                                      |
| Whether the native launcher widget's `CARD_REPLICAS` (`src/features/widgets/snapshot-types.ts:164`, `snapshot-builder.ts:483-487`) is affected by the catalogue collapse | Out of scope here — no testID or media coupling — but it mirrors `WIDGET_META` and does list `routines-today` | A premise check on whichever slice touches `WIDGET_META`                             |

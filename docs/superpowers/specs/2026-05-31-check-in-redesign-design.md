# Check-in Redesign & Uniform Widgets — Design

- **Date:** 2026-05-31
- **Status:** Approved design, pending implementation plan
- **Scope:** Polish the **Check-in** tool (the `mood` feature) end-to-end — its two home widgets and its three tool pages — and make the change to the home grid that lets it happen: **all widgets become one uniform tile (same width and height)**. Check-in is the **template**; the reusable pieces here get rolled to the other tools in later rounds.
- **Source design:** Claude Design handoff "Check-in Redesign", **Direction B · Insight-forward** (locked). HTML/CSS prototype recreated faithfully in React Native; values map to the existing design tokens. No pixel-for-pixel obligation — match intent and the design system.

This is a **design document**, not a task checklist. The implementation breakdown lives in the separate implementation plan (task tracking stays out of the repo per `AGENTS.md`).

---

## 1. Context & current state

SelfTend is an Expo + React Native + TypeScript mental-health app on a Supabase backend. The "Check-in" tool is the **`mood`** feature (`src/features/mood/**`, routed under `app/(app)/tools/mood-tracker/**`). Two home-screen widgets surface it: `mood-checkin` and `mood-trend` (`src/features/home/widgets/**`).

Two findings de-risk the whole effort:

1. **No schema/DB changes are needed.** `MoodLog` (`src/features/mood/types.ts`) already carries `emotions`, `notes`, `situation`, `thoughts`, `behaviours`, `bodilySensations`, `linkedStrategy`, and `loggedAt`. The editor already reads/writes all of them. The redesign is **presentation, microcopy, and new client-side aggregations** over data we already have.
2. **"Uniform width + height" is nearly free.** Every widget already renders at a fixed `WIDGET_HEIGHT = 200` (`today-screen.tsx`), so heights are _already_ uniform. The only non-uniform thing in the entire registry is `mood-checkin`'s `colSpan: 2`. Making all tiles uniform = drop that one span and delete the width-variation machinery.

The inline header stat row the design asks for (`247 check-ins · 12 this week · 3.4 avg`) needs **no new component**: `ModuleHomeHeader` already exposes a `meta` slot (`module-home-header.tsx`), and Mindfulness already uses it for the same `practices · sessions` pattern (`mindfulness-home-screen.tsx`).

### Layout-model decision (and the alternatives rejected)

The home grid will use **one uniform tile per widget — same width AND height** — rendered with the existing `Sortable.Flex`. Considered and rejected:

- **Same width, variable height (single column):** simplest only if we drop multi-column; on wide screens it becomes masonry.
- **Masonry (multi-column, variable height):** `react-native-sortables@1.9.4` does **not** support it — `Sortable.Grid` is a _row-aligned_ grid (each row = its tallest item; `GridLayoutProvider/utils/layout.js`), and its drag hit-testing is bound to that layout. True masonry would mean replacing the drag-and-drop engine with a custom reanimated build — a separate, higher-risk investment, deferred.

Uniform tiles keep `Sortable.Flex` (its happy path) and make the grid code strictly simpler.

---

## 2. Goals & non-goals

**Goals**

- Ship the Direction-B check-in experience: insight-forward main page, refined entry form, hero-strip detail, and two polished home widgets.
- Make all home widgets uniform tiles; simplify `today-screen.tsx`.
- Build the cross-tool-reusable primitives (§4) so check-in becomes a true template.
- Wire every number to real data. No placeholders ship.
- Preserve the app's safety affordances and non-punitive tone.

**Non-goals (this slice)**

- No DB/schema migrations.
- No History **filter** UI and no dedicated full-history screen.
- No true masonry layout.
- No rollout to the other tools yet (that's the next round, using §4 as the template).

---

## 3. Layout infrastructure — uniform widgets

`today-screen.tsx` change is purely **subtractive**; keep `Sortable.Flex`.

- Every cell renders at `cellWidth × WIDGET_HEIGHT`.
- Remove `clampSpan` / `spanForWidget` usage and the per-widget `width` calc; remove the `span` field from `WidgetMeta` in `widget-registry.tsx` (only `mood-checkin` used `colSpan: 2`).
- Keep `computeColumns` / `numColumns` / `cellWidth` for responsive 1–3 columns.
- Keep `WIDGET_HEIGHT = 200`. Verify the two check-in widgets fit it without clipping (per the **hero-stat-never-hides** rule); only bump the shared constant if something genuinely needs it.

**Result:** every widget is one uniform tile that wraps cleanly. No masonry, no `colSpan`.

---

## 4. Shared primitives (the template for other tools)

Built as reusable pieces because consistency across tools is the point:

- **`HistoryList`** — entries grouped `Today / Yesterday / Earlier this week / Older`, each group headed with a per-group average chip; rows are tappable to the entry. Reusable by journal, gratitude, sleep, etc.
- **Header stat-row `meta`** — a small stat-row node (`N check-ins · N this week · 3.4 7-day avg` + a `Last · …` sub-line, in the tool's hue) passed into the existing `ModuleHomeHeader.meta`. Reusable on every module home.
- **Week hero** — 7-day average + delta vs last week, 7 per-day bars, and a top-items list. Reusable "this week" shape.
- **Detail hero-strip** — score chip + word + time + Edit/Delete inline, replacing stacked cards. Reusable detail pattern.

---

## 5. Home widgets

- **`mood-checkin`** — drops to one column. Keeps the compact `MoodScale` (taps → `/tools/mood-tracker/new?score=`). Sub-line reads "Logged 3× · last 4:08 PM", or "How are you feeling?" when the day is empty.
- **`mood-trend`** — keeps its two-stat body (7-day avg · entries) + Open link; light polish to match the new tile.

Both must fit the uniform tile without clipping.

---

## 6. Check-in main page (`mood-tracker-screen.tsx`)

- **Header** gains the stat-row `meta` (§4).
- **Today card**: keep, but **remove "+ Log another"** (the emoji row already starts a check-in). Keep date-bar scoping — the Today card reflects the **selected day**.
- **Replace** the two summary tiles with the **Week hero** (§4): big 7-day average + delta, 7 per-day bars, top emotions with counts (resolved via `useEmotionDisplay`).
- **Trend**: add a `7d / 14d / 30d` segmented toggle driving `buildMoodChartData(days)`. Extend `MoodLineChart` with a soft `be`-hue area fill and a **theme-aware** stroke (currently hardcoded `#6366f1`, `mood-line-chart.tsx`).
- **Replace** the today-only "Recent" list with the full **`HistoryList`** (§4) over the already-loaded logs. Drop the mock's "Filter" affordance for v1.

## 7. New / Edit form (`mood-entry-editor-screen.tsx`)

- One shared form powers both `create` and `edit` modes — keep that.
- Mood picker uses the **labelled** (non-compact) `MoodScale` — already exists.
- **Rework "Go deeper"**: the four stacked textareas → a **2×2 grid** (Situation / Thoughts / Response / In your body) with plainer helper copy. **"In your body"** becomes quick-tap **chips** (Chest tight, Shoulders, Jaw…) serialized into the existing `bodilySensations` string, plus an optional free-text note. No schema change.
- **Preserve** the crisis-support callout (score ≤ 1) and the breathing nudge (score ≤ 2). Keep the existing `DateTimeField` (the design's "real date picker" ask is already satisfied).

## 8. Entry detail (`mood-detail-screen.tsx`)

- Collapse the stacked score/time/edit cards into one **hero strip**: score chip + "Good · 4" + time + Edit/Delete.
- Below: compact Emotions + Logged-at, then Notes, then the Go-deeper field cards and the linked-strategy card (all preserved, restyled).

---

## 9. Data / aggregations (`summaries.ts`, no DB changes)

New **pure** helpers over the existing `moodLogs` array, each unit-tested:

- `getWeekByDay` → 7 per-day averages (for the bars).
- `getWeekDelta` → this-week avg vs last-week avg.
- `getTopEmotions` → emotion-id → count, mapped through `resolveEmotion`.
- `groupLogsByDate` → `Today / Yesterday / Earlier this week / Older` groups with per-group averages.
- **All-time check-in count** for the header stat — a lightweight count rather than relying on the 200-row fetch cap, so it stays accurate.

---

## 10. Decisions defaulted (override on review)

- **Mood-scale selected color:** the mock tints the selected step by score (red→green). The app uses a single `act`-green selection app-wide. **Defaulted to keeping `act`-green** for shared-component consistency.
- **History depth on the main page:** show grouped history over the already-loaded logs (generous); **no separate "View all" screen** in v1.

---

## 11. Risks & verification

- **Tile fit:** the two check-in widgets must not clip at `WIDGET_HEIGHT = 200`; verify, bump the shared constant only if required.
- **`MoodLineChart` theming:** moving off the hardcoded stroke must read correctly in both light/dark.
- **Verification:** new aggregations covered by unit tests; existing mood unit/e2e suites stay green; `npm run verify` passes. Edge functions are untouched.

---

## Appendix · Source design files

The Claude Design handoff bundle (Direction B): `Check-in Redesign.html` + `checkin/{shell,screens,screens2}.jsx` + `checkin/app.css`. Tokens in `app.css` are copied from the product design system; component classes there are the visual reference for this implementation.

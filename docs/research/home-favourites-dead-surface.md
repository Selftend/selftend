# Dead-surface inventory: what dies with the widget catalogue

Research output for [#1892](https://github.com/Selftend/selftend/issues/1892), a child of map
[#1885](https://github.com/Selftend/selftend/issues/1885). Reading only — no product code was
changed.

**Base:** `origin/dev` at `d87efd4c` (2026-09-04). Every claim below cites a file and line at that
commit. Anything I could not verify is marked **UNVERIFIED** rather than guessed.

**Scope assumed from the map's settled table:** the 25-id `WIDGET_META` catalogue collapses to the
8 tools on `/tools` and the 3 modules on `/modules`; `/arrange` is deleted; the `Right now` tier is
deleted; onboarding stops seeding Home; the `home:edit` tour stop is deleted.

---

## 0. Premise corrections found while reading

Six of the ticket's or the map's premises do not survive contact with the code. They change the
shape of the work, so they lead.

| #   | Premise as written                                                                                                      | What the code says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ☠️☠️ "the `home.widgets.*` block (~25 title + description pairs)" dies                                                  | **`home.widgets.*` has 100 leaf keys per locale, and 78 of them are rendered by the Android launcher, not by Home.** `src/features/widgets/snapshot-builder.ts` names 65 distinct `home.widgets.*` keys (verified: `grep -oE '"home\.widgets\.[^"]+"' … \| sort -u \| wc -l` → 65) and `src/features/widgets/widget-config-screen.tsx:120-203` names 11 more under `home.widgets.config.*` plus `t(meta.titleKey)` at `:153` for all 25 catalogue ids. Only **16 keys per locale** actually orphan. §3.                                                                                                                                                                                                                                                      |
| 2   | ☠️☠️ `src/components/app/shared-tools-row.tsx` and `src/features/act/act-shared-tools.ts` are part of the dying surface | **Neither has anything to do with Home or the widget catalogue.** They are the `Also try` / `Uses these shared tools` chip rows on CBT and ACT module screens, with 8 live call sites (`src/features/cbt/cbt-home/cbt-pillars-section.tsx:73`, `src/features/act/act-committed-action-list-screen.tsx:100`, `act-connection-list-screen.tsx:67`, `act-defusion-list-screen.tsx:78`, `act-expansion-list-screen.tsx:77`, `act-observing-self-list-screen.tsx:64`, `act-values-screen.tsx:115`). Both **SURVIVE UNTOUCHED**. Probable cause: the name collision with `SHARED_TOOL_WIDGET_IDS` in `src/features/onboarding/recommendations.ts:7`, which is a different thing entirely.                                                                          |
| 3   | `useMoodLogs`, `useHabits` and the `*Count` hooks "are used by `/tools` and `/progress` too"                            | Half right. `/tools` (`src/features/tools/tools-screen.tsx:10-19`) does share 8 of them. **`/progress` shares none** — `src/features/progress/progress-screen.tsx:18` imports exactly one hook, `useMoodScorePoints`, which Home never calls. The real second consumer is **`src/features/widgets/use-widget-snapshot-sync.ts`** (the Android launcher), which shares 7. §2.3.                                                                                                                                                                                                                                                                                                                                                                               |
| 4   | ☠️☠️ (map #17) "`apply_widget_recommendations` dies"                                                                    | That function is **the sole writer of the onboarding-completion state**, not just of widget rows: `widgets_seeded`, `selected_concerns`, `initial_concerns`, `app_onboarding_completed`, `app_onboarding_completed_via`, `app_onboarding_completed_at` (`supabase/migrations/20260901010000_initial_concerns_grandfathered_guard.sql:99-155`). `src/components/app/protected-layout.tsx:236` is the app's only first-run completion path and it goes through this RPC. `initial_concerns` additionally feeds two live reports (`scripts/analytics-onboarding.sql:94`, `scripts/analytics-segment.sql:154-162`) and `docs/analytics.md:85`. Killing the function without a replacement writer breaks first-run onboarding and the #1605 intake reporting. §5. |
| 5   | The map lists the files that die                                                                                        | **`src/components/app/add-to-home-button.tsx` is not on any list and cannot survive the collapse.** It is the `+` popover that writes a widget id into `widget_preferences` (`:35`, `:73`), it reads `WIDGET_META`/`isImplemented`/`tintClasses`/`useWidgetToggle` (`:12-14`), and it has **7 call sites** across `app/(app)/modules/**` and `src/components/app/module-home-header.tsx:128`. §2.2.                                                                                                                                                                                                                                                                                                                                                          |
| 6   | (map #14) "the stat line stays on the shared card"                                                                      | There are **two** stat implementations with different copy and different hooks. Home's is `src/features/home/tool-row-stats.tsx` (539 lines, 24 `home.rows.*` keys). `/tools` already has its own at `src/features/tools/tools-screen.tsx:122-151` (16 `navigation:tools.stats.*` keys). They disagree on sources — `useSleepStats` vs `useSleepLogCount`, `useMoodWeek` vs `useMoodLogs(30)`. One of the two dies and its key block orphans; the spec has not chosen. §7.                                                                                                                                                                                                                                                                                   |

---

## 1. File-by-file verdicts

Verdicts are **DELETE** (the file goes), **SURVIVES REDUCED** (the file stays, part of it goes) and
**SURVIVES** (untouched by this change). Line counts are `wc -l` on `origin/dev`.

### 1.1 `src/features/home/`

| File                                  | Lines | Verdict                                     | Reason                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------- | ----: | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arrange-screen.tsx`                  |   598 | **DELETE**                                  | The `/arrange` route body. Map #7. Sole importer `app/(app)/arrange.tsx:1`.                                                                                                                                                                                                                                                                                                                         |
| `arrange-screen.test.tsx`             |   817 | **DELETE**                                  | Tests only the above.                                                                                                                                                                                                                                                                                                                                                                               |
| `arrange-row.tsx`                     |    77 | **DELETE**                                  | Only importer `arrange-screen.tsx:26`.                                                                                                                                                                                                                                                                                                                                                              |
| `arrange-row.test.tsx`                |    83 | **DELETE**                                  | Tests only the above.                                                                                                                                                                                                                                                                                                                                                                               |
| `arrange-chip-copy.ts`                |    63 | **DELETE**                                  | Only importers `arrange-screen.tsx:27` and `widget-registry.test.tsx:16`. Holds the arrange chip-run copy maps.                                                                                                                                                                                                                                                                                     |
| `right-now-tier.tsx`                  |   206 | **DELETE**                                  | Map #3 deletes the tier, the mood check-in card and both nudges. Only importer `today-screen.tsx:23`.                                                                                                                                                                                                                                                                                               |
| `right-now-tier.test.tsx`             |   236 | **DELETE**                                  | Tests only the above.                                                                                                                                                                                                                                                                                                                                                                               |
| `widget-registry.tsx`                 |   449 | ☠️ **SURVIVES REDUCED — cannot be deleted** | `WIDGET_META` has **6 consumers outside Home** (§2.1), four of them the Android launcher. `WIDGET_REGISTRY`, `resolveWidget`, `moduleTagFor`, `chipCategoryFor`, `CHIP_CATEGORY_ORDER`, `isImplemented` and `WidgetTier` all lose their last caller; `WIDGET_META`, `metaForWidget` and `toolKey` do not.                                                                                           |
| `widget-registry.test.tsx`            |   656 | **SURVIVES REDUCED**                        | The route/tool-key/chip-category suites go with the functions they pin; the launcher-facing catalogue assertions must stay.                                                                                                                                                                                                                                                                         |
| `widget-tiers.ts`                     |    58 | **DELETE**                                  | `useWidgetTiers` + `PROGRAMME_ORDER`. Importers: `today-screen.tsx:21`, `arrange-screen.tsx:28`. Both die or stop calling it. No test file of its own.                                                                                                                                                                                                                                              |
| `use-widget-toggle.ts`                |    29 | **DELETE**                                  | Only importer `src/components/app/add-to-home-button.tsx:14`, which itself dies (§2.2). No test file of its own.                                                                                                                                                                                                                                                                                    |
| `widget-repository.ts`                |   126 | **DELETE**                                  | `listWidgetPreferences`, `addWidgetPreference`, `deleteWidgetPreference`, `restoreWidgetPreference`, `setWidgetOrder`, `getWidgetsSeeded`, `markWidgetsSeeded`. Only importer is `queries.ts:9`. ⚠️ `getWidgetsSeeded`/`markWidgetsSeeded` (`:49-70`) already have **no caller at all** on `dev` — dead today.                                                                                      |
| `widget-repository.test.ts`           |   258 | **DELETE**                                  | Tests only the above.                                                                                                                                                                                                                                                                                                                                                                               |
| `queries.ts`                          |    69 | ☠️ **SURVIVES REDUCED**                     | `useWidgetPreferences` has **two live consumers on `/routines`**: `src/features/routines/routines-home-screen.tsx:59` and `src/features/routines/starter-offer-card.tsx:93`. `useAddWidget`, `useRemoveWidget`, `useRestoreWidget`, `useReorderWidgets` all lose their callers and die.                                                                                                             |
| `queries.test.tsx`                    |   232 | **SURVIVES REDUCED**                        | Keeps the `useWidgetPreferences` cases, drops the four mutation suites.                                                                                                                                                                                                                                                                                                                             |
| `today-screen.tsx`                    |   459 | **SURVIVES REDUCED**                        | This is the screen being redesigned. Greeting block (`:226-237`) is untouched per map #15; everything from `:239` down is rewritten.                                                                                                                                                                                                                                                                |
| `today-screen.test.tsx`               |   681 | **SURVIVES REDUCED**                        | Rewritten with the screen. §4.3 lists the assertions that must not be carried over as-is.                                                                                                                                                                                                                                                                                                           |
| `tool-row.tsx`                        |   145 | **DELETE (probable)**                       | Home's row component. Map #8 says a favourite renders the _identical card to its catalogue copy_, i.e. the `/tools` and `/modules` card — one component, no variants. **UNVERIFIED which component wins**; if `ToolRow` is the survivor this becomes SURVIVES REDUCED. Only importer `tool-row-stats.tsx:5`. ⚠️ Listed in `test/module-identity-neutral.test.ts:136` as a scanned identity surface. |
| `tool-row.test.tsx`                   |   214 | follows `tool-row.tsx`                      | —                                                                                                                                                                                                                                                                                                                                                                                                   |
| `tool-row-stats.tsx`                  |   539 | ☠️ **SURVIVES REDUCED**                     | Map #14 keeps the stat line. But 20 of its 25 `StatRow` components serve ids that leave the catalogue; only the 8 tool rows plus the programme rows survive. §2.3 lists the hooks that go with the other 17. ⚠️ Also in `module-identity-neutral.test.ts:137`.                                                                                                                                      |
| `tool-row-stats.test.tsx`             |   594 | **SURVIVES REDUCED**                        | —                                                                                                                                                                                                                                                                                                                                                                                                   |
| `types.ts`                            |     7 | **DELETE**                                  | `WidgetPreference`. Importers `widget-repository.ts:1`, `widget-tiers.ts:3`. Survives only if `useWidgetPreferences` keeps its row type for `/routines` — **UNVERIFIED**, depends on how #1889 reshapes the table.                                                                                                                                                                                  |
| `program-widget-status.ts`            |    83 | ☠️ **SURVIVES**                             | `useProgramWidgetTaskStatus` is called by the Android launcher at `src/features/widgets/use-widget-snapshot-sync.ts:31,71,78`. It is **not** Home-only.                                                                                                                                                                                                                                             |
| `program-widget-status.test.ts`       |   100 | **SURVIVES**                                | —                                                                                                                                                                                                                                                                                                                                                                                                   |
| `widget-tint.ts`                      |    94 | ☠️ **SURVIVES**                             | `tintClasses` is called by `src/features/widgets/widget-config-screen.tsx:12` (Android launcher). Also allowlisted by `test/no-destructive-text-on-destructive-wash.test.ts:35,165` and scanned by `module-identity-neutral.test.ts:132`.                                                                                                                                                           |
| `widgets/program-widget.tsx`          |   113 | **DELETE**                                  | Map #9: no programme-progress card on Home. Importers: `cbt-programme-widget.tsx:1`, `act-programme-widget.tsx:1`. ⚠️ Must move from `IDENTITY_SURFACES` to `RETIRED` in `module-identity-neutral.test.ts:141`.                                                                                                                                                                                     |
| `widgets/program-widget.test.tsx`     |   206 | **DELETE**                                  | —                                                                                                                                                                                                                                                                                                                                                                                                   |
| `widgets/cbt-programme-widget.tsx`    |     5 | **DELETE**                                  | Only importer `widget-registry.tsx:4`.                                                                                                                                                                                                                                                                                                                                                              |
| `widgets/act-programme-widget.tsx`    |     5 | **DELETE**                                  | Only importer `widget-registry.tsx:5`.                                                                                                                                                                                                                                                                                                                                                              |
| `widgets/widget-card-header.tsx`      |    43 | **DELETE — already dead today**             | ☠️ No production importer exists on `dev`. `program-widget.tsx` does **not** import it (checked `:1-13`); the only reference in the whole repo is its own test at `widget-card-header.test.tsx:3` and the scan list at `module-identity-neutral.test.ts:133`.                                                                                                                                       |
| `widgets/widget-card-header.test.tsx` |    15 | **DELETE**                                  | —                                                                                                                                                                                                                                                                                                                                                                                                   |

### 1.2 Router, onboarding, tours, and the two mis-scoped files

| File                                                | Lines | Verdict                                   | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ----: | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(app)/arrange.tsx`                             |     1 | **DELETE**                                | `export { default } from "@/src/features/home/arrange-screen"`. Map #7.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/features/onboarding/concerns.ts`               |    40 | **DELETE**                                | `CONCERN_KEYS`, `isConcernKey`, `CONCERN_WIDGETS`, `resolveConcernWidgetIds`. Importers: `recommendations.ts:1`, `repository.ts:1`, `queries.ts:3`, `app-onboarding-wizard.tsx:11`, `test/seed-widget-layouts.test.ts:5`. All exist only to compute `widgetIds` (map #17).                                                                                                                                                                                                                 |
| `src/features/onboarding/concerns.test.ts`          |    37 | **DELETE**                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/features/onboarding/recommendations.ts`        |    67 | **DELETE**                                | `SHARED_TOOL_WIDGET_IDS`, `buildWidgetRecommendations`, `suggestSharedToolWidgetIds`. Importers: `app-onboarding-wizard.tsx:12-17`, `widget-registry.test.tsx:14`, `test/seed-widget-layouts.test.ts:6-11`.                                                                                                                                                                                                                                                                                |
| `src/features/onboarding/recommendations.test.ts`   |    92 | **DELETE**                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/features/onboarding/repository.ts`             |    22 | ☠️ **SURVIVES REDUCED, not DELETE**       | It is the only `client.rpc("apply_widget_recommendations")` call site (`:16`) and therefore the only path that marks onboarding complete. The `widgetIds` argument dies; the completion write must not. See premise #4 and §5.                                                                                                                                                                                                                                                             |
| `src/features/onboarding/repository.test.ts`        |    40 | **SURVIVES REDUCED**                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/features/onboarding/queries.ts`                |    59 | **SURVIVES REDUCED**                      | `useApplyWidgetSuggestions` (`:46`) dies with Home's `Get suggestions`. `useCompleteAppOnboarding` (`:27`) must survive in some form — `protected-layout.tsx:46,236` depends on it.                                                                                                                                                                                                                                                                                                        |
| `src/features/onboarding/queries.test.ts`           |   109 | **SURVIVES REDUCED**                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/features/tours/home-tour.tsx`                  |   143 | **SURVIVES REDUCED**                      | Map #18: drop `{ storageKey: "home:edit", targetKey: "home-edit", i18nKey: "edit" }` at `:20`; keep `home:navigation` at `:21`. ⚠️ `ALL_HOME_KEYS` (`:24`) then has one element, so `onDismissAll` (`:140`) becomes identical to `onDismiss` (`:139`) and the `Skip all tips` control (`homeTour.skipAll`, `:137`) is degenerate. Decide whether it still renders.                                                                                                                         |
| `src/features/tours/home-tour.test.tsx`             |   179 | **SURVIVES REDUCED**                      | Four of its seven cases are built on `home-edit`. §4.2.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/components/app/app-onboarding-wizard.tsx`      |   386 | **SURVIVES REDUCED**                      | Map #17 guts it. `concerns` (`:289-305`), `modules` (`:308-330`) and `guidance` (`:333-350`) panels exist only to compute `widgetIds`; `welcome` and `routines` (`:353-378`) have independent effect — `routines` writes a real starter routine through `useKeepStarterRoutine` (`:106-110`, `:166-172`). ⚠️ It imports the dying `onboarding/concerns` and `onboarding/recommendations` directly (`:11-17`), so it **cannot compile** once those go; it has to change in the same commit. |
| `src/components/app/app-onboarding-wizard.test.tsx` |   439 | **SURVIVES REDUCED**                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/components/app/shared-tools-row.tsx`           |   105 | ✅ **SURVIVES — not part of this change** | See premise #2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/features/act/act-shared-tools.ts`              |    34 | ✅ **SURVIVES — not part of this change** | See premise #2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### 1.3 Files not named by the ticket that die or change with it

| File                                                                            | Verdict              | Reason                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/app/add-to-home-button.tsx` (93 lines)                          | **DELETE**           | Writes widget ids into `widget_preferences`; there is no such id after the collapse. 7 call sites — §2.2.                                                                             |
| `test/e2e/home-widgets.e2e.test.ts` (246 lines)                                 | **DELETE**           | The `/arrange` end-to-end suite.                                                                                                                                                      |
| `test/seed-widget-layouts.test.ts` (215 lines)                                  | **DELETE**           | Imports `WIDGET_META` (`:4`), `onboarding/concerns` (`:5`) and `onboarding/recommendations` (`:6-11`) to prove the two seeded Home layouts are derivable. Its subject stops existing. |
| `test/integration/apply-widget-recommendations.integration.test.ts`             | **SURVIVES REDUCED** | Follows whatever #1889 does to the RPC.                                                                                                                                               |
| `test/integration/initial-concerns.integration.test.ts`                         | **SURVIVES REDUCED** | Same.                                                                                                                                                                                 |
| `supabase/seed.sql:271-300`, `scripts/seed-demo-data.mjs:299,317-359,5254-5314` | **SURVIVES REDUCED** | Both seed `widget_preferences` rows and `selected_concerns`; both are pinned by `test/seed-widget-layouts.test.ts`.                                                                   |
| `src/features/widgets/**` (the Android launcher, 24 files)                      | ✅ **SURVIVES**      | But it is the change's largest hazard — §2.1.                                                                                                                                         |

---

## 2. Importers of everything marked DELETE

Every grep below covered **both `src/` and `app/`** (and `test/`, `scripts/`, `.maestro/` where
relevant). The `app/` router tree is where a `src/`-only grep has produced false "one caller"
conclusions in this repo before.

### 2.1 ☠️☠️ The Android launcher owns half the "dead" surface

`src/features/widgets/` is a separate product — the Android home-screen widget — and it mirrors the
dashboard catalogue by design (`src/features/widgets/snapshot-types.ts:132-137`: _"Launcher-configurable
cards; must mirror the dashboard catalogue (`WIDGET_META`)"_). `CARD_IDS` (`snapshot-types.ts:139-165`)
is exactly the 25 `WIDGET_META` keys, and `src/features/widgets/cards/card-registry.test.tsx:13-14`
asserts set equality in both directions.

| Symbol in `src/features/home/`                                   | External importer                                   | Line                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `WIDGET_META`                                                    | `src/features/widgets/widget-config-screen.tsx`     | `:11`, used `:33,37,41,135,153`                                                       |
| `WIDGET_META`                                                    | `src/features/widgets/cards/card-registry.test.tsx` | `:3`, `:13,14,21`                                                                     |
| `WIDGET_META`                                                    | `src/features/notifications/registry.test.ts`       | `:9`, `:48-57` — derives the reminder catalogue order from `meta.tier`/`meta.toolKey` |
| `WIDGET_META`                                                    | `test/seed-widget-layouts.test.ts`                  | `:4`                                                                                  |
| `WIDGET_META`, `isImplemented`, `tintClasses`, `useWidgetToggle` | `src/components/app/add-to-home-button.tsx`         | `:12-14`                                                                              |
| `tintClasses` (`widget-tint.ts`)                                 | `src/features/widgets/widget-config-screen.tsx`     | `:12`                                                                                 |
| `useProgramWidgetTaskStatus` (`program-widget-status.ts`)        | `src/features/widgets/use-widget-snapshot-sync.ts`  | `:31`, `:71`, `:78`                                                                   |
| `useWidgetPreferences` (`queries.ts`)                            | `src/features/routines/routines-home-screen.tsx`    | `:27`, `:59`                                                                          |
| `useWidgetPreferences` (`queries.ts`)                            | `src/features/routines/starter-offer-card.tsx`      | `:17`, `:93`                                                                          |

**Consequence:** `WIDGET_META`, `widget-tint.ts` and `program-widget-status.ts` cannot be deleted
with Home. Either they stay where they are, or they move under `src/features/widgets/` — but a
deletion is not on the table without also rewriting the launcher.

### 2.2 `AddToHomeButton` — 7 call sites, none of them Home

| Call site                                    | Line          | Prop                                               |
| -------------------------------------------- | ------------- | -------------------------------------------------- |
| `app/(app)/modules/cbt/activities/index.tsx` | `:21`, `:59`  | `widgetId="cbt-activities"`                        |
| `app/(app)/modules/cbt/beliefs/index.tsx`    | `:19`, `:38`  | `widgetId="cbt-beliefs"`                           |
| `app/(app)/modules/cbt/exposure/index.tsx`   | `:19`, `:38`  | `widgetId="cbt-exposure"`                          |
| `app/(app)/modules/cbt/goals/index.tsx`      | `:23`, `:87`  | `widgetId="cbt-goals"`                             |
| `app/(app)/modules/cbt/new.tsx`              | `:14`, `:189` | `widgetId="cbt-open-record"`                       |
| `app/(app)/modules/cbt/worry/index.tsx`      | `:24`, `:58`  | `widgetId="cbt-worry"`                             |
| `src/components/app/module-home-header.tsx`  | `:6`, `:128`  | `category={addWidgetCategory}` — every module home |

Four unit-test files mock it away (`src/features/breathing/breathing-screen.test.tsx:44`,
`grounding/grounding-home-screen.test.tsx:33`, `journal/journal-list-screen.test.tsx:25`,
`meditation/meditation-home-screen.test.tsx:63`) and one deliberately does **not**
(`habits/habits-home-screen.test.tsx:21-27` renders the real chain). Those five have to be revisited.

### 2.3 Hooks Home stops calling — which are safe to delete and which are not

Scanned every hook imported by `tool-row-stats.tsx:11-42` and `right-now-tier.tsx:12-15` for
non-Home, non-test consumers across `src/` + `app/`.

**☠️ DO NOT DELETE — a live consumer outside Home**

| Hook                                | Non-Home consumers                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useMoodLogCount`                   | `src/features/mood/mood-tracker-screen.tsx`, `src/features/tools/tools-screen.tsx`                                                                                                                                 |
| `useMoodWeek`                       | `src/features/mood/mood-tracker-screen.tsx`                                                                                                                                                                        |
| `useMoodLogs`                       | `app/(app)/modules/cbt/weekly-review.tsx`, `mood/mood-detail-screen.tsx`, `mood/mood-entry-editor-screen.tsx`, `recovery/use-recovery-sources.ts`, `tools/tools-screen.tsx`, `widgets/use-widget-snapshot-sync.ts` |
| `useJournalEntryCount`              | `journal/journal-list-screen.tsx`, `tools/tools-screen.tsx`, `widgets/use-widget-snapshot-sync.ts`                                                                                                                 |
| `useJournalWordTotal`               | `journal/journal-list-screen.tsx`, `widgets/use-widget-snapshot-sync.ts`                                                                                                                                           |
| `useGratitudeEntryCount`            | `gratitude/gratitude-home-screen.tsx`, `tools/tools-screen.tsx`, `widgets/use-widget-snapshot-sync.ts`                                                                                                             |
| `useGratitudeEntryCountSinceDayKey` | `gratitude/gratitude-home-screen.tsx`                                                                                                                                                                              |
| `useBreathingSessionCount`          | `app/(app)/tools/breathing/index.tsx`, `tools/tools-screen.tsx`                                                                                                                                                    |
| `useBreathingTotalMinutes`          | `app/(app)/tools/breathing/index.tsx`                                                                                                                                                                              |
| `useGroundingSessionCount`          | `grounding/grounding-home-screen.tsx`, `tools/tools-screen.tsx`                                                                                                                                                    |
| `useGroundingSessions`              | `grounding/grounding-home-screen.tsx`, `widgets/use-widget-snapshot-sync.ts`                                                                                                                                       |
| `useMeditationMedianMinutes`        | `meditation/meditation-home-screen.tsx`                                                                                                                                                                            |
| `useMeditationSessionCount`         | `meditation/meditation-home-screen.tsx`, `tools/tools-screen.tsx`                                                                                                                                                  |
| `useSleepStats`                     | `sleep/sleep-tracker-screen.tsx`                                                                                                                                                                                   |
| `useSleepLogs`                      | `cbt/use-cbt-insights.ts`, `routines/use-routine-tool-records.ts`, `sleep/sleep-detail-screen.tsx`, `sleep/sleep-log-screen.tsx`, `sleep/sleep-tracker-screen.tsx`, `widgets/use-widget-snapshot-sync.ts`          |
| `useHabits`                         | `habits/habit-editor-screen.tsx`, `habits/habits-history-screen.tsx`, `habits/habits-home-screen.tsx`, `tools/tools-screen.tsx`                                                                                    |
| `useHabitLogs`                      | `habits/habit-detail-screen.tsx`, `habits/habit-log-note-screen.tsx`, `habits/habits-home-screen.tsx`, `routines/use-routine-tool-records.ts`                                                                      |
| `useRoutinesToday`                  | `src/components/app/routine-fab.tsx`                                                                                                                                                                               |
| `useThoughtRecordCount`             | `cbt/cbt-home-screen.tsx`                                                                                                                                                                                          |
| `useCommittedActionCount`           | `act/act-home-screen.tsx`                                                                                                                                                                                          |

**⚠️ Home is the only caller — these genuinely orphan (but only if the 15 exercise rows go)**

`useLatestThoughtRecordAt` (`src/features/cbt/queries.ts`), `useLatestSelfCareLogAt`
(`self-care/queries.ts`), `useLatestWorryEntryAt` (`worry/queries.ts`), `useLatestCoreBeliefAt`
(`beliefs/queries.ts`), `useLatestCompletedActivityAt` (`activities/queries.ts`),
`useLatestExposureSessionAt` (`exposure/queries.ts`), `useActiveGoalCount` (`goals/queries.ts`),
`useLatestConnectionLogAt` (`act/queries/connection.ts`), `useLatestObservingSelfSessionAt`
(`act/queries/observing-self.ts`), `useLatestChoicePointAt` (`act/queries/choice-points.ts`),
`useLatestDefusionLogAt` (`act/queries/defusion.ts`), `useLatestExpansionLogAt`
(`act/queries/expansion.ts`) — **12 hooks**, each defined in its feature's `queries.ts` and consumed
only by `tool-row-stats.tsx`. Map #6 books "replacing the exercise shortcuts on the module screens"
as its own ticket; if that ticket wants per-exercise recency, these are the hooks it should reuse
rather than rebuild.

**Other Home-only symbols that survive because something else uses them:** `seedMoodScore`
(`right-now-tier.tsx:18`) is also called by `mood/mood-tracker-screen.tsx:715`; `MoodScale`
(`right-now-tier.tsx:7`) has 3 other call sites.

---

## 3. i18n: exactly which keys orphan

Method: for every leaf key under the affected blocks, search all non-test `.ts`/`.tsx` under `src/`
and `app/` **excluding `widget-registry.tsx` itself** for the literal `"<key>"` or `"navigation:<key>"`,
then separately check whether it is reached indirectly through `WIDGET_META.titleKey`/`descriptionKey`.
Plural suffixes (`_one`/`_other`) are folded to their base for the search.

**en/bg parity holds on every block below** (identical leaf lists, same order) — so every count is
per-locale and doubles across `src/i18n/locales/en/navigation.json` and
`src/i18n/locales/bg/navigation.json` (and `…/routines.json`).

### 3.1 `home.widgets.*` — 100 leaves per locale, only 16 orphan

| Bucket                                                                                                                                               | Count/locale | Fate                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendered by `src/features/widgets/snapshot-builder.ts`                                                                                               |           65 | ✅ **KEEP** — Android launcher                                                                                                                                                        |
| `home.widgets.config.*`, rendered by `widget-config-screen.tsx:120-203`                                                                              |           11 | ✅ **KEEP** — launcher config screen                                                                                                                                                  |
| `home.widgets.launcher.signedOutCta`, `snapshot-builder.ts:496`                                                                                      |            1 | ✅ **KEEP**                                                                                                                                                                           |
| `*Programme.title`, built dynamically as ``t(`home.widgets.${module}Programme.title`)`` at `snapshot-builder.ts:438` **and** `program-widget.tsx:75` |            2 | ✅ **KEEP** — the launcher still renders them                                                                                                                                         |
| `.title` reached only through `t(meta.titleKey)` at `widget-config-screen.tsx:153`                                                                   |            4 | ⚠️ **KEEP, but re-home** — `breathingSuggested.title`, `gratitudeLatest.title`, `meditationPick.title`, `habitsToday.title`. They are live _only_ because `WIDGET_META` still exists. |
| Genuinely orphaned                                                                                                                                   |       **16** | ❌ **DELETE**                                                                                                                                                                         |
| Already orphaned today                                                                                                                               |            1 | `home.widgets.journalWeek.countOnDay` — no reference anywhere in `src/`, `app/` or `test/`                                                                                            |

**The 16 that orphan** (each ×2 for `en` + `bg` = 32 keys):

`home.widgets.moodCheckin.desc`, `.breathingSuggested.desc`, `.gratitudeLatest.desc`,
`.meditationPick.desc`, `.habitsToday.desc`, `.sleepLatest.desc`, `.actDropAnchor.metaDesc`,
`.actObservingSelf.metaDesc`, `.actChoicePoint.metaDesc`, `.actCommittedActions.metaDesc`,
`.actDefusion.metaDesc`, `.actAcceptancePrompt.metaDesc`, `.journalWeek.metaDesc`,
`.groundingLog.metaDesc`, `.cbtProgramme.metaDesc`, `.actProgramme.metaDesc`.

All 16 are the `descriptionKey` half of a `WIDGET_META` row whose `titleKey` the launcher still
renders. The two `*Programme.metaDesc` keys are rendered only by
`src/features/home/widgets/program-widget.tsx:74`, which dies.

☠️ **`WidgetMeta.descriptionKey` is already dead as a property.** It is declared
(`widget-registry.tsx:18`) and populated on all 25 rows, but `t(meta.descriptionKey)` has **zero call
sites** anywhere in `src/` or `app/` — verified by `grep -rn "descriptionKey" src app`, whose only
other hits are `modules-screen.tsx`'s unrelated field of the same name. The 16 keys above are
"orphaned" only in the sense that nothing else happens to name their literal; the field that was
supposed to render them stopped being read some time ago and no guard noticed.

The 16 orphans with their shipped copy, so the deletion can be reviewed rather than trusted:

| Key (`home.widgets.…`)         | en                                                         | bg                                                      |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------- |
| `moodCheckin.desc`             | A quick five-face mood check-in.                           | Бърза проверка на настроението с пет лица.              |
| `breathingSuggested.desc`      | Start a breathing exercise and see your latest session.    | Започни дихателно упражнение и виж последната си сесия. |
| `gratitudeLatest.desc`         | Your gratitude totals and a quick add.                     | Общите ти бройки за благодарност и бърз запис.          |
| `meditationPick.desc`          | A short sit chosen for the time of day.                    | Кратка сесия, избрана за часа на деня.                  |
| `habitsToday.desc`             | Your habits with this week's progress.                     | Твоите навици с напредъка за тази седмица.              |
| `sleepLatest.desc`             | Your sleep at a glance.                                    | Сънят ти с един поглед.                                 |
| `actDropAnchor.metaDesc`       | Steady yourself when you're hooked.                        | Стабилизирай се, когато си закачен.                     |
| `actObservingSelf.metaDesc`    | Step back and notice.                                      | Отдръпни се и забележи.                                 |
| `actChoicePoint.metaDesc`      | Map what's pulling you.                                    | Разгледай какво те дърпа.                               |
| `actCommittedActions.metaDesc` | Your active values-based actions.                          | Твоите активни ангажименти според ценностите.           |
| `actDefusion.metaDesc`         | Unhook from sticky thoughts.                               | Освободи се от натрапчивите мисли.                      |
| `actAcceptancePrompt.metaDesc` | A willingness prompt for hard feelings.                    | Подкана за приемане на трудни чувства.                  |
| `journalWeek.metaDesc`         | Your journaling stats and a quick way to write             | Статистика за дневника и бърз начин да пишеш            |
| `groundingLog.metaDesc`        | Your recent grounding practice.                            | Скорошната ти практика за заземяване.                   |
| `cbtProgramme.metaDesc`        | A guided path through the CBT module, one phase at a time. | Насочен път през модула КПТ, фаза по фаза.              |
| `actProgramme.metaDesc`        | A guided path through the ACT module, one phase at a time. | Насочен път през модула ACT, фаза по фаза.              |

(Already dead: `journalWeek.countOnDay` — en `{{count}} on {{date}}` / bg `{{count}} на {{date}}`;
the launcher uses `today.dashboard.countToday` instead at `snapshot-builder.ts:314`.)

### 3.2 Every other affected block

| Block                                                                                                                            | Leaves/locale |    Orphaned | Detail                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------: | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.tiers.*`                                                                                                                   |             2 |       **2** | `tools` (`"Your tools"`) and `programmes` (`"Guided programmes"`). Rendered at `today-screen.tsx:249,424` and `arrange-screen.tsx:441,488`. `tools` is presumably _replaced_ by a `Favourites` key rather than simply deleted.                                                                                                              |
| `home.arrange.*`                                                                                                                 |            12 |      **12** | All of it: `hint`, `handle`, `handleHint`, `addHeading`, `addChip`, `addChipTagged`, `addCategory.{tools,cbt,act}`, `moduleTag.{cbtA11y,actA11y}`, `allAdded`. Sole consumers `arrange-screen.tsx` and `arrange-chip-copy.ts`.                                                                                                              |
| `home.rightNow.*`                                                                                                                |             6 |       **6** | `heading`, `moodTitle`, `sleepTitle`, `sleepNothing`, `sleepNothingWithAverage`, `habitsTitle`. Sole consumer `right-now-tier.tsx:152-201`.                                                                                                                                                                                                 |
| `home.programme.*`                                                                                                               |             2 |       **2** | `phase`, `complete`. Sole consumer `widgets/program-widget.tsx:64,66`.                                                                                                                                                                                                                                                                      |
| `home.doneLabel` / `arrangeLabel` / `addToolLabel`                                                                               |             3 |       **3** | `doneLabel` → `arrange-screen.tsx:386,387`. `arrangeLabel` → `arrange-screen.tsx:367` + `today-screen.tsx:273`. `addToolLabel` → `today-screen.tsx:281`.                                                                                                                                                                                    |
| `home.addToHome.*`                                                                                                               |             2 |       **2** | `button`, `title` — `add-to-home-button.tsx:54,63`. Dies with §2.2.                                                                                                                                                                                                                                                                         |
| `home.rows.*`                                                                                                                    |            24 | **0 or 24** | ⚠️ Conditional. Sole consumer `tool-row-stats.tsx`. Survives iff Home's stat grammar is the one that migrates onto the shared card; orphans entirely if `/tools`' `tools.stats.*` wins. See §7.                                                                                                                                             |
| `home.programWidget.*`                                                                                                           |             8 |       **0** | ✅ All 8 rendered by `snapshot-builder.ts:443-458`.                                                                                                                                                                                                                                                                                         |
| `home.categories.*`                                                                                                              |             9 |   **0 new** | `routines` is live (`snapshot-builder.ts:490`). The other **8 are already orphaned today** — no reference anywhere.                                                                                                                                                                                                                         |
| `today.emptyTitle`, `emptyDescription`, `unsupportedTitle`, `unsupportedDescription`, `addManually`, `getSuggestions`, `logMood` |             7 |       **7** | All from `today-screen.tsx:354-399`. `emptyTitle`/`emptyDescription` may be replaced by map #12's "one quiet line".                                                                                                                                                                                                                         |
| `today.dashboard.*`                                                                                                              |            18 |       **4** | ⚠️ Only `removeWidget`, `undo`, `moveEarlier`, `moveLater` (`arrange-screen.tsx:89,90,122,373,384`) orphan. **The other 14 belong to the Android launcher** (`snapshot-builder.ts`). `today.dashboard.done` is already orphaned today.                                                                                                      |
| `today.eyebrow`, `greeting*`                                                                                                     |             6 |       **0** | Map #15 keeps the greeting block.                                                                                                                                                                                                                                                                                                           |
| `homeTour.edit.description` / `.dismiss`                                                                                         |             2 |       **2** | ⚠️ Built dynamically at `home-tour.tsx:135-136` (``t(`homeTour.${current.i18nKey}.description`)``), so a literal grep finds **zero** references to any `homeTour.*.{description,dismiss}` key. `homeTour.skipAll` (`:137`) is the only literal.                                                                                             |
| `routines:widget.*`                                                                                                              |             9 |   **0 new** | ⚠️ `metaTitle` and `metaDesc` are rendered by `snapshot-builder.ts:489,491` and named by `widget-registry.tsx:335-336`. **The other 7** (`title`, `progress`, `routineProgress`, `allDone`, `emptyBody`, `emptyCta`, `open`) **are already orphaned today** — the routines dashboard card was deleted in #975 and its copy was left behind. |

### 3.3 Totals

|                                                                     | Per locale | en + bg |
| ------------------------------------------------------------------- | ---------: | ------: |
| Newly orphaned, unconditional                                       |     **56** | **112** |
| Newly orphaned if `home.rows.*` also goes                           |         80 |     160 |
| **Already orphaned today** (pre-existing, unrelated to this change) |     **17** |  **34** |

The 17 pre-existing orphans are the empirical proof of §4.1's second trap: `home.categories.*` ×8,
`routines:widget.*` ×7, `home.widgets.journalWeek.countOnDay`, `today.dashboard.done`. Every one of
them resolves in `en` and `bg`, passes locale parity, and is rendered by nothing.

---

## 4. Tests — the important half

### 4.1 The two guards, and why neither catches an orphan

**`test/i18n-key-coverage.test.ts` is static _and_ namespace-inferring, and the inference has a hole.**

The guard walks `app/` + `src/`, extracts literal `t("…")` calls, and resolves each against the `en`
locale (`:54-106`). For a bare key (no `ns:` prefix, no `{ ns: … }` option) it infers the namespace
from `useTranslation("…")` matches **in the same file** (`:63-65`) and then:

```ts
// test/i18n-key-coverage.test.ts:98
if (fileNamespaces.length === 0) continue;
```

`src/features/widgets/snapshot-builder.ts` has **zero** `useTranslation(` calls — it receives `t` as a
`Translate` function parameter (`snapshot-types.ts`, used at `snapshot-builder.ts:25` and throughout).
Every one of its **65 `home.widgets.*` + 14 `today.dashboard.*` + 8 `home.programWidget.*` +
`home.categories.routines` + `routines:widget.*`** bare-key calls is therefore **skipped**.

☠️☠️ **Net effect: delete `home.widgets.*` as the ticket scopes it and the Android launcher renders
raw key paths (`"home.widgets.moodCheckin.title"`) to users, with `verify` green.**
`src/features/widgets/snapshot-builder.test.ts:18` stubs `t` as `(k) => k`, so the unit test asserts
only that the builder _emits_ the key string, never that it resolves.

And in the other direction the guard is blind by construction: it walks call sites looking for keys,
never keys looking for call sites, so **an orphaned key fails nothing**. The 17 already-orphaned keys
in §3.3 are the standing proof.

**`src/i18n/locale-parity.test.ts`** (`:28-56`) diffs `en` against `bg` per namespace file. It catches
a one-sided deletion and nothing else. It is not an orphan detector.

**`src/features/habits/anti-streak-copy.test.ts`** (`:51-54`) imports `en/habits.json` and
`bg/habits.json` directly and is namespace-scoped to `habits`. **Unaffected** — its corpus does not
shrink, because none of the dying keys live in `habits.json`.

**Repo-wide copy guards whose corpus does shrink** — all read `test/locale-strings.ts:38-48`, which
`readdirSync`s every `*.json` in each locale directory:

| Guard                                         | Corpus                                                                                                         | Effect                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/positioning-copy.test.ts:64-163`        | all namespaces ×2 locales + `public/manifest.webmanifest` + `public/index.html` + `AGENTS.md` + `docs/**/*.md` | Shrinks by ~56 strings out of thousands. Its positive controls (`:713-745`) assert `≥20` namespaces and `≥20` docs; `navigation.json` still exists, just thinner. **Not weakened meaningfully.** |
| `test/restraint-copy.test.ts:202-233`         | all namespaces ×2 locales; control at `:215-223` asserts `≥20` namespaces                                      | Same. **Not weakened.**                                                                                                                                                                          |
| `test/practice-copy.test.ts:80-86`            | all namespaces ×2 locales                                                                                      | Same.                                                                                                                                                                                            |
| `test/child-safety-copy.test.ts:215-220`      | all namespaces, per-rule scoping                                                                               | Same.                                                                                                                                                                                            |
| `test/show-all-door-copy.test.ts:37-39,55-74` | key-pattern filtered (`showAll*`/`viewAll*`/`seeAll`)                                                          | **No effect** — no door key is in the deleted set.                                                                                                                                               |
| `test/no-unshipped-status-copy.test.ts:36-64` | `navigation.json`'s `sidebar` / `modulesPage` / `today.modules` roots + all of `modules.json`                  | **No effect** — none of the deleted keys sit under those roots.                                                                                                                                  |
| `test/over-use-copy.test.ts:48-67`            | `cbt` namespace `learn.pacing.*` + one `policies` FAQ                                                          | **No effect.**                                                                                                                                                                                   |
| `scripts/weblate-create-components.js:63-68`  | locale **filenames** only                                                                                      | **No effect** — no namespace file disappears.                                                                                                                                                    |

None of these read keys; they all pattern-match string _values_. Not one of them would notice an
orphan.

**No consent-digest, reading-level or copy-tone guard exists.** `test/child-safety-copy.test.ts:25-30`
records that reading-level checking was deliberately excluded.

**Guards that _will_ bite loudly (good):**

- `test/module-identity-neutral.test.ts` — `IDENTITY_SURFACES` (`:131-141`) names `widget-tint.ts`,
  `widgets/widget-card-header.tsx`, `tool-row.tsx`, `tool-row-stats.tsx`, `widgets/program-widget.tsx`
  and `readFileSync`s each (`:290`). Deleting any of them throws `ENOENT`. Each must be **moved to
  `RETIRED`** (`:172-239`), which asserts the opposite — that the file does _not_ exist.
- `src/features/widgets/cards/card-registry.test.tsx:13-14` — `Object.keys(CARD_REPLICAS).sort()`
  must equal `Object.keys(WIDGET_META).sort()`, both directions. Removing an id from `WIDGET_META`
  fails immediately.
- `src/features/notifications/registry.test.ts:45-57` — derives the ten reminder targets' order from
  `WIDGET_META` and asserts `NOTIFICATION_TARGETS` matches. Same.
- `npm run verify` includes `coverage:ratchet` (`package.json`). Deleting ≈3,000 covered lines and
  their ≈2,300 lines of tests moves the four Istanbul totals; `scripts/check-coverage-ratchet.js:12-29`
  fails on any metric dropping more than 0.5pp below `coverage/baseline.json`. Budget a
  `coverage:ratchet:update` in the same change.
- 8 e2e specs use `getByRole("heading", { name: "Your tools", level: 2 })` as their signed-in landmark:
  `test/e2e/auth-injection.e2e.test.ts:9`, `guest-chrome.e2e.test.ts:29`,
  `guest-conversion.e2e.test.ts:66`, `guest-signin-abandon.e2e.test.ts:96,128`,
  `panel-navigation.e2e.test.ts:27,41,63`, `home-widgets.e2e.test.ts:100,117,198,221,239`,
  and `sign-up-onboarding.e2e.test.ts`. These are **positive** assertions and fail loudly on the
  rename. ⚠️ `level: 2` matters — a level-less `Text variant="h2"` renders `<h1>` on RNW.
- `.maestro/app-store-screenshots.yaml:139` waits on `id: "home-layout"` for 90 s, and
  `test/e2e/settings-account.e2e.test.ts` scopes to it. **Keep the `home-layout` testID**
  (`today-screen.tsx:296`).

### 4.2 ☠️☠️ Assertions that will keep passing while asserting nothing

The rule: `queryByText("X").toBeNull()` / `.toHaveCount(0)` starts passing **unconditionally** once
`"X"` no longer exists anywhere in the app. Below, "vacuous" means the test file **survives** while
its subject string does not. Assertions inside files that are themselves deleted are listed
separately and are not a hazard.

#### Already vacuous today — proof the trap is live in this repo

| File:line                                                                                   | Assertion                                                                                   | Why it is already meaningless                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/home/today-screen.test.tsx:315`                                               | `expect(screen.queryByText("Drag to rearrange")).toBeNull()`                                | ☠️ `"Drag to rearrange"` exists **nowhere** in `src/`, `app/` or any locale file. The shipped arrange hint is `home.arrange.hint` = _"Drag to reorder, or remove what you don't check in with."_ This assertion has been passing for free since the copy changed. |
| `test/e2e/home-widgets.e2e.test.ts:229`                                                     | `await expect(page.getByText("Drag to rearrange")).toHaveCount(0)`                          | Same string, same reason.                                                                                                                                                                                                                                         |
| `test/e2e/home-widgets.e2e.test.ts:125`                                                     | `expect(page.getByPlaceholder("Search widgets...")).toHaveCount(0)`                         | `"Search widgets..."` exists nowhere.                                                                                                                                                                                                                             |
| `test/e2e/home-widgets.e2e.test.ts:113` and `src/features/home/arrange-screen.test.tsx:809` | `getByText(/stays in Tools/i).toHaveCount(0)` / `queryByText(/stays in Tools/i).toBeNull()` | The copy _"Nothing is deleted - it stays in Tools"_ was never shipped — `arrange-screen.tsx:395` records the decision not to. Both assertions have never been able to fail.                                                                                       |

#### Will go vacuous when this change lands — in files that survive

| File:line                                                                       | Assertion                                                                                                                                                               | Verdict                                      | Reason                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/tours/home-tour.test.tsx:86-87`                                   | `queryByText("Arrange your home screen - add, remove and reorder your tools.").toBeNull()` in _"renders nothing until app onboarding is complete"_                      | ☠️ **VACUOUS**                               | The test registers `home-edit` (`:81`) and asserts the edit copy is absent. Delete `homeTour.edit.*` and the assertion passes with the gate removed. **Re-point at `home-navigation` / `"Find all Modules and Tools here."`**                   |
| `src/features/tours/home-tour.test.tsx:111-112`                                 | Same string, in _"does not show Home tips while another route covers Home"_                                                                                             | ☠️ **VACUOUS**                               | This is the **pathname gate's only coverage**. It registers `home-edit` at `:105` and asserts the edit copy absent at `/settings`. After the delete it proves nothing about the pathname gate at all.                                           |
| `src/features/tours/home-tour.test.tsx:132-133`                                 | Same string, in _"skips an unregistered home-edit without marking it shown"_                                                                                            | ☠️ **DELETE the whole test**                 | Its entire subject (the edit stop's skip-without-marking semantics, docstring `:114-119`) ceases to exist. Its `mutateAsync` assertion (`:139`) also degenerates — with one stop left, `["home:navigation"]` is the only possible value.        |
| `src/features/tours/home-tour.test.tsx:143-151`                                 | _"skips stops with no registered target (desktop: no hamburger)"_ — `setupPreferencesMock(true, ["home:edit"])`                                                         | ⚠️ **Weakened, not vacuous**                 | The `["home:edit"]` seed becomes a reference to a stop that no longer exists; the assertions themselves stay meaningful.                                                                                                                        |
| `src/features/tours/home-tour.test.tsx:154+`                                    | _"dismiss stores the stop key; **skip-all stores both home keys**"_                                                                                                     | ☠️ **Loses its subject**                     | With one stop, `onDismissAll` (`home-tour.tsx:140`) is byte-identical in effect to `onDismiss` (`:139`). Skip-all keeps passing while covering nothing. Decide whether `Skip all tips` still renders.                                           |
| `test/e2e/button-tours.e2e.test.ts:194-197`                                     | `getByText(/Arrange your home screen - add, remove and reorder your tools\./i).toHaveCount(0)` in _"skips the edit tip on an empty dashboard without marking it shown"_ | ☠️ **VACUOUS**                               | The single most load-bearing negative assertion in the suite: it is the proof that skipping ≠ dismissing. Once the copy is gone it passes for a reason unrelated to the behaviour under test.                                                   |
| `test/e2e/button-tours.e2e.test.ts:205-217`, `:219-232`                         | The two positive `toBeVisible()` assertions on the same string                                                                                                          | ✅ **Fails loudly**                          | Good — they force the author to confront the suite.                                                                                                                                                                                             |
| `test/e2e/button-tours.e2e.test.ts:236-240`                                     | _"If the removed 'dates' stop still existed, it would show now… Asserting nothing shows proves it's gone"_                                                              | ⚠️ **Already vacuous by the same mechanism** | Recorded as precedent: the repo has done this before.                                                                                                                                                                                           |
| `src/features/home/today-screen.test.tsx:307-315`                               | _"renders no arrange-mode controls - no Done, no Undo, no per-row remove"_                                                                                              | ☠️ **Delete with the feature**               | Its own docstring (`:304-308`) names the trap and defends the choice — but once arrange mode is gone entirely (not merely moved to a route) all four lines pass for free. One of them (`:315`) already does.                                    |
| `src/features/home/today-screen.test.tsx:338-339`, `:356-357`, `:391`           | `queryByRole("button", { name: "Arrange" \| "Add tool" }).toBeNull()`                                                                                                   | ☠️ **VACUOUS after the delete**              | `home.arrangeLabel` and `home.addToolLabel` are deleted, so these can never fail. Their paired positives (`:345-346`, `:398-399`) die with the header actions, leaving only the vacuous half if the file is pruned rather than rewritten.       |
| `src/features/home/today-screen.test.tsx:437-438`, `:454-455`, `:565-566`       | `queryByRole("button", { name: /get suggestions/i \| /log your mood/i }).toBeNull()`                                                                                    | ☠️ **VACUOUS after the delete**              | `today.getSuggestions` and `today.logMood` are deleted.                                                                                                                                                                                         |
| `src/features/home/today-screen.test.tsx:470`, `:548`                           | `queryByText(/add tools you want to check in( with each day)?/i).toBeNull()`                                                                                            | ☠️ **VACUOUS after the delete**              | `today.emptyDescription` is deleted / replaced by map #12's one quiet line.                                                                                                                                                                     |
| `src/features/home/today-screen.test.tsx:479`, `:489`                           | `queryByText(/needs a newer version/i).toBeNull()`                                                                                                                      | ☠️ **VACUOUS after the delete**              | `today.unsupportedTitle`/`unsupportedDescription` are deleted — the whole "unsupported build" state exists only because `isImplemented` filters unknown widget ids (`widget-tiers.ts:47`).                                                      |
| `src/features/home/today-screen.test.tsx:643`                                   | `queryByText("Guided programmes").toBeNull()`                                                                                                                           | ☠️ **VACUOUS after the delete**              | `home.tiers.programmes` is deleted.                                                                                                                                                                                                             |
| `src/features/home/today-screen.test.tsx:410`                                   | `expect(getTourTarget("home-edit")).toBeNull()`                                                                                                                         | ⚠️ **Half-vacuous**                          | Paired with `:414` `not.toBeNull()`, which **fails loudly** once nothing registers `home-edit`. The pair is safe; the `:410` half alone would not be.                                                                                           |
| `src/features/home/today-screen.test.tsx:613`, `:667`                           | `queryByTestId("tool-row-cbt-programme" \| "widget-cbt-programme").toBeNull()`                                                                                          | ☠️ **VACUOUS after the delete**              | Both testIDs stop being emitted anywhere.                                                                                                                                                                                                       |
| `src/components/app/app-onboarding-wizard.test.tsx:137,139,151,249,263,274,293` | `queryByText("What brings you here?" \| "How much structure would you like?" \| "Your Home suggestions").toBeNull()`                                                    | ☠️ **VACUOUS after the gutting**             | Map #17 deletes the `concerns`/`modules`/`guidance` panels. Every panel-order assertion in this 439-line file is built on strings that stop existing. The paired positives (e.g. `:95`) fail loudly, which is the only thing forcing a rewrite. |

#### Negative assertions in files that are themselves deleted — no hazard, listed for completeness

`src/features/home/arrange-screen.test.tsx:177,184,185,220,233,484,485,493,518,519,520,523,533,534,548,575,809,815`;
`src/features/home/right-now-tier.test.tsx:118,119,129,130,137,149,159,169,191`;
`test/e2e/home-widgets.e2e.test.ts:113,125,172,194,207,227-229,244`.

#### The idiom this repo already uses to avoid the trap — copy it

`src/features/home/today-screen.test.tsx:261-272` states the "no third line in the greeting" rule as a
**count**, not an absence:

```ts
expect(screen.getByTestId("home-greeting").children).toHaveLength(2);
```

with the docstring: _"The obvious form — `queryByTestId("dashboard-sub")).toBeNull()` — passes forever
the moment the node it names stops existing."_ The same shape (`children` length, or
`queryAllByRole("heading")` equality against an explicit list) is what the Favourites/Tools/Modules
section structure should be asserted with, since the redesign stacks three headed sections.

### 4.3 Test files deleted outright

| File                                                                                           | Lines |
| ---------------------------------------------------------------------------------------------- | ----: |
| `src/features/home/arrange-screen.test.tsx`                                                    |   817 |
| `src/features/home/widget-registry.test.tsx` (reduced, not deleted — launcher assertions stay) |   656 |
| `src/features/home/right-now-tier.test.tsx`                                                    |   236 |
| `src/features/home/widget-repository.test.ts`                                                  |   258 |
| `test/e2e/home-widgets.e2e.test.ts`                                                            |   246 |
| `test/seed-widget-layouts.test.ts`                                                             |   215 |
| `src/features/home/widgets/program-widget.test.tsx`                                            |   206 |
| `src/features/onboarding/queries.test.ts` (reduced)                                            |   109 |
| `src/features/onboarding/recommendations.test.ts`                                              |    92 |
| `src/features/home/arrange-row.test.tsx`                                                       |    83 |
| `src/features/onboarding/repository.test.ts` (reduced)                                         |    40 |
| `src/features/onboarding/concerns.test.ts`                                                     |    37 |
| `src/features/home/widgets/widget-card-header.test.tsx`                                        |    15 |

`arrange-chip-copy.ts`, `widget-tiers.ts` and `use-widget-toggle.ts` have **no test file of their own** —
they are covered only through `arrange-screen.test.tsx` and `widget-registry.test.tsx`, so their
coverage leaves with those files and nothing dangles.

---

## 5. SQL and migrations that become dead

Inventory only — the migration itself is [#1889](https://github.com/Selftend/selftend/issues/1889).

### 5.1 `widget_preferences`

| Migration                                                                                              | Role                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260539_widget_preferences.sql:1-16`                                             | `CREATE TABLE`, RLS policy _"Users manage their own widget preferences"_, index `widget_preferences_user_position`    |
| `20260564_rls_scope_to_authenticated.sql:21`                                                           | `ALTER POLICY … TO authenticated`                                                                                     |
| `20260667_audit_rls_initplan.sql:134`                                                                  | `ALTER POLICY … USING (((select auth.uid()) = user_id))`                                                              |
| `20260813000000_collapse_legacy_widget_ids.sql`                                                        | data-only DML collapsing 3 legacy ids                                                                                 |
| `20260813010000_widget_order_functions.sql:85-196`                                                     | `add_widget_preference(text)`, `set_widget_order(text[])`, grants                                                     |
| `20260815000000_widget_position_healing.sql:83-350`                                                    | `widget_order_lock_key(uuid)`, `normalize_widget_positions()`, re-declares the three writers                          |
| `20260707_apply_widget_recommendations.sql` → `20260815000000` → `20260901000000` → `20260901010000`   | four successive declarations of `apply_widget_recommendations`                                                        |
| `20260568_export_user_data_act_plan_widget.sql:182` … `20260906000000_health_data_consent.sql:862-871` | **26 re-declarations of `export_user_data()`**, every one of which selects `widget_preferences`                       |
| `supabase/README.md:12,53,338-339`                                                                     | table list, export description, the `add_widget_preference`/`set_widget_order`/`normalize_widget_positions` narrative |
| `supabase/seed.sql:271-300`                                                                            | bob's 4 seeded rows                                                                                                   |
| `scripts/seed-demo-data.mjs:317-359,5254-5314`                                                         | demo's 14 seeded rows                                                                                                 |

**Client call sites** (all in `src/features/home/widget-repository.ts`, all reached only through
`src/features/home/queries.ts`): `listWidgetPreferences` `:22-44` (table SELECT),
`addWidgetPreference` `:77` (`rpc("add_widget_preference")`), `deleteWidgetPreference` `:81-89`
(table DELETE), `restoreWidgetPreference` `:98-115` (client-composed), `setWidgetOrder` `:124`
(`rpc("set_widget_order")`). There is **no** `delete_widget_preference` RPC.

⚠️ `widget_preferences` is **not** in `supabase/README.md`'s withheld-table allowlist, so it is part
of `export_user_data()` and covered by the export-completeness gate. It is **not** exercised by
`test/integration/rls.integration.test.ts` (zero matches for "widget" in that file) — **UNVERIFIED**
whether any other RLS test covers it.

### 5.2 `apply_widget_recommendations` — cannot simply die

Current declaration: `supabase/migrations/20260901010000_initial_concerns_grandfathered_guard.sql:55-155`.
Signature `(p_widget_ids text[], p_selected_concerns text[] default null, p_completion_mode text default null) returns void, security invoker`.

Beyond the widget delete-and-reinsert (`:88-97`) it upserts **six `user_preferences` columns**
(`:99-155`): `widgets_seeded`, `selected_concerns`, `initial_concerns` (write-once, guarded),
`app_onboarding_completed`, `app_onboarding_completed_via`, `app_onboarding_completed_at`.

| Consumer                     | Site                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `applyWidgetRecommendations` | `src/features/onboarding/repository.ts:16` — the only `rpc(...)` call                                |
| `useCompleteAppOnboarding`   | `src/features/onboarding/queries.ts:27-36`                                                           |
| First-run gate               | `src/components/app/protected-layout.tsx:26,46,236` — **the app's only onboarding-completion write** |
| `useApplyWidgetSuggestions`  | `src/features/onboarding/queries.ts:46-55` → `today-screen.tsx:25,155` (dies)                        |

No edge function references it (`supabase/functions/` has zero matches for `widget` or `concern`).

### 5.3 `selected_concerns` and `initial_concerns`

`public.user_preferences.selected_concerns text[]`, created
`supabase/migrations/20260514_cbt_phase1.sql:4-6`. `initial_concerns` created
`20260901000000_initial_concerns.sql:26-30`, guard fixed `20260901010000:48-52,137-143`.

Reads/writes: `src/features/settings/repository.ts:85` (row type), `:202` (map), `:340`
(`PREFERENCE_COLUMNS`), `:427-436` (`OnboardingPreferencesPatch` allowlist), `:438-464` (write path);
`src/features/modules/types.ts:123,261`; `src/components/app/protected-layout.tsx:236,274`;
`src/features/home/today-screen.tsx:443`; `src/components/app/app-onboarding-wizard.tsx:31,157`.
Map #17 is right that **every one of those only pre-ticks the wizard's own boxes**.

⚠️ `initial_concerns` is different: it feeds `scripts/analytics-onboarding.sql:94`,
`scripts/analytics-segment.sql:111-162` and `docs/analytics.md:85`. Dropping the write breaks the
#1605 intake segmentation, which is a product decision, not a cleanup.

⚠️ Both columns are inside `export_user_data()`'s `preferences` object
(`20260906000000_health_data_consent.sql:103-104`) and neither is on the withheld allowlist, so
removing a column touches the export function and its completeness gate.

There is **no generated `database.types.ts`** in this repo — row types are hand-written
(`widget-repository.ts:4-10`, `settings/repository.ts:85`).

---

## 6. Docs, scripts and seeds to update

| File                                                        | What it says                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/app-store-review-information.md:71,80,98,171,212`     | "a dashboard the user assembles from **28 widgets**" ×3, plus the widget-picker `Soon` chip note. ⚠️ Already stale — `WIDGET_META` holds **25**. Store-copy drift is `verify`-gated elsewhere; check `test/store-listing-drift.test.ts` before editing. |
| `docs/internal-testing.md:36`                               | "New accounts receive the Home recommendation wizard once after consent… An empty Home offers manual addition and suggestions".                                                                                                                         |
| `docs/analytics.md:79,85`                                   | the wizard's zero-widget finish; `initial_concerns` as the intake record.                                                                                                                                                                               |
| `docs/architecture.md:193`                                  | "Android launcher widgets" section — must not be confused with the dashboard.                                                                                                                                                                           |
| `docs/positioning.md:281`                                   | cites `home.widgets.cbtProgramme.title` as a `programme` spelling site.                                                                                                                                                                                 |
| `docs/security-optimization-audit-2026-06-01.md:57,161,189` | three findings against `today-screen.tsx` / the programme widgets; they resolve themselves.                                                                                                                                                             |
| `CONTEXT.md:69`                                             | "The seeded Home layouts are a fourth such copy, **and the only one that cannot rot** (#1352)" — that guarantee is `test/seed-widget-layouts.test.ts`, which this change deletes.                                                                       |
| `supabase/README.md:12,53,338-339`                          | table list, export description, widget-ordering narrative.                                                                                                                                                                                              |
| `test/tools-policy-origin.test.ts:176`                      | hardcodes the pair `["/", "/arrange"]` as a breadcrumb test case. It is a pure-function test on literals so it will **not fail** when the route goes — a stale reference to clean up, not a gate.                                                       |

---

## 7. Open questions this inventory could not settle

1. **Which stat implementation survives.** `home.rows.*` (24 keys, `tool-row-stats.tsx`) versus
   `navigation:tools.stats.*` (`tools-screen.tsx:122-151`). Different copy, different hooks
   (`useSleepStats` vs `useSleepLogCount`; `useMoodWeek` vs `useMoodLogs(30)`). Map #8 ("one
   component, no variants") and #14 ("the stat line stays") together require a choice that has not
   been made. 24 keys per locale hang on it.
2. **Where `WIDGET_META` lives afterwards.** It cannot be deleted (§2.1). Leaving it under
   `src/features/home/` after Home stops using it is a naming lie; moving it under
   `src/features/widgets/` touches six importers and three tests.
3. **Whether `WidgetCardHeader` was meant to be dead already.** It has no production importer on
   `dev` and is still scanned by `module-identity-neutral.test.ts:133`. **UNVERIFIED** whether that
   is intentional.
4. **DBT.** `/modules` lists three tiles (`modules-screen.tsx:33-55`) and the third is the
   roadmap stub (`docs/app-store-review-information.md:80`). Map #2 says "the 3 modules on
   `/modules`" — favouriting a "Soon" module is unspecified.
5. **`Skip all tips`** with a single remaining tour stop (§1.2).
6. **Whether `AddToHomeButton` gets a replacement.** Six module screens and every module header
   currently offer "add this to Home"; the star lives on tool/module cards, not on exercise screens,
   so those six lose the affordance with nothing standing in for it.
7. **RLS coverage of `widget_preferences`.** **UNVERIFIED** — not present in
   `test/integration/rls.integration.test.ts`.

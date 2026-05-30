# Test Coverage & Strategy — Design

- **Date:** 2026-05-30
- **Status:** Approved design, pending implementation plan
- **Scope:** Comprehensive ("maximize everything"): stand up coverage measurement, then close the major unit, integration, and e2e gaps across the app.

This is a **design / strategy document**, not a task checklist. It describes the target state of the test suite and the rationale behind it. The implementation breakdown lives in the separate implementation plan (task tracking stays out of the repo per `AGENTS.md`).

---

## 1. Context & current state

SelfTend is an Expo + React Native + TypeScript mental-health app on a Supabase backend. It has **no custom HTTP API of its own** — the client talks to Supabase PostgREST + RPC directly, plus two Deno edge functions. "Endpoints," for testing purposes, means: DB tables (RLS contracts), RPC/DB functions, and the two edge functions.

The existing suite is a strong foundation, not a greenfield:

| Layer            | Runner                                                   | Location                                 | Count today |
| ---------------- | -------------------------------------------------------- | ---------------------------------------- | ----------- |
| Unit / component | jest (`jest.config.js`, `jest-expo`)                     | `src/**/*.test.ts(x)`                    | 116 files   |
| Integration      | jest (`jest.integration.config.js`, real local Supabase) | `test/integration/*.integration.test.ts` | 11 files    |
| E2e              | Playwright (web)                                         | `test/e2e/*.e2e.test.ts`                 | 11 files    |

`npm run verify` runs lint + format + typecheck + unit tests. CI (`.github/workflows/ci.yml`) runs `verify`, then `integration` and `e2e` as parallel jobs, each spinning up a local Supabase stack with `supabase db reset`.

**What is already well covered:** nearly every repository and Zod schema has a unit test (mocked PostgREST chains); many pure-logic helpers; 18 core component tests; integration tests for auth, RLS (3 tables centrally), the `export_user_data`/`delete_user_account` DB functions, and the sleep/meditation/plan/cbt/act/profile/settings/habits DB contracts; e2e for sign in/up/out and the _create_ path of journal/sleep/habit/mood/thought-record/meditation/gratitude.

**The verified gaps** (from the gap-inventory workflow, 2026-05-30 — see Appendix A for the full enumeration):

1. **No coverage measurement exists** — no `collectCoverage`, no threshold, no CI report. Coverage is invisible and unguarded.
2. **RLS breadth** — 43 user-owned tables; only 3 covered in `rls.integration.test.ts`, 5 more covered in feature integration files. **35 tables have no cross-user isolation test anywhere**, including `web_push_subscriptions` (its coverage is _falsely implied by a stale header comment_; its only test is single-user CRUD in `settings-repository.integration.test.ts`).
3. **Integration breadth** — 14 features have unit-only (mocked) repositories and no real-DB integration test: activities, anger, beliefs, exposure, goals, gratitude, home/widgets, journal, mindfulness, mood, procrastination, self-care, values, worry.
4. **Edge functions are 100% untested** — `send-feedback` (115 LOC) and `send-web-reminders` (334 LOC), whose real complexity lives in pure functions (`reminderKeyIfDue`, `getZonedParts`, timezone/dedup-key math).
5. **DB functions** — `invoke_send_web_reminders`, `schedule_send_web_reminders_cron`, and the `set_current_timestamp_updated_at` trigger are untested.
6. **Unit holes** — ~9 high-value logic modules, 11 of 14 Zustand stores (mostly factory-backed), and 8 of 25 query hooks with real logic.
7. **E2e** — zero edit/delete/reorder journeys; the entire ACT module, CBT depth (beliefs/goals/exposure/activities/weekly-review), settings (language/theme/notifications/export/deletion), password recovery, and home widget management are uncovered.

---

## 2. Goals & non-goals

**Goals**

- Make coverage **visible and regression-guarded** without incentivizing filler tests.
- Close the highest-value unit gaps (real logic, not boilerplate).
- Give every user-owned table a **cross-user RLS isolation** test and every feature repository a **real-DB integration** test.
- Test the edge functions' deterministic logic in jest and their HTTP contract in integration.
- Extend e2e from create-only to full **edit / delete / reorder** journeys and the major uncovered flows (ACT, CBT depth, settings, GDPR, password reset, widgets), with privacy-critical flows prioritized.

**Non-goals**

- No per-screen render tests. Screen _behavior_ is covered through e2e + unit-tested logic/hooks (explicit decision — see §3).
- No new test runner or Deno toolchain.
- No deep RTL interaction tests duplicating e2e.
- No change to product behavior; tests document current behavior (including any quirks, e.g. the feedback email's lack of HTML-escaping is captured as a guard, not silently fixed here).

---

## 3. Decisions

| Decision               | Choice                                                                                                                                                            | Rationale                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Effort scope           | Maximize everything (comprehensive, multi-phase)                                                                                                                  | User directive.                                                                                                          |
| Coverage enforcement   | **Ratchet baseline** (CI fails only on a drop below the recorded floor)                                                                                           | Avoids arbitrary % targets and filler tests; matches AGENTS.md depth-over-breadth ethos; coverage can only climb.        |
| Screen/component tests | **Behavior via e2e + logic units**; no per-screen render tests                                                                                                    | Highest signal-per-test; avoids brittle RN render duplication.                                                           |
| RLS placement          | Isolation tests live **with each feature's integration test** (existing convention); centralized `rls.integration.test.ts` only for orphan tables + an anon sweep | Verifier confirmed 5 tables already follow this convention; centralizing everything would fight the established pattern. |
| Edge-function harness  | **Extract pure logic to a shared TS module** (jest unit) + thin `supabase functions serve` integration smoke for the HTTP contract                                | Reuses the existing `../../../src/i18n` cross-import; no Deno toolchain; puts deterministic correctness in fast units.   |
| Sequencing             | Layered bottom-up (tooling → units → integration → e2e), risk-first _within_ the integration layer                                                                | Reviewable increments; ratchet climbs monotonically; privacy surfaces protected early.                                   |

---

## 4. Test architecture & conventions

No new runners. The plan formalizes and extends the three existing layers and conforms to their established patterns:

- **Unit repo tests** mock `@/src/lib/supabase`'s `requireSupabase` and assert the PostgREST call chain + row→domain mapping + input trimming (the `src/features/journal/repository.test.ts` shape).
- **Integration tests** sign in as seeded users (`alice`/`bob`/`demo` from `test/integration/helpers.ts`), assert real schema/constraints/ordering/RLS, and clean up in `afterEach` via service-role helpers. Cross-user isolation follows the `sleep-repository.integration.test.ts` shape (another user cannot read; update/delete are no-ops; anon sees nothing).
- **E2e** uses `signInAsViaUi` + `dismissPostSignInModals`, asserts on visible text/roles, cleans up via service-role helpers, and stays serial (`workers: 1`). Detail screens follow a uniform pattern — an Edit button routes to `/[id]/edit`, a Delete button opens `ConfirmDialog` then `router.replace` to the list.
- All user-visible strings referenced in tests come from existing i18n namespaces, never hardcoded copy (AGENTS.md).

---

## 5. Phase 1 — Coverage tooling (foundation)

Establishes the floor the later phases push up. Unit coverage only — integration/e2e need live services and are not counted toward the unit ratchet.

- **`jest.config.js`**: enable `collectCoverage`/`collectCoverageFrom` scoped to `src/**/*.{ts,tsx}`, excluding `*.test.*`, `types.ts`, pure constant-data modules (`design-tokens.ts`, `help-images.ts`, `gratitude/breaks.ts`, `i18n/index.ts`, constant lists), and generated files. Reporters: `text-summary` + `json-summary` (+ `lcov` for local HTML).
- **`package.json`**: add `test:coverage` (`jest --coverage --runInBand`).
- **`coverage/baseline.json`** (committed): per-metric floors for lines / branches / functions / statements, seeded from the first measured run.
- **`scripts/check-coverage-ratchet.js`**: compares fresh `coverage-summary.json` against the baseline; **fails only if any metric falls below floor** (small epsilon, e.g. 0.5%, absorbs flake). A `--update` flag raises the floor after intentional gains.
- **CI (`ci.yml` `verify` job)**: run `test:coverage` then the ratchet check; emit the coverage `text-summary` to the GitHub step summary. The baseline floor is re-recorded (via `--update`, committed by a human) at the end of each phase as coverage rises.

**Acceptance:** CI shows a coverage summary; a deliberately deleted assertion that drops coverage fails the ratchet check locally.

---

## 6. Phase 2 — Unit gaps (hermetic, fast)

Targets real logic. The full per-file inventory with what-to-test is Appendix C; the priority groups:

**High-value logic (pure or near-pure):**

- `src/features/cbt/use-cbt-insights.ts` — insight gating thresholds, normalization, mood-lift averaging/rounding, top-distortion & recurring-thought ranking with tie-breaks, belief-review due filter, 7-day self-care window joins, anger aggregation.
- `src/features/act/program-definition.ts` — `atOrAfter`/`countSince`/`didOnDate` + each phase's task-signal function (sibling `cbt/program-definition.ts` is already tested).
- `src/features/mood/relative-time.ts` — today/yesterday/N-days-ago by local-day diff, future/same-day → today.
- `src/features/mood/use-emotion-display.ts` — resolution precedence: custom > builtin (emoji override + i18n fallback) > legacy lowercased id > unknown fallback; `allEmotions` merge.
- `src/features/auth/use-auth-throttle.ts` — throttle on rate/429 and after MAX_ATTEMPTS; cooldown reset; success clears.
- `src/lib/use-wizard-draft.ts` — validate-before-advance, save→reset→toast on success, toast on error, backward-only `goToStep`, `selectWizardDraftValues` mode+entityId match.

**Stores (logic-bearing):**

- `src/stores/create-draft-store.ts` & `create-wizard-draft-store.ts` — the factories (hydrate keeps values only on matching entityId/mode; step clamping; reset). The per-feature `*-draft-store.ts` files just instantiate these and need no separate tests.
- `src/stores/cookie-consent-store.ts` — accept-all / essential-only / setAnalytics flags + timestamp + persistence; hydrate ignores malformed/web-only storage.
- `src/stores/emotions-store.ts` — add/update/remove custom emotions + emoji override, AsyncStorage round-trip.
- Lower priority: `toast-store.ts`, `sidebar-store.ts`.

**Lib / util (med-low):** `src/lib/env.ts` (key precedence, `hasSupabaseConfig`, validate warn/error branches), `src/lib/color-scheme.ts`, `src/lib/accessibility.ts`, `src/utils/date.ts`.

**Extracted edge-function logic (see §8):** `getZonedParts`, `reminderKeyIfDue`, `getNotificationCopy`, `classifyPushError`, and the `send-feedback` input-validation + payload builders — unit-tested in jest once extracted to shared modules.

**Query hooks — 8 of 25 worth testing** (the other 17 are thin passthroughs, explicitly out of scope):
`home` (listOrSeed seed-once + `useAddWidget` max+1 position), `breathing` & `grounding` (slug-allowlist `queryFn` filter), `exposure` & `goals` & `procrastination` (multi-step orchestration + conditional invalidation), `habits` (scope-string queryKey derivation), `act` (`committedActionListPrefix` prefix-match invalidation contract).

---

## 7. Phase 3 — Integration breadth (real Supabase; privacy-first ordering)

### 7.1 RLS isolation sweep (first — privacy is a core product value)

Every user-owned table gets a cross-user isolation test (owner-only select/insert/update/delete + anon-sees-nothing), placed per the established convention:

- **A. Folded into the 14 new feature integration tests** (§7.2) — covers their tables directly: `activity_logs`, `anger_logs`, `core_beliefs`, `exposure_hierarchies`/`exposure_items`/`exposure_sessions`, `goals`/`milestones`, `gratitude_entries`, `journal_entries`, `mindfulness_sessions`, `mood_logs`, `procrastination_tasks`/`task_steps`, `self_care_logs`, `values_profile`, `worry_entries`, `widget_preferences`.
- **B. Extend existing feature integration tests** with isolation for their _sibling_ tables not yet asserted: `act-repository` → the act\_\* tables beyond `act_defusion_logs` (expansion, urge-surf, connection, observing-self, value-entries, bulls-eye, program-state, committed-actions, action-steps, choice-points); `meditation-repository` → `meditation_program_state`, `stage_practice_notes`; `habits` → `habit_logs`.
- **C. Centralized `rls.integration.test.ts`** for the orphans that don't map to a feature integration test: `web_push_subscriptions` (real gap — replace the misleading header comment with an actual cross-user case), `noticing_logs`, `recovery_plans`/`challenge_plans` (today only touched via service-role admin), and an anon-sweep helper asserting an anonymous client reads `[]` across a representative set.

Already-correct (no new RLS work, may receive a confirming assertion only): `profiles`, `user_preferences`, `thought_records`, `sleep_logs`, `plan_items`, `habits`, `meditation_sessions`, `act_defusion_logs`.

### 7.2 Feature DB-contract integration tests (14 new files)

One `*-repository.integration.test.ts` per uncovered feature, mirroring `sleep-repository.integration.test.ts`: insert→read-back of real columns, NOT-NULL/CHECK constraints, ordering, user-scoping, plus the §7.1-A isolation cases. Features: activities, anger, beliefs, exposure (3-table hierarchy/items/sessions), goals (goals + milestones), gratitude, journal, mindfulness, mood, procrastination (tasks + steps), self-care, values, worry, home/widgets (`widget_preferences`).

### 7.3 Edge-function HTTP contract (integration)

Via `supabase functions serve` (functions are served by the local stack):

- **`send-feedback`**: 405 (non-POST), 200 (OPTIONS preflight), 401 (missing/invalid Authorization), 400 (invalid input), 500 (missing env), and a happy-path 200 with the Resend `fetch` stubbed/pointed at a capture endpoint so no real email sends.
- **`send-web-reminders`**: 401 (missing/wrong `x-selftend-cron-secret`), happy-path 200 returning `{disabled, sent}`. Deterministic due-window correctness lives in the extracted jest units (§6/§8), not here; the smoke optionally seeds `web_push_subscriptions` + `user_preferences` and asserts side-effect columns (`last_*_reminder_key`, `failure_count`, `last_success_at`) with `webpush.sendNotification` stubbed.

### 7.4 Remaining DB functions (integration)

Extend `db-functions.integration.test.ts` (or a sibling):

- `invoke_send_web_reminders` — raises "Missing Vault secrets…" when absent; with secrets seeded, enqueues a `pg_net` request to the expected URL/header; revoked from anon/authenticated.
- `schedule_send_web_reminders_cron` — creates one `cron.job` named `selftend-send-web-reminders` at `*/5 * * * *`; idempotent on re-run; revoked from anon/authenticated.
- `set_current_timestamp_updated_at` — assert `updated_at` advances on UPDATE (add an explicit assertion to an existing suite, e.g. profiles/user_preferences, rather than a new file).
- When tables are added later, extend the existing `export_user_data` / `delete_user_account` seed + assertions (both functions are redefined additively across migrations).

---

## 8. Edge-function harness (the one new piece of infrastructure)

The functions are Deno modules (`Deno.serve`, `Deno.env`, `npm:` specifiers, JSON import-attributes) that jest/Node cannot import directly. `send-web-reminders` already imports `../../../src/i18n/...`, so cross-importing shared TS is an established pattern.

- Create **`supabase/functions/_shared/web-reminders.ts`**: move `getZonedParts`, `reminderKeyIfDue`, `getNotificationCopy`, `TARGET_CONFIGS`, `notificationCopyByLanguage`, and a new `classifyPushError(error) => {expired, statusCode}` helper. Source the i18n copy via standard JSON import/require so jest can load it. `index.ts` imports from this module; the `Deno.serve` handler, `createClient`, and `webpush` stay in `index.ts`.
- Create **`supabase/functions/_shared/feedback.ts`**: `validateFeedbackInput(category, message)` and the email HTML/payload builders.
- **Jest unit tests** (Phase 2) cover: `reminderKeyIfDue` across disabled/already-sent/wrong-hour/minute-window-boundaries/tz-fallback-chain; `getZonedParts` incl. DST zones and invalid-tz → null; `getNotificationCopy` for `bg`/`bg-BG`/`en`/null/unknown; `classifyPushError` 404/410 vs 500; feedback validation bounds (9/10/1000/1001 chars, missing category, non-string coercion) and that user input renders into the template (documenting the no-escape behavior).
- **Integration smoke** (Phase 3.3) covers the thin Deno wrapper's HTTP contract.

This keeps deterministic correctness in fast hermetic units and limits the live-service test to the wiring.

---

## 9. Phase 4 — E2e flows

Full journeys, privacy-critical prioritized. The complete candidate list with route paths, journeys, and cleanup-helper needs is Appendix D. Priority tiers:

**High** — mood / journal / sleep / gratitude / habit / thought-record **edit + delete**; **ACT defusion** create+delete; **CBT belief** and **CBT goal** create+edit+delete; **password reset → update-password**; **GDPR data export**; **account deletion** (throwaway user); **home widget add/remove/reorder**.

**Medium** — ACT expansion/urge-surf, connection/drop-anchor, committed-action+steps, values/bulls-eye; CBT exposure and behavioral-activities; settings language/notifications/profile-name+reset-onboarding.

**Low** — ACT observing-self & choice-point; CBT weekly-review read-only aggregates; settings theme (client-only).

### 9.1 Shared test infrastructure changes

These unblock Phase 4 and belong in `test/integration/helpers.ts` (re-exported by `test/e2e/helpers.ts`):

- **Promote** the private cleanup helpers currently defined inside individual specs to shared: `deleteAllSleepLogsForUser` (sleep), `deleteAllHabitsForUser` (habits + habit_logs), `deleteAllMeditationSessionsForUser`.
- **Add** cleanup helpers for the uncovered tables: all ACT tables, `core_beliefs`, `goals`+`milestones`, `exposure_*`, `activity_logs`, and `resetWidgetPreferencesForUser` (restore defaults).
- **Add** a `fetchRecoveryLink` Mailpit helper (mirrors `fetchConfirmationLink` but matches `/auth/v1/verify?type=recovery`) for the password-reset flow.
- Optional `seed*ForUser` helpers to create rows to edit/delete without first driving the create UI.
- Note: language/theme controls live in `src/components/app/user-menu.tsx` (header popover), not the settings screen; theme is client-only (zustand) and needs no DB cleanup. Account-deletion and password-reset e2e must use **throwaway users** (never seeded alice/bob/demo).

---

## 10. CI wiring

- `verify` job: `test:coverage` + ratchet check + coverage step-summary (Phase 1).
- `integration` job: unchanged command (`npm run test:integration`) now covers the new RLS/feature/DB-function/edge-HTTP tests. Confirm `supabase functions serve` (or the functions served by `supabase start`) is available in the job for §7.3; add a serve step if needed.
- `e2e` job: unchanged command; new specs run under the existing serial Playwright config.
- Baseline floor is re-recorded (human-committed `--update`) at the end of each phase.

---

## 11. Sequencing & increments

Ordered so each lands as a reviewable PR and the ratchet climbs monotonically (AGENTS.md: smaller reviewable increments):

1. **Tooling** (Phase 1) — coverage + ratchet + CI.
2. **Units** (Phase 2) — batchable by area (logic helpers, stores, extracted edge logic, query hooks); each batch raises the floor.
3. **Integration** (Phase 3), risk-first: RLS sweep → edge-function HTTP + DB functions → the 14 feature contract tests. Shared cleanup-helper promotions (§9.1) land here since integration needs them too.
4. **E2e** (Phase 4) — High tier first, then Medium, then Low; depends on §9.1 helpers.

Phases 2–4 are internally parallelizable across features.

---

## 12. Risks & open questions

- **`supabase functions serve` in CI** — needs confirmation that the edge functions are reachable in the `integration` job; may require an explicit serve step and env wiring for `RESEND_*`/`WEB_PUSH_*` (stubbed/dummy values). If serving proves flaky, fall back to unit-only coverage of the extracted logic plus a non-serving 401/405 contract check.
- **web-push / Resend external calls** — must be stubbed (monkeypatch `webpush.sendNotification`, point Resend `fetch` at a capture endpoint). No real notifications/emails in tests.
- **Edge-function extraction** — moving logic to `_shared/` must keep the Deno function byte-for-byte behavior-equivalent; the integration smoke guards against regressions during extraction.
- **Coverage exclusions** — the `collectCoverageFrom` exclude list must be reviewed so screens/constants don't drag the ratchet floor into noise; screens are intentionally excluded from the unit-coverage denominator since they're covered via e2e.
- **e2e drag-reorder** — `Sortable.Flex` reorder may need careful Playwright `browser_drag` handling; if unstable, assert membership/add/remove and treat reorder as best-effort.
- **`noticing_logs` ownership** — confirm which feature owns it when placing its RLS test (no dedicated repository surfaced in the inventory).

---

## 13. Success criteria

- CI publishes a unit-coverage summary and fails on a coverage drop.
- Every user-owned table has a cross-user RLS isolation test (in a feature file or the centralized file); `web_push_subscriptions`'s real coverage replaces the stale comment.
- All 14 unit-only features have a real-DB integration test.
- Both edge functions: pure logic unit-tested, HTTP contract integration-tested.
- The 3 untested DB functions/trigger are covered.
- E2e includes edit/delete for the create flows plus the High-tier journeys (ACT defusion, CBT belief/goal, password reset, GDPR export, account deletion, widget management).
- `npm run verify`, `test:integration`, and `test:e2e` all green.

---

## Appendix A — RLS table inventory (43 user-owned tables)

Verified against all 53 migrations and every `test/integration/*` file (gap-inventory workflow, 2026-05-30).

**Covered centrally in `rls.integration.test.ts` (3):** `profiles`, `user_preferences`, `thought_records`. _(Storage bucket `profile-pics` is also covered there.)_

**Covered by a feature integration file (5):** `sleep_logs` (sleep-repository), `meditation_sessions` (meditation-repository), `plan_items` (plan-repository), `habits` (habits), `act_defusion_logs` (act-repository).

**No cross-user isolation test anywhere (35) — to be added per §7.1:**
`web_push_subscriptions` (stale-comment false positive), `core_beliefs`, `exposure_hierarchies`, `exposure_items`, `exposure_sessions`, `worry_entries`, `goals`, `milestones`, `values_profile`, `activity_logs`, `mood_logs`, `recovery_plans`, `challenge_plans`, `mindfulness_sessions`, `procrastination_tasks`, `task_steps`, `anger_logs`, `self_care_logs`, `journal_entries`, `gratitude_entries`, `meditation_program_state`, `stage_practice_notes`, `habit_logs`, `act_program_state`, `act_expansion_logs`, `act_urge_surf_logs`, `act_connection_logs`, `act_observing_self_sessions`, `act_value_entries`, `act_bulls_eye_snapshots`, `widget_preferences`, `act_committed_actions`, `act_action_steps`, `act_choice_points`, `noticing_logs`.

## Appendix B — Repository ↔ integration mapping

**Has integration test (9):** act, cbt, habits, meditation, plan, profile, recovery (via db-functions), settings, sleep.

**Unit-only, needs integration test (14):** activities (`activity_logs`), anger (`anger_logs`), beliefs (`core_beliefs`), exposure (`exposure_hierarchies`/`exposure_items`/`exposure_sessions`), goals (`goals`/`milestones`), gratitude (`gratitude_entries`), home/widget (`widget_preferences` — `user_preferences` already partially covered), journal (`journal_entries`), mindfulness (`mindfulness_sessions`), mood (`mood_logs`), procrastination (`procrastination_tasks`/`task_steps`), self-care (`self_care_logs`), values (`values_profile`), worry (`worry_entries`).

**Note:** `cbt/repository.ts` and `home/widget-repository.ts` have no adjacent _unit_ test but are Supabase-backed (covered by integration per convention). `export_user_data` reads most of these tables but only as array-shape assertions — not repository-level CRUD coverage.

## Appendix C — Untested units (priority)

**High:** `cbt/use-cbt-insights.ts`, `act/program-definition.ts`, `mood/relative-time.ts`, `mood/use-emotion-display.ts`, `auth/use-auth-throttle.ts`, `lib/use-wizard-draft.ts`, `stores/create-draft-store.ts`, `stores/create-wizard-draft-store.ts`, `stores/cookie-consent-store.ts`.
**Med:** `stores/emotions-store.ts`, `stores/toast-store.ts`, `lib/env.ts`, `lib/color-scheme.ts`, `lib/accessibility.ts`, `act/use-cached-item.ts`, `act/use-act-program.ts`, `home/use-widget-toggle.ts`, `home/queries.ts`.
**Low / optional:** `utils/date.ts`, `stores/sidebar-store.ts`, `home/tool-accent.ts`, `home/widget-tint.ts`, `habits/learn.ts`, `recovery/schemas.ts`, `act/derive` helpers.
**Query hooks worth testing (8):** act, breathing, exposure, goals, grounding, habits, home, procrastination.
**Explicitly excluded:** the per-feature `*-draft-store.ts` instantiations, the 17 passthrough query hooks, constant-data modules, and init/barrel wrappers.

## Appendix D — E2e candidate flows

**High:** mood / journal / sleep / gratitude / habit / thought-record edit+delete; ACT defusion create+delete; CBT belief create+edit+delete; CBT goal+milestones create+edit+delete; password reset → update-password; GDPR data export; account deletion (throwaway user); home widget add/remove/reorder.
**Med:** ACT expansion/urge-surf; ACT connection/drop-anchor; ACT committed-action+steps; ACT values/bulls-eye; CBT exposure hierarchy+items+session; CBT behavioral activities; settings language switch; settings notification toggles; settings profile display-name + reset-onboarding.
**Low:** ACT observing-self & choice-point; CBT weekly-review read-only render; settings theme switch.

Cleanup-helper status and exact route paths per flow are recorded in the gap-inventory workflow output and carried into the implementation plan.

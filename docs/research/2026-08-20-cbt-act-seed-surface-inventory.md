# CBT and ACT seed surface inventory

Resolves [#1176](https://github.com/Selftend/selftend/issues/1176) and feeds [#1177](https://github.com/Selftend/selftend/issues/1177), on the map [Seed data for CBT and ACT on the local demo account](https://github.com/Selftend/selftend/issues/1174).

Captured 2026-08-20 against `origin/dev` at `4039247e`. Facts only — row counts, content and programme position are decided on other tickets.

---

## 1. Headline corrections to the map

Four premises recorded while charting are wrong. They are corrected on the map's Notes; recorded here with the evidence.

| Premise on the map                                                                           | Reality                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ☠️ "`enabled_modules` defaults to `['cbt']`, so **ACT is invisible** until the seed sets it" | **False.** `ModulesScreen` (`src/features/modules/modules-screen.tsx`) renders a hardcoded `MODULES` array of all three tiles (`cbt`, `act`, `dbt`) and reads **no preferences at all**. Nothing anywhere filters navigation on `enabledModules` — its only non-test readers are `settings/repository.ts` (round-trip) and `meditation-home-screen.tsx` (which _adds_ `"meditation"` on use). ACT is reachable today. Setting the flag is optional tidiness, **not** a precondition. |
| ☠️ Encryption-through-a-view is an **ACT** trap                                              | **Understated.** _Every_ CBT table is encrypted too (`20260591`–`20260630`). The rule — insert through the same-named view, pass `user_id` explicitly — is **universal** across this map, not an ACT special case.                                                                                                                                                                                                                                                                   |
| `noticing_logs` is a CBT table                                                               | **It does not exist.** Dropped in `20260553`, re-dropped idempotently in `20260661`, whose preflight records it was never created. Its capture folded into `mood_logs` as the four check-in columns.                                                                                                                                                                                                                                                                                 |
| `values_profile` is a singleton                                                              | **False.** `unique (user_id, life_domain)` — one row _per domain_, domains unconstrained (plain `text`). The genuine singletons are `recovery_plans` (`unique (user_id)`) and `act_program_state` (`user_id` is the PK).                                                                                                                                                                                                                                                             |

### The paging question, answered

**No CBT or ACT list pages.** `useInfiniteQuery` / `.range(` / `getNextPageParam` appear in exactly eight features, and every one is a `tools/` feature: `mood`, `journal`, `sleep`, `gratitude`, `habits`, `breathing`, `grounding`, `meditation`. Every CBT and ACT list is a plain `useQuery` returning the full set.

Consequence for [#1181](https://github.com/Selftend/selftend/issues/1181): **there is no paging floor**, and the sub-question asking whether the floor overrides plausibility is void. Row counts are free to be chosen purely on plausibility.

---

## 2. ACT surfaces

24 route files. `act_*` tables are all encrypted views except `act_bulls_eye_snapshots`.

| Route                                 | Screen                               | Table(s)                                     | Shape                                          | Seedable     |
| ------------------------------------- | ------------------------------------ | -------------------------------------------- | ---------------------------------------------- | ------------ |
| `/modules/act`                        | `act-home-screen`                    | `act_program_state` + every `act_*` count    | singleton + counts                             | ✅           |
| `/modules/act/choice-point`           | `act-choice-point-list-screen`       | `act_choice_points`                          | list, no paging                                | ✅           |
| `/modules/act/choice-point/[id]`      | `act-choice-point-detail-screen`     | `act_choice_points`                          | row                                            | ✅           |
| `/modules/act/choice-point/new`       | `act-choice-point-new-screen`        | —                                            | create form                                    | ❌ stateless |
| `/modules/act/committed-action`       | `act-committed-action-list-screen`   | `act_committed_actions`                      | list                                           | ✅           |
| `/modules/act/committed-action/[id]`  | `act-committed-action-detail-screen` | `act_committed_actions` + `act_action_steps` | row + children                                 | ✅           |
| `/modules/act/committed-action/new`   | `act-committed-action-new-screen`    | —                                            | create form                                    | ❌ stateless |
| `/modules/act/connection`             | `act-connection-list-screen`         | `act_connection_logs`                        | list                                           | ✅           |
| `/modules/act/connection/[id]`        | `act-connection-detail-screen`       | `act_connection_logs`                        | row                                            | ✅           |
| `/modules/act/connection/new`         | `act-connection-new-screen`          | —                                            | create form                                    | ❌ stateless |
| `/modules/act/connection/drop-anchor` | `act-drop-anchor-screen`             | writes `act_connection_logs`                 | exercise, **displays no history**              | ❌ stateless |
| `/modules/act/defusion`               | `act-defusion-list-screen`           | `act_defusion_logs`                          | list                                           | ✅           |
| `/modules/act/defusion/[id]`          | `act-defusion-detail-screen`         | `act_defusion_logs`                          | row                                            | ✅           |
| `/modules/act/defusion/new`           | `act-defusion-new-screen`            | —                                            | create form                                    | ❌ stateless |
| `/modules/act/expansion`              | `act-expansion-list-screen`          | `act_expansion_logs`                         | list                                           | ✅           |
| `/modules/act/expansion/[id]`         | `act-expansion-detail-screen`        | `act_expansion_logs`                         | row                                            | ✅           |
| `/modules/act/expansion/new`          | `act-expansion-new-screen`           | —                                            | create form                                    | ❌ stateless |
| `/modules/act/expansion/urge-surfing` | `act-urge-surf-screen`               | `act_urge_surf_logs`                         | **inline recent-5** (`useUrgeSurfLogs(id, 5)`) | ✅           |
| `/modules/act/observing-self`         | `act-observing-self-list-screen`     | `act_observing_self_sessions`                | list                                           | ✅           |
| `/modules/act/observing-self/[id]`    | `act-observing-self-detail-screen`   | `act_observing_self_sessions`                | row                                            | ✅           |
| `/modules/act/observing-self/new`     | `act-observing-self-new-screen`      | —                                            | create form                                    | ❌ stateless |
| `/modules/act/values`                 | `act-values-screen`                  | `act_value_entries`                          | ≤4 rows, one per domain                        | ✅           |
| `/modules/act/values/[domain]`        | `act-value-domain-screen`            | `act_value_entries`                          | row per domain                                 | ✅           |
| `/modules/act/values/bulls-eye`       | `act-bulls-eye-screen`               | `act_bulls_eye_snapshots`                    | **time series**                                | ✅           |

**`act_urge_surf_logs` has no list route** — its only surface is the recent-5 strip inside the urge-surfing exercise screen. Seeding more than 5 buys nothing visible.

### ACT column shapes that constrain an insert

- `act_value_entries` — `life_domain` **CHECK** in `('work','leisure','relationships','personalGrowth')`; `unique (user_id, life_domain)` ⇒ **max 4 rows**. `importance_rating` / `current_alignment_rating` nullable, 1–10.
- `act_bulls_eye_snapshots` — `domain` same 4-value CHECK; `alignment_rating` **not null**, 1–10; `reviewed_at` drives the series. **Not encrypted** — the only table in this map written directly rather than through a view.
- `act_committed_actions` — `life_domain` same 4-value CHECK; `status` CHECK in `('active','completed','abandoned')`.
- `act_action_steps` — `action_id` → `act_committed_actions(id)` **ON DELETE CASCADE**.
- `act_defusion_logs` — `thought_category` and `technique_used` are CHECK enums (trigger defaults them to `'other'` / `'havingTheThoughtThat'`); `fusion_level_before` / `_after` nullable, 0–100.
- `act_program_state` — `user_id` **is the PK** (singleton). `myths_acknowledged` and `onboarding_completed_at` are written by the repository but **read by no screen** — dead columns, not gates.

---

## 3. CBT surfaces

34 route files.

| Route                                    | Screen / feature               | Table(s)                                                        | Shape                                      | Seedable     |
| ---------------------------------------- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------ | ------------ |
| `/modules/cbt`                           | `cbt-home-screen`              | programme prefs + cross-module counts                           | phase card                                 | ✅           |
| `/modules/cbt/new`                       | `use-thought-record-editor`    | —                                                               | wizard                                     | ❌ stateless |
| `/modules/cbt/[id]`                      | legacy redirect                | —                                                               | redirect to `/history/[id]`                | ❌ stateless |
| `/modules/cbt/learn`                     | inline                         | —                                                               | static distortion definitions              | ❌ stateless |
| `/modules/cbt/history`                   | `cbt-history-screen`           | `thought_records`                                               | list, no paging                            | ✅           |
| `/modules/cbt/history/[id]`              | `thought-record-detail-screen` | `thought_records`                                               | row                                        | ✅           |
| `/modules/cbt/saved/[id]`                | `thought-record-saved-screen`  | `thought_records`                                               | post-save confirmation                     | ✅           |
| `/modules/cbt/weekly-review`             | inline                         | `activity_logs` + `goals` + `mood_logs` + `thought_records`     | cross-tool review                          | ✅           |
| `/modules/cbt/recovery`                  | `recovery/*`                   | `recovery_plans` + `challenge_plans`                            | **singleton** + children                   | ✅           |
| `/modules/cbt/self-care`                 | `self-care/queries`            | `self_care_logs`                                                | one per day (`unique (user_id, log_date)`) | ✅           |
| `/modules/cbt/values`                    | `values/queries`               | `values_profile`                                                | one per `life_domain`                      | ✅           |
| `/modules/cbt/activities` `/[id]` `/new` | `activities/*`                 | `activity_logs`                                                 | list + row                                 | ✅           |
| `/modules/cbt/anger` `/[id]` `/new`      | `anger/*`                      | `anger_logs`                                                    | list + row                                 | ✅           |
| `/modules/cbt/beliefs` `/[id]` `/new`    | `beliefs/*`                    | `core_beliefs`                                                  | list + row                                 | ✅           |
| `/modules/cbt/exposure` `/[id]` `/new`   | `exposure/*`                   | `exposure_hierarchies` → `exposure_items` → `exposure_sessions` | list + 3-level chain                       | ✅           |
| `/modules/cbt/goals` `/[id]` `/new`      | `goals/*`                      | `goals` → `milestones`                                          | list + children                            | ✅           |
| `/modules/cbt/tasks` `/[id]` `/new`      | `procrastination/*`            | `procrastination_tasks` → `task_steps`                          | list + children                            | ✅           |
| `/modules/cbt/worry` `/[id]` `/new`      | `worry/*`                      | `worry_entries`                                                 | list + row                                 | ✅           |
| `/modules/dbt`                           | `dbt-module-screen`            | —                                                               | static overview, no exercises              | ❌ stateless |
| `/modules`                               | `modules-screen`               | —                                                               | static 3 tiles                             | ❌ stateless |

Every `*/new.tsx` is a creation form with nothing to seed.

### CBT column shapes that constrain an insert

- `goals` — `title`, `life_domain`, `goal_type` not null; `status` CHECK in `('active','completed','paused','abandoned')`.
- `milestones` — `goal_id` → `goals` **cascade**; `description` not null.
- `values_profile` — `importance_rating` and `satisfaction_rating` **not null**, 1–5; `life_domain` free text (**no CHECK**, unlike ACT's 4-value enum); `unique (user_id, life_domain)`.
- `activity_logs` — `activity_name` not null; `category` CHECK in `('pleasure','mastery')`; `mood_before`/`mood_after` nullable, 1–10.
- `core_beliefs` — `belief_statement` not null; `original_belief_strength` and `alternative_belief_strength` **not null**, 0–100; three `text[]` columns default `'{}'`.
- `exposure_hierarchies` — `title`, `anxiety_type` not null. `exposure_items` — `suds_rating` not null 0–100, cascade. `exposure_sessions` — `pre_suds`/`post_suds` not null 0–100, `duration_minutes` not null ≥0, cascade.
- `worry_entries` — `worry_statement` not null; `worry_category` CHECK in `('hypothetical','real_problem')`; `probability_estimate` nullable 0–100.
- `anger_logs` — `trigger_text` not null; `arousal_level` **not null**, 1–10; `outcome_rating` nullable 1–10.
- `procrastination_tasks` — `task_description` not null; `status` CHECK in `('active','completed','abandoned')`. `task_steps` — `task_id` cascade.
- `self_care_logs` — `log_date` **not null**, `unique (user_id, log_date)`. `sleep_hours`/`sleep_quality`/`gratitude` were **dropped** in `20260553` (owned by the Sleep and Gratitude tools now) — do not seed them.
- `recovery_plans` — `unique (user_id)` ⇒ **singleton**; `strategy_integration_notes` is `jsonb` defaulting `{}`.
- `challenge_plans` — composite FK `(recovery_plan_id, user_id)` → `recovery_plans (id, user_id)` **ON DELETE CASCADE**.
- `thought_records` — `situation`, `automatic_thought`, `balanced_thought` not null; `emotions`/`distortions` are `text[]`. Extended by `20260519` / `20260524`, encrypted by `20260591`, and given a captured occurrence offset by `20260731130000`.

---

## 4. FK chains and cascade behaviour (for #1182)

**Every FK in both modules declares `on delete cascade`.** Wiping the parent is sufficient; a child-first wipe is dead code.

| Chain                                                           | Cascade           |
| --------------------------------------------------------------- | ----------------- |
| `goals` → `milestones`                                          | ✅                |
| `exposure_hierarchies` → `exposure_items` → `exposure_sessions` | ✅ (both levels)  |
| `procrastination_tasks` → `task_steps`                          | ✅                |
| `recovery_plans` → `challenge_plans`                            | ✅ (composite FK) |
| `act_committed_actions` → `act_action_steps`                    | ✅                |

**Caveat the spec must state:** these cascades are declared on the `_data` base tables. The seed wipes through the _view_. Whether `delete` on an encrypted view fires the base-table cascade needs one live check against a local stack before the spec relies on it — the INSTEAD OF delete trigger deletes from `_data`, so it should, but nothing here proves it.

---

## 5. Flags and gates (#1177)

### The only client-side gate

`selftend:cbt:thoughtRecordIntroDismissed` — AsyncStorage + zustand (`src/features/cbt/use-thought-record-intro-dismissed.ts`), **device-local by design**.

☠️ **A server-side seed script cannot set it.** The thought-record intro card will render on a freshly-seeded account no matter what the seed does. This is a hard limit on what this map can deliver and the spec must say so rather than promise a clean screen.

It is also the _only_ one: a sweep of every `selftend:*` storage key finds seven, and the other six are language, wizard drafts, theme, style, and app-lock — none CBT/ACT.

### DB flags

| Flag                                                                                       | Needed?                                                                                                                                                                |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled_modules`                                                                          | **No.** Nothing filters on it (see §1). Set it for tidiness only.                                                                                                      |
| `selected_concerns`                                                                        | **No gate found** — read only by the onboarding wizard's initial state.                                                                                                |
| `active_strategies`                                                                        | **No.** `resolveActiveStrategyKeys` falls back to _inferring from which tables have data_, then to all keys. **Seeding rows populates the recovery screen by itself.** |
| `cbt_program_started_at`, `cbt_program_phase_index`, `cbt_program_phase_started_at`        | **Yes** — required for mid-programme. Decided on [#1178](https://github.com/Selftend/selftend/issues/1178).                                                            |
| `cbt_program_completed_at`                                                                 | Must stay null, or the programme reads finished.                                                                                                                       |
| `cbt_program_prompt_dismissed_at`                                                          | Set, so the "start the programme" prompt does not sit over a started programme.                                                                                        |
| `act_program_started_at` + an `act_program_state` row                                      | **Yes** — same reason.                                                                                                                                                 |
| `act_program_state.myths_acknowledged` / `onboarding_completed_at`                         | **No** — written by the repository, read by no screen.                                                                                                                 |
| `shown_button_tours`                                                                       | **No** — home-screen scoped; `module-home-header` no longer shows tips.                                                                                                |
| `app_onboarding_completed`, `policy_version_accepted`, `email_verified`, `emotions_seeded` | Already set by the script.                                                                                                                                             |

### A free win for the programme

The CBT programme's `dailyNoticing` leg reads `moodLogs` filtered to those with a non-empty `situation` / `thoughts` / `behaviours` / `bodilySensations` — the four check-in columns. **The script already seeds those**, at `chance(0.08)` / `chance(0.06)` per entry. So one CBT programme leg is already satisfiable from existing data.

☠️ But the leg is evaluated against **today**, and at ~8% per entry today's check-in will almost certainly _not_ carry the workbook fields. If the spec wants today's noticing complete, the seed must force those columns on today's entry rather than leave it to the dice. Carried to [#1178](https://github.com/Selftend/selftend/issues/1178).

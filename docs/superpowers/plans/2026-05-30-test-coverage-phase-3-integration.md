# Test Coverage — Phase 3: Integration Breadth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give every user-owned table a cross-user RLS isolation test and every unit-only feature repository a real-DB contract test, plus cover the remaining DB functions and the edge-function HTTP contract — all against the local Supabase stack.

**Architecture:** Jest integration suite (`jest.integration.config.js`, `--runInBand`) against the local Supabase CLI stack (seeded users alice/bob/demo). New `*-repository.integration.test.ts` files mirror the existing `test/integration/sleep-repository.integration.test.ts`: sign in as a seeded user, exercise real columns/constraints/ordering/scoping, assert cross-user RLS isolation, clean up in `afterEach` via service-role helpers. RLS placement follows the repo convention (isolation lives with each feature's contract test); the centralized `rls.integration.test.ts` only gets orphan tables + an anon sweep.

**Tech Stack:** Jest + `@supabase/supabase-js` against `http://127.0.0.1:54321`; helpers in `test/integration/helpers.ts`.

**Prerequisite:** Local stack running + seeded — `npm run db:start && npm run db:reset`. Verify health: `curl -s http://127.0.0.1:54321/auth/v1/health`. Run the suite with `npm run test:integration` (or a single file via `npx jest -c jest.integration.config.js --runInBand <file>`).

**Source spec:** `docs/superpowers/specs/2026-05-30-test-coverage-and-strategy-design.md` (§7, Appendices A–B).

---

## Git policy (read first)

The repo owner performs all staging/commits. "Commit" steps are checkpoints — executor does NOT stage/commit, never adds `Co-Authored-By`. NOTE: `tsc` is NOT in the pre-commit hook; before a batch is "done", run `npm run typecheck` (or `npm run verify`) so integration test files (which import real types) are type-clean.

## Conventions (read the template first)

The canonical integration test is `test/integration/sleep-repository.integration.test.ts` (read it). Shape:

- `import { SEED_USERS, createServiceClient, signInAs } from "./helpers";`
- `beforeAll` signs in as `alice`/`bob`; `afterEach` deletes the feature's rows for both users via the service client; `afterAll` signs both out.
- Tests: insert + read-back of real columns; CHECK/NOT-NULL constraint rejections; ordering; **cross-user RLS** (another user reads `[]`; their update/delete is a no-op; anon sees nothing).
- Cleanup helpers live in `test/integration/helpers.ts` and are exported (e.g. `deleteAllMoodLogsForUser`). Some already exist: thought_records, mood_logs, journal_entries, gratitude_entries. ADD the missing ones in this phase (Task H below).

### Helper task (do FIRST)

**Task H: add cleanup helpers to `test/integration/helpers.ts`**

- [ ] For every table the new feature tests touch that lacks a `deleteAll<X>ForUser` helper, add one mirroring the existing `deleteAllMoodLogsForUser` shape:

```ts
export async function deleteAllActivityLogsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("activity_logs").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllActivityLogsForUser cleanup failed: ${error.message}`);
}
```

Add helpers for: `activity_logs`, `anger_logs`, `core_beliefs`, `exposure_hierarchies`, `worry_entries`, `goals` (also deletes `milestones` via FK cascade — verify cascade; if not, delete `milestones` then `goals`), `mindfulness_sessions`, `procrastination_tasks` (+ `task_steps`), `self_care_logs`, `values_profile`, `widget_preferences`, `noticing_logs`, `recovery_plans` (+ `challenge_plans`). For child tables with `ON DELETE CASCADE` from the parent, deleting the parent suffices — confirm in the migration; otherwise delete child first. Promote the in-test private helpers too: `deleteAllSleepLogsForUser`, `deleteAllHabitsForUser` (habits + habit_logs), `deleteAllMeditationSessionsForUser`.

- [ ] **Commit** _(user)_: `git add test/integration/helpers.ts` → `git commit -m "test(integration): add cleanup helpers for feature contract tests"`

---

## Batch 3A — Feature DB-contract + RLS tests (14 files)

Each file is `test/integration/<feature>-repository.integration.test.ts`, mirroring the sleep template. The implementer READS the feature's `repository.ts` + the table's migration (in `supabase/migrations/`) for exact columns/constraints, then writes: insert/read-back, constraint rejections, ordering, user-scoping, and **cross-user RLS isolation** (covers spec §7.1-A + §7.2). Run each with `npx jest -c jest.integration.config.js --runInBand <file>`.

### Worked example — Task 3A-mood (`mood-repository.integration.test.ts`)

`mood_logs` columns (from `src/features/mood/repository.ts`): `user_id, mood_score, emotions (text[]), notes, linked_strategy, logged_at, situation, thoughts, behaviours, bodily_sensations`. Constraint: `mood_score` CHECK 1–5 (migration `20260520_mood_scale_1_to_5.sql`). RLS: select/insert/update own. Cleanup: `deleteAllMoodLogsForUser` (exists).

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllMoodLogsForUser, signInAs } from "./helpers";

describe("mood mood_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const base = {
    emotions: ["Anxious"],
    notes: "",
    linked_strategy: null,
    situation: "",
    thoughts: "",
    behaviours: "",
    bodily_sensations: "",
  };

  it("inserts a mood log and reads it back", async () => {
    const insert = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 3, ...base })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({ user_id: SEED_USERS.alice.id, mood_score: 3 });
    expect(insert.data?.logged_at).toEqual(expect.any(String));
  });

  it("rejects mood_score outside 1-5 via the check constraint", async () => {
    const tooHigh = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 6, ...base })
      .select("id");
    expect(tooHigh.error).not.toBeNull();
  });

  it("lists logs ordered by logged_at desc", async () => {
    for (const d of ["2026-05-13", "2026-05-15", "2026-05-14"]) {
      const r = await alice
        .from("mood_logs")
        .insert({
          user_id: SEED_USERS.alice.id,
          mood_score: 3,
          logged_at: `${d}T08:00:00.000Z`,
          ...base,
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }
    const list = await alice
      .from("mood_logs")
      .select("logged_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false });
    expect(list.data?.map((r) => r.logged_at.slice(0, 10))).toEqual([
      "2026-05-15",
      "2026-05-14",
      "2026-05-13",
    ]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 4, ...base })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const bobRead = await bob.from("mood_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 4, ...base, notes: "private" })
      .select("id")
      .single();
    await bob.from("mood_logs").update({ notes: "hacked" }).eq("id", created.data!.id);
    const check = await alice.from("mood_logs").select("notes").eq("id", created.data!.id).single();
    expect(check.data?.notes).toBe("private");
  });
});
```

### Remaining Batch 3A tasks (same pattern; read repository + migration for exact columns/constraints)

- **3A-journal** (`journal_entries`: title, body; trims; cleanup exists). RLS isolation.
- **3A-gratitude** (`gratitude_entries`: item/level/starred etc — read migration `20260523`/`20260528-30`; cleanup exists). RLS + the `starred`/level columns.
- **3A-activities** (`activity_logs`). 3A-anger (`anger_logs`). 3A-beliefs (`core_beliefs`). 3A-worry (`worry_entries`). 3A-self-care (`self_care_logs`: note the dedup unique constraint from `20260553`). 3A-values (`values_profile`: per-user unique — upsert semantics; no delete policy). 3A-mindfulness (`mindfulness_sessions`).
- **3A-goals** (`goals` + `milestones`: parent/child, own user_id on both; test milestone insert + cascade). 3A-procrastination (`procrastination_tasks` + `task_steps`). 3A-exposure (`exposure_hierarchies` + `exposure_items` + `exposure_sessions`: 3-table; test the hierarchy→items→sessions chain + isolation on each).
- **3A-home-widgets** (`widget_preferences`: UNIQUE(user_id, widget_id), position; test upsert/position + isolation).

For each: insert/read-back of real columns, at least one constraint rejection (CHECK/NOT NULL/UNIQUE where present), ordering if the repo orders, and cross-user RLS (read `[]`, update/delete no-op). Commit each (or in small groups): `git commit -m "test(integration): <feature> DB contract + RLS"`.

---

## Batch 3B — Extend existing integration tests for sibling-table RLS (§7.1-B)

- [ ] **3B-act**: in `test/integration/act-repository.integration.test.ts`, add cross-user RLS isolation cases for the act\_\* tables not yet asserted (it currently covers `act_defusion_logs`): `act_expansion_logs`, `act_urge_surf_logs`, `act_connection_logs`, `act_observing_self_sessions`, `act_value_entries`, `act_bulls_eye_snapshots`, `act_program_state`, `act_committed_actions`, `act_action_steps`, `act_choice_points`. A compact loop/table-driven block (insert as alice, assert bob reads `[]`) is fine. Read the file + `src/features/act/repository.ts` for column shapes.
- [ ] **3B-meditation**: in `meditation-repository.integration.test.ts`, add isolation for `meditation_program_state` and `stage_practice_notes`.
- [ ] **3B-habits**: in `habits.integration.test.ts`, add a dedicated `habit_logs` cross-user isolation case.
- [ ] **Commit** _(user)_ per file.

---

## Batch 3C — Centralized RLS orphans + anon sweep (§7.1-C)

- [ ] In `test/integration/rls.integration.test.ts`, add cross-user isolation for the orphan tables not covered by any feature test: `web_push_subscriptions` (REPLACE the misleading header-comment claim with a real case — alice cannot read bob's subscription; insert-on-behalf rejected), `noticing_logs`, `recovery_plans` + `challenge_plans`, `widget_preferences` (if not already covered by 3A-home-widgets — if 3A covers it, skip here). Read each table's migration for columns.
- [ ] Add an **anon sweep**: using `createAnonClient()`, assert an anonymous client reads `[]` (or errors) across a representative set of user tables (e.g. mood_logs, journal_entries, core_beliefs, web_push_subscriptions) and cannot insert.
- [ ] **Commit** _(user)_: `git commit -m "test(integration): RLS for orphan tables + anon sweep"`

---

## Batch 3D — Remaining DB functions (§7.4)

- [ ] **3D-trigger** `set_current_timestamp_updated_at`: add an assertion to an existing suite (e.g. `settings-repository` or `profile-repository`) — capture `updated_at`, perform an UPDATE, assert it advanced (strictly greater, ~now UTC). Read which tables wire the BEFORE UPDATE trigger (`20260415_initial.sql`).
- [ ] **3D-cron** `schedule_send_web_reminders_cron`: new cases in `db-functions.integration.test.ts` — as service role, `rpc("schedule_send_web_reminders_cron")`, then `SELECT * FROM cron.job WHERE jobname='selftend-send-web-reminders'` (via a raw query/`rpc` or the service client) asserting one row at `*/5 * * * *`; call twice → still one job (idempotent); assert it's revoked from anon/authenticated (calling as alice → permission denied). NOTE: requires `pg_cron` available in the local stack — verify; if `cron` schema is inaccessible via PostgREST, use a SQL helper or skip with a logged note.
- [ ] **3D-invoke** `invoke_send_web_reminders`: assert it raises "Missing Vault secrets…" when vault secrets absent; (optionally) with secrets seeded, a `net.http_request_queue`/`pg_net` row is enqueued; revoked from anon/authenticated. NOTE: depends on Vault + `pg_net` — verify availability; if not testable locally, cover the revocation + the missing-secrets error path only, and log what was skipped.
- [ ] **Commit** _(user)_ per function or as a group.

---

## Batch 3E — Edge-function HTTP contract (§7.3)

**Infra:** the default `supabase start` does NOT run an edge-runtime container here. To test the HTTP contract, run `npx supabase functions serve --no-verify-jwt` (or `--env-file`) in the background, which serves functions at `http://127.0.0.1:54321/functions/v1/<name>`. The functions call external services (Resend, web-push) — stub/avoid by pointing env at capture endpoints or asserting only the pre-external branches.

- [ ] **3E-feedback**: assert (no external call reached) — `405` for non-POST, `200` for OPTIONS (CORS preflight), `401` with missing/invalid Authorization, `400` for invalid input (with a valid seeded user's JWT). The happy-path 200 reaches Resend — either stub via env (`RESEND_API_KEY` pointed at a local capture server) or SKIP the happy path with a logged note (the validation/auth logic is already unit-tested in Phase 2).
- [ ] **3E-web-reminders**: assert `401` when `x-selftend-cron-secret` is missing/wrong; happy-path 200 returning `{disabled, sent}` requires VAPID env + stubbed web-push — if infeasible locally, cover the auth-gate only and log the skip (deterministic scheduling already unit-tested in Phase 2).
- [ ] **FALLBACK** (if `functions serve` is too flaky in this environment): document that the HTTP contract is deferred, note that the deterministic logic is unit-tested (Phase 2 `_shared/*`), and cover what's reachable. Do NOT block the phase on edge serving.
- [ ] **Commit** _(user)_ if any tests were added.

---

## Finalize Phase 3

- [ ] Run the full integration suite: `npm run test:integration` — all green (existing + new). Also run `npm run verify` (unit suite + typecheck unaffected; integration is separate).
- [ ] Coverage note: integration tests are NOT in the unit-coverage denominator (separate jest config), so the ratchet baseline is unchanged by Phase 3. Do not re-record the baseline for this phase.

## Self-review checklist

- Spec coverage: §7.1 (RLS — 3A-A + 3B + 3C), §7.2 (14 feature tests — 3A), §7.3 (edge — 3E, with fallback), §7.4 (DB functions — 3D). Helpers (Task H).
- No placeholders: template + mood worked example are full code; per-feature tasks carry table/constraint/cleanup specs + the named template.
- Each new file cleans up its rows (afterEach) and signs out (afterAll); tests are independent (runInBand) and don't depend on row counts left by other suites.

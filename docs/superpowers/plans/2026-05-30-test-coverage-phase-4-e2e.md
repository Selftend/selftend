# Test Coverage — Phase 4: E2E Flows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend e2e from create-only to full edit/delete/reorder journeys and the major uncovered flows (ACT, CBT depth, settings/GDPR, password reset, home widgets), privacy-critical first.

**Architecture:** Playwright (`playwright.config.ts`) drives the Expo web app at `http://localhost:8082`, pointed at the local Supabase stack. Tests sign in via the real UI (`signInAsViaUi` + `dismissPostSignInModals`), interact with screens, and clean up rows via service-role helpers re-exported from `test/integration/helpers.ts`. Detail screens follow a uniform edit/delete pattern.

**Tech Stack:** `@playwright/test`, the local Supabase stack, Mailpit (`:54324`) for email flows.

**Prerequisite + speed:** Local stack running (`http://127.0.0.1:54321` healthy) AND a persistent web server on `:8082`. Run tests reusing it: `E2E_REUSE_EXISTING_SERVER=1 npx playwright test <file> --reporter=list`. (Without reuse, each run rebuilds the web bundle ~30s.) To (re)start the server with the e2e env: `EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-anon-key> EXPO_PUBLIC_PUBLIC_APP_URL=http://localhost:8082 npm exec expo -- start --web --port 8082 --clear`.

**Source spec:** `docs/superpowers/specs/2026-05-30-test-coverage-and-strategy-design.md` (§9, Appendix D).

---

## Git policy (read first)

Repo owner performs all staging/commits. "Commit" steps are checkpoints — executor does NOT stage/commit, never adds `Co-Authored-By`. Before a batch is "done", run `npm run typecheck` so e2e files (which import real types) are type-clean (tsc is NOT in the pre-commit hook).

## Conventions (read the template first)

Read `test/e2e/log-mood.e2e.test.ts`, `test/e2e/create-journal-entry.e2e.test.ts`, and `test/e2e/helpers.ts`. Shape:

- `test.beforeEach`/`afterEach` clean up the feature's rows via a service-role helper.
- `signInAsViaUi(page, "alice")` then `dismissPostSignInModals(page)`.
- `page.goto("/tools/...")`, interact via `getByRole("button", { name })` / `getByPlaceholder` / `getByText`, then assert visible text.
- **Button labels come from i18n** — read `src/i18n/locales/en/<namespace>.json` for the exact English strings (e.g. mood `detail.edit`, `detail.delete`, `detail.confirmDelete.confirm`). Do NOT guess label text.

**Detail-screen edit/delete pattern** (verified in `mood-detail-screen.tsx`): an **Edit** button (`t("detail.edit")`) routes to `/<tool>/<id>/edit`; a **Delete** button (`t("detail.delete")`) opens a `ConfirmDialog` whose confirm button is `t("detail.confirmDelete.confirm")`; on confirm the row is deleted, a `feedback.deleted` toast shows, and the app `router.replace`s to the list. ACT/CBT wizard logs are typically **delete-only** (no edit); mood/journal/sleep/gratitude/habit/belief/goal support edit.

### Helper task (do FIRST) — Task H

**Add to `test/integration/helpers.ts`** (re-exported by `test/e2e/helpers.ts`; many feature cleanup helpers were already added in Phase 3 — `deleteAllGoalsForUser`, `deleteAllExposureForUser`, etc.):

- [ ] Promote any still-private cleanup helpers used inline by existing e2e specs to shared exports: `deleteAllSleepLogsForUser` (sleep_logs), `deleteAllHabitsForUser` (habit_logs + habits), `deleteAllMeditationSessionsForUser` (meditation_sessions) — check `test/e2e/log-sleep.e2e.test.ts` / `create-habit.e2e.test.ts` for the private versions and move them.
- [ ] Add ACT cleanup: `deleteAllActLogsForUser(userId)` deleting from the act\_\* tables (act_defusion_logs, act_expansion_logs, act_urge_surf_logs, act_connection_logs, act_observing_self_sessions, act_value_entries, act_bulls_eye_snapshots, act_committed_actions, act_action_steps, act_choice_points, act_program_state) — each `.delete().eq("user_id", userId)`.
- [ ] Add `resetWidgetPreferencesForUser(userId)` — `delete().eq("user_id", userId)` on `widget_preferences` (the app re-seeds defaults on next load).
- [ ] Re-export the new helpers from `test/e2e/helpers.ts`.
- [ ] In `test/e2e/helpers.ts`, add `fetchRecoveryLink(page, email)` — mirror the existing `fetchConfirmationLink` but match the password-recovery link (`/auth/v1/verify?type=recovery`) for the password-reset flow.
- [ ] **Commit** _(user)_.

---

## Batch 4A — Edit/Delete journeys (HIGH; extend existing create flows)

Each extends an existing create e2e by adding edit + delete. Cleanup helpers already exist (mood/journal/gratitude/thought-record) or are promoted in Task H (sleep/habits). Read each detail + editor screen + the i18n namespace for labels.

### Worked example — Task 4A-mood (`test/e2e/edit-delete-mood.e2e.test.ts`)

```ts
import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllMoodLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("edit and delete a mood log", () => {
  test.beforeEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
  });

  test("alice edits then deletes a mood log", async ({ page }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // Create via UI (reuse the known create flow).
    await page.goto("/tools/mood-tracker/new");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("😐")).toBeVisible({ timeout: 15_000 });

    // EDIT: tap Edit (label from mood.json detail.edit), change the score, Save.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    // The editor is the same MoodScale; pick a different score ("Good").
    await page.getByRole("button", { name: "Good", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // Detail now shows the updated emoji (score 4 -> 🙂; confirm the exact emoji in mood-scale).
    await expect(page.getByText("🙂")).toBeVisible({ timeout: 15_000 });

    // DELETE: tap Delete -> ConfirmDialog confirm -> redirected to the list, entry gone.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    // Confirm label from mood.json detail.confirmDelete.confirm (read it; e.g. "Delete entry").
    await page.getByRole("button", { name: "Delete entry", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/mood-tracker$/, { timeout: 15_000 });
    await expect(page.getByText("🙂")).toBeHidden({ timeout: 10_000 });
  });
});
```

NOTE: confirm the exact button labels (`Edit`/`Delete`/the confirm label) and emoji from `src/i18n/locales/en/mood.json` + `src/components/app/mood-scale.tsx`. If the editor's "Good" score maps to a different emoji, assert the right one. If a label differs, use the real one.

### Remaining Batch 4A tasks (same pattern; read detail/editor + i18n)

- **4A-journal** (`/tools/journal/[id]` + `/edit`; cleanup `deleteAllJournalEntriesForUser`): create → edit title/body → delete.
- **4A-sleep** (`/tools/sleep/[id]` + `/edit`; promote `deleteAllSleepLogsForUser`): create → edit duration/quality/notes → delete.
- **4A-gratitude** (`/tools/gratitude-log/[id]` + `/edit` + `/favorites`; cleanup exists): create → favorite (assert under `/favorites`) → edit → delete.
- **4A-habit** (`/tools/habits/[id]` + `/edit` + `/log`; promote `deleteAllHabitsForUser`): create → toggle today's completion → edit name → archive → delete.
- **4A-thought-record** (`/modules/cbt/history/[id]` or `/modules/cbt/new?recordId=`; cleanup `deleteAllThoughtRecordsForUser`): create → edit balanced thought → delete; confirm the history detail exposes edit/delete (else edit-only via the wizard param).

Run each: `E2E_REUSE_EXISTING_SERVER=1 npx playwright test <file> --reporter=list`. Commit per flow or in small groups.

---

## Batch 4B — High-value new flows (HIGH)

- **4B-act-defusion** (`/modules/act/defusion/new` → `/[id]` → list; cleanup `deleteAllActLogsForUser`): drive the defusion wizard, save, open the log detail, delete (ACT logs are delete-only) → redirected to the list, gone.
- **4B-cbt-belief** (`/modules/cbt/beliefs/new` → `/[id]` → `/beliefs`; cleanup `deleteAllCoreBeliefsForUser`): run the 3-step belief wizard, save, reopen in edit mode, change strength, save, delete.
- **4B-cbt-goal** (`/modules/cbt/goals/new` → `/[id]` → `/goals`; cleanup `deleteAllGoalsForUser`): create a goal with a milestone, mark milestone complete, edit goal, delete.
- **4B-password-reset** (`/(auth)/reset-password` → Mailpit `fetchRecoveryLink` → `/(auth)/update-password` → tabs): use a THROWAWAY user (`deleteUserByEmail`), request reset, pull the recovery link from Mailpit, set a new ≥12-char password, confirm authenticated, then sign in with the new password. Do NOT use seeded alice/bob/demo (it changes their password).
- **4B-gdpr-export** (`/(app)/(tabs)/settings`): tap "Export my data" (ExportDataButton); on web it calls `export_user_data` and triggers a JSON download — assert the success/exported confirmation appears (and optionally that a download started). Read-only RPC; no cleanup.
- **4B-account-deletion** (`/(app)/(tabs)/settings` → DeleteAccountModal): create a THROWAWAY user (like sign-up-onboarding), sign in, open Delete account, confirm, assert it signs out to the sign-in page AND the auth user is gone (`createServiceClient().auth.admin.listUsers`). NEVER run against seeded users.
- **4B-home-widgets** (`/(app)/(tabs)`; cleanup `resetWidgetPreferencesForUser`): tap the add (+) button → AddWidgetModal → add a non-default widget (assert it renders); enter edit mode, remove a widget via its close (x), reorder via the drag handle; assert membership + ordering persist across reload. Reorder via `Sortable.Flex` may need careful `dragTo`/mouse steps — if drag is too flaky, assert add+remove+persist and treat reorder as best-effort with a logged note.

---

## Batch 4C — Medium flows

- ACT expansion/urge-surf, connection/drop-anchor, committed-action+steps, values/bulls-eye (each: drive wizard/exercise, view, delete; cleanup `deleteAllActLogsForUser`).
- CBT exposure (hierarchy+items+session) and behavioral activities create+complete.
- Settings: language switch + theme (controls live in `src/components/app/user-menu.tsx` header popover, NOT the settings screen; theme is client-only), notification toggles (`/notifications`), profile display-name + reset-onboarding.

## Batch 4D — Low flows

- ACT observing-self & choice-point logs.
- CBT weekly-review read-only aggregate render (seed a week of rows via service client, assert the chart/counts).
- Settings theme switch (client-only, no DB cleanup).

---

## Finalize Phase 4

- [ ] Run the FULL e2e suite once with a fresh server (no reuse) to confirm CI-equivalence: `npm run test:e2e` — all green. (Slower; this is the authoritative run.)
- [ ] `npm run typecheck` — e2e files type-clean.
- [ ] Coverage note: e2e is not in the unit-coverage denominator; do not touch the ratchet baseline.

## Self-review checklist

- Spec coverage: §9.1 helpers (Task H); High flows (4A edit/delete + 4B); Med (4C); Low (4D).
- No placeholders: the mood worked example is full code; sibling tasks carry route paths + cleanup helper + the named pattern, and require reading the screen + i18n for exact labels.
- Every flow cleans up its rows (and throwaway users) so the suite is rerunnable; never mutate seeded users' passwords/data irreversibly.

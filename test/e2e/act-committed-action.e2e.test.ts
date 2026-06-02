import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/act/committed-action/new   - ActCommittedActionNewScreen (3-step wizard)
 *   /modules/act/committed-action/[id]  - ActCommittedActionDetailScreen
 *   /modules/act/committed-action       - ActCommittedActionListScreen
 *
 * Wizard steps (act.json > committedAction.steps):
 *   1. domain    - "Domain" - select a life domain (pressable chips)
 *   2. action    - "Action" - title (required), description, targetDate
 *   3. obstacles - "Obstacles" - obstacles textarea
 *
 * Detail affordances:
 *   - Status change buttons: "Mark complete" | "Mark active" | "Mark abandoned"
 *   - Add action step: TextInput with placeholder "Describe one small step..." + "Add" button
 *   - Toggle step: checkbox (accessibilityRole="checkbox") per step
 *   - Delete step: "Delete step" button (accessibilityLabel)
 *   - Delete action: "Delete" button → ConfirmDialog → getByTestId("confirm-dialog-confirm")
 *
 * NOTE: No "edit" affordance on the detail screen (no updateCommittedAction UI button).
 *       Status is changed via "Mark complete" / "Mark active" / "Mark abandoned" buttons.
 *
 * Cleanup: deleteAllActLogsForUser covers committed_actions + action_steps.
 */

test.describe("ACT committed action: create, add step, toggle step, change status, delete", () => {
  test.beforeEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });

  test("alice creates a committed action, adds a step, toggles it complete, changes status, and deletes", async ({
    page,
  }) => {
    const actionTitle = "Go for a 20-minute walk three times a week";
    const actionDescription = "Start with Monday, Wednesday, Friday mornings.";
    const obstaclesText = "Hooked by 'I don't have time' - unhook with defusion.";
    const stepText = "Put running shoes by the door tonight";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to new ────────────────────────────────────────────────────────
    await page.goto("/modules/act/committed-action/new");

    // ── Step 1: Domain ─────────────────────────────────────────────────────────
    // "Health & personal growth" maps to domain key "personalGrowth"
    await page.getByRole("button", { name: "Health & personal growth", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Action ─────────────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "What are you committing to?" }).fill(actionTitle);

    await page.getByRole("textbox", { name: "More detail (optional)" }).fill(actionDescription);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Obstacles ──────────────────────────────────────────────────────
    await page
      .getByRole("textbox", { name: "What might get in the way? (HARD barriers)" })
      .fill(obstaclesText);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save, router.replace to /modules/act/committed-action/[id]
    await expect(page).toHaveURL(/\/modules\/act\/committed-action\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(actionTitle).last()).toBeVisible({ timeout: 10_000 });

    // ── Add a step ─────────────────────────────────────────────────────────────
    await page.getByPlaceholder("Describe one small step...").fill(stepText);
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Step should now appear in the list
    await expect(page.getByText(stepText).last()).toBeVisible({ timeout: 10_000 });

    // ── Toggle step completion ─────────────────────────────────────────────────
    // The step renders as a div with role="checkbox" (accessibilityRole="checkbox").
    // RN-web renders accessibilityState.checked=true as aria-checked="true".
    await page.getByRole("checkbox").last().click();

    // Assert the step is completed: the progress label changes from "0/1" to "1/1"
    // and the toast "Step marked done" appears.
    await expect(page.getByText("1/1 steps done")).toBeVisible({ timeout: 10_000 });

    // ── Change action status to "Mark complete" ────────────────────────────────
    await page.getByRole("button", { name: "Mark complete", exact: true }).click();
    // Status pill should now show "Completed"
    await expect(page.getByText("Completed").last()).toBeVisible({ timeout: 10_000 });

    // ── Delete the action ──────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After delete, router.replace('/modules/act/committed-action') is called.
    await expect(page).toHaveURL(/\/modules\/act\/committed-action$/, { timeout: 15_000 });
    // The action should be gone from the list.
    await expect(page.getByText(actionTitle)).toBeHidden({ timeout: 10_000 });
  });
});

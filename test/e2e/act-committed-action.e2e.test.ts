import { expect, test } from "./fixtures";

import { deleteAllActLogsForUser } from "./helpers";

/**
 * Routes:
 *   /modules/act/committed-action/new   - ActCommittedActionNewScreen (3-step wizard)
 *   /modules/act/committed-action/[id]  - ActCommittedActionDetailScreen
 *   /modules/act/committed-action       - ActCommittedActionListScreen
 *
 * Wizard steps (act.json > committedAction.steps):
 *   1. domain    - "Domain" - select a life domain (pressable chips)
 *   2. action    - "Action" - title (required), description, targetDate (calendar field)
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
  test.beforeEach(async ({ user }) => {
    await deleteAllActLogsForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllActLogsForUser(user.id);
  });

  test("alice creates a committed action, adds a step, toggles it complete, changes status, and deletes", async ({
    page,
  }) => {
    const actionTitle = "Go for a 20-minute walk three times a week";
    const actionDescription = "Start with Monday, Wednesday, Friday mornings.";
    const obstaclesText = "Hooked by 'I don't have time' - unhook with defusion.";
    const stepText = "Put running shoes by the door tonight";

    // ── Navigate to new ────────────────────────────────────────────────────────
    await page.goto("/modules/act/committed-action/new");

    // ── Step 1: Domain ─────────────────────────────────────────────────────────
    // "Health & personal growth" maps to domain key "personalGrowth"
    await page.getByRole("radio", { name: "Health & personal growth", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Action ─────────────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "What are you committing to?" }).fill(actionTitle);

    await page.getByRole("textbox", { name: "More detail (optional)" }).fill(actionDescription);

    // ── Target date: a calendar, never a typed date ────────────────────────────
    // The field used to be a textarea over a Postgres `date` column, so typing
    // "next Tuesday" failed the whole save (#1303). Only a real browser can show
    // that neither a text box nor a native date widget is left here.
    const targetDateTrigger = page.getByRole("button", {
      name: /^Target date \(optional\): /,
    });
    await expect(page.getByRole("textbox", { name: "Target date (optional)" })).toHaveCount(0);
    await expect(page.locator('input[type="date"]')).toHaveCount(0);

    await targetDateTrigger.click();
    // Today by its own name rather than by a number, so the pick needs no
    // agreement between this process's clock and the browser's.
    await page
      .getByTestId("days")
      .getByRole("button", { name: /^Today, / })
      .click();
    await page.getByRole("button", { name: "Done", exact: true }).click();

    // Whatever the trigger now reads is what the detail screen must read too —
    // both go through `formatDayKey`. Comparing the two rendered strings makes
    // the assertion independent of locale and of the day the suite runs on.
    const triggerName = await targetDateTrigger.getAttribute("aria-label");
    // Whitespace-normalized to match how `getByText` compares, so an exotic
    // space out of Chrome's ICU cannot make the lookup below silently miss.
    const formattedTargetDate = (triggerName ?? "").split(": ")[1]?.replace(/\s+/g, " ").trim();
    expect(formattedTargetDate).toBeTruthy();
    // The stored `YYYY-MM-DD` is a wire format and must not be what is shown.
    expect(formattedTargetDate).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Obstacles ──────────────────────────────────────────────────────
    await page
      .getByRole("textbox", { name: "What might get in the way? (HARD barriers)" })
      .fill(obstaclesText);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save, router.replace to /modules/act/committed-action/[id]
    await expect(page).toHaveURL(/\/modules\/act\/committed-action\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(actionTitle).last()).toBeVisible({ timeout: 10_000 });
    // The save succeeded WITH a target date, and the detail screen reads it back
    // in the same shape the picker showed it.
    await expect(page.getByText(formattedTargetDate).last()).toBeVisible({ timeout: 10_000 });

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

import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllSleepLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("edit and delete a sleep log", () => {
  test.beforeEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
  });

  test("alice edits then deletes a sleep log", async ({ page }) => {
    const originalNotes = "Sleep e2e original notes";
    const updatedNotes = "Sleep e2e updated notes";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // Create: 8h duration, quality 3, with notes.
    await page.goto("/tools/sleep/new");
    // Duration button labels are like "8h" (computed from SLEEP_DURATION_OPTIONS).
    await page.getByRole("button", { name: "8h", exact: true }).click();
    // Quality buttons are 1–5 via NumberRating component.
    await page.getByRole("button", { name: "3", exact: true }).click();
    // log.notesPlaceholder = "Anything that affected your sleep?"
    await page.getByPlaceholder("Anything that affected your sleep?").fill(originalNotes);
    // log.save = "Save"
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to the detail page (/tools/sleep/[id]).
    await expect(page).toHaveURL(/\/tools\/sleep\/[^/]+$/, { timeout: 15_000 });

    // EDIT: detail.edit = "Edit"
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    // Change duration to 7h, quality to 4, update notes.
    await page.getByRole("button", { name: "7h", exact: true }).click();
    await page.getByRole("button", { name: "4", exact: true }).click();
    await page.getByPlaceholder("Anything that affected your sleep?").fill(updatedNotes);
    // log.update = "Update"
    await page.getByRole("button", { name: "Update", exact: true }).click();

    // After Update, app navigates back to the detail page.
    await expect(page).toHaveURL(/\/tools\/sleep\/[^/]+$/, { timeout: 15_000 });
    // Assert the edited notes value is visible on the detail screen.
    // Use .last() because router.replace keeps the previous detail instance in the stack with
    // display:none; the newly focused instance (last in DOM order) is the visible one.
    await expect(page.getByText(updatedNotes).last()).toBeVisible({ timeout: 15_000 });

    // DELETE: detail.delete = "Delete", detail.confirmDelete.confirm = "Delete"
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/tools\/sleep$/, { timeout: 15_000 });
  });
});

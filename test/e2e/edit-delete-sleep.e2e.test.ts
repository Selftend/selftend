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
    // Duration starts at the 7h 30m default; one +30 step makes it 8h.
    await page.getByRole("button", { name: "Add 30 minutes", exact: true }).click();
    // Quality is a 5-star control; tap the 3rd star.
    await page.getByRole("button", { name: "Rate 3 of 5", exact: true }).click();
    // log.notesPlaceholder = "Anything that affected your sleep?"
    await page.getByPlaceholder("Anything that affected your sleep?").fill(originalNotes);
    // log.save = "Save"
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to the detail page (/tools/sleep/[id]).
    await expect(page).toHaveURL(/\/tools\/sleep\/[^/]+$/, { timeout: 15_000 });

    // EDIT: detail.edit = "Edit"
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    // Change duration from 8h down to 7h (two -30 steps), quality to 4, update notes.
    await page.getByRole("button", { name: "Subtract 30 minutes", exact: true }).click();
    await page.getByRole("button", { name: "Subtract 30 minutes", exact: true }).click();
    await page.getByRole("button", { name: "Rate 4 of 5", exact: true }).click();
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

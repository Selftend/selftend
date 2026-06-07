import { expect, test } from "./fixtures";

import { deleteAllMoodLogsForUser } from "./helpers";

test.describe("edit and delete a mood log", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllMoodLogsForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllMoodLogsForUser(user.id);
  });

  test("alice edits then deletes a mood log", async ({ page }) => {
    // Create: score 3 ("OK") → emoji 😐
    await page.goto("/tools/mood-tracker/new");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("😐")).toBeVisible({ timeout: 15_000 });

    // EDIT: tap Edit, change to score 4 ("Good") → emoji 😊, then Update.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Good", exact: true }).click();
    await page.getByRole("button", { name: "Update", exact: true }).click();
    // After Update the app navigates back to the detail screen (/tools/mood-tracker/[id]).
    // The URL is the most reliable signal; just wait for it.
    await expect(page).toHaveURL(/\/tools\/mood-tracker\/[^/]+$/, { timeout: 15_000 });
    // Assert the edited value (score 4 → 😊) is visible on the detail screen.
    // Use .last() because router.replace keeps the previous detail instance in the stack with
    // display:none; the newly focused instance (last in DOM order) is the visible one.
    await expect(page.getByText("😊").last()).toBeVisible({ timeout: 15_000 });

    // DELETE: tap Delete → ConfirmDialog → confirm "Delete" → redirected to list, entry gone.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/tools\/mood-tracker$/, { timeout: 15_000 });
  });
});

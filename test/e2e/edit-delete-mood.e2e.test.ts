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
    // Create: score 3 ("Okay") → emoji 😐
    await page.goto("/tools/check-in/new");
    await page.getByRole("radio", { name: "Okay", exact: true }).click();
    await page.getByRole("button", { name: "Save check-in", exact: true }).click();
    await expect(page.getByText("😐")).toBeVisible({ timeout: 15_000 });

    // #901 regression: at wide widths the header's Edit and Delete must share a
    // height — a size="sm" Edit next to the size="icon" trash rendered 32px vs
    // 36px and the owner read the pair as a broken button. Jest cannot see
    // NativeWind layout, so the rendered-height check lives here.
    const shell = page.getByTestId("app-shell-page");
    const editBox = await shell.getByRole("button", { name: "Edit", exact: true }).boundingBox();
    const deleteBox = await shell
      .getByRole("button", { name: "Delete", exact: true })
      .boundingBox();
    expect(editBox?.height).toBe(deleteBox?.height);

    // EDIT: tap Edit, change to score 4 ("Good") → emoji 🙂, then Update.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Good", exact: true }).click();
    await page.getByRole("button", { name: "Update", exact: true }).click();
    // After Update the app navigates back to the detail screen (/tools/check-in/[id]).
    // The URL is the most reliable signal; just wait for it.
    await expect(page).toHaveURL(/\/tools\/check-in\/[^/]+$/, { timeout: 15_000 });
    // Assert the edited value (score 4 → 🙂) is visible on the detail screen.
    // Use .last() because router.replace keeps the previous detail instance in the stack with
    // display:none; the newly focused instance (last in DOM order) is the visible one.
    await expect(page.getByText("🙂").last()).toBeVisible({ timeout: 15_000 });

    // DELETE: tap Delete → ConfirmDialog → confirm "Delete" → redirected to list, entry gone.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/tools\/check-in$/, { timeout: 15_000 });
  });
});

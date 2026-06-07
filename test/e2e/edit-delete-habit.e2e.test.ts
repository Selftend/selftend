import { expect, test } from "./fixtures";

import { deleteAllHabitsForUser } from "./helpers";

test.describe("edit and delete a habit", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllHabitsForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllHabitsForUser(user.id);
  });

  test("alice creates, edits, archives, then deletes a daily habit", async ({ page }) => {
    const originalName = "E2E read one page daily";
    const editedName = "E2E meditate for two minutes";

    // --- CREATE ---
    await page.goto("/tools/habits/new");
    await page.getByPlaceholder("Read, Walk after lunch, Stretch...").fill(originalName);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save, detail screen renders the habit name as the heading.
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/tools\/habits\/[^/]+$/, { timeout: 15_000 });

    // --- TOGGLE TODAY'S COMPLETION ---
    // The calendar strip shows today's day cell. Today's cell has accessibilityLabel = today's
    // date string (YYYY-MM-DD) and starts unticked. Click it to tick, then assert checked=true.
    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    const todayCell = page.getByRole("button", { name: todayStr, exact: true });
    await expect(todayCell).toBeVisible({ timeout: 10_000 });
    // Assert the cell starts unticked before clicking.
    await expect(todayCell).not.toHaveClass(/bg-primary/, { timeout: 5_000 });
    await todayCell.click();
    // After toggling, the cell's CSS class changes to include the habit colour (bg-primary/20).
    // React Native Web renders accessibilityState checked, but in Playwright the attribute value
    // comes through as null rather than "true"; asserting the class change is more reliable.
    await expect(todayCell).toHaveClass(/bg-primary/, { timeout: 10_000 });

    // --- EDIT ---
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/habits\/[^/]+\/edit$/, { timeout: 10_000 });

    const nameInput = page.getByRole("textbox", { name: "Habit name" });
    await nameInput.clear();
    await nameInput.fill(editedName);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save, detail screen shows the new name.
    await expect(page).toHaveURL(/\/tools\/habits\/[^/]+$/, { timeout: 15_000 });
    // Use .last() in case router.replace leaves a hidden stale instance.
    await expect(page.getByText(editedName).last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(originalName)).toBeHidden({ timeout: 5_000 });

    // --- ARCHIVE ---
    // The detail screen has an "Archive" button that opens a ConfirmDialog.
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    // Both archive and delete ConfirmDialogs are mounted simultaneously. The archive dialog
    // is the first one (its confirm button reads "Archive"); click the visible one.
    await page
      .getByTestId("confirm-dialog-confirm")
      .filter({ hasText: /Archive/ })
      .click();
    // After archiving, the "Archived" badge appears in the header. Match it exactly
    // (so the archive dialog's body "Archived habits leave today's list…" is excluded)
    // and take .last() (so a hidden stale detail instance Expo Router keeps mounted
    // doesn't make the locator ambiguous) — same pattern as editedName above.
    await expect(page.getByText("Archived", { exact: true }).last()).toBeVisible({
      timeout: 10_000,
    });

    // --- DELETE ---
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    // The delete dialog's confirm button reads "Delete".
    await page
      .getByTestId("confirm-dialog-confirm")
      .filter({ hasText: /Delete/ })
      .click();

    // After deletion, redirected to the habits list.
    await expect(page).toHaveURL(/\/tools\/habits$/, { timeout: 15_000 });

    // The edited habit name must not appear in the list.
    await expect(page.getByText(editedName)).toBeHidden({ timeout: 5_000 });
  });
});

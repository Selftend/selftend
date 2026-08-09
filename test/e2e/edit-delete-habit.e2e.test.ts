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
    // The calendar strip shows today's day cell. Its accessible name is the
    // locale-formatted date (screen readers no longer hear the raw YYYY-MM-DD
    // key - #468), role="checkbox", and it starts unticked. Click it to tick.
    const todayLabel = new Intl.DateTimeFormat("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
    const todayCell = page.getByRole("checkbox", { name: todayLabel, exact: true });
    await expect(todayCell).toBeVisible({ timeout: 10_000 });
    // Assert the cell starts unticked before clicking (aria-checked comes from the
    // aria-checked prop, which react-native-web forwards to the DOM).
    await expect(todayCell).not.toBeChecked({ timeout: 5_000 });
    await todayCell.click();
    // Assert the SEMANTIC state, not the class. Habit colours are now a token
    // alias applied as inline style (chip.fill / chip.ink), so no `bg-primary`
    // class exists to match - and aria-checked is what a screen reader reads
    // anyway. The visual encoding is covered at unit level in
    // habits-home-screen.test.tsx via StyleSheet.flatten.
    await expect(todayCell).toBeChecked({ timeout: 10_000 });

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
    // Archive and Delete moved behind the `more_horiz` overflow menu (#761), so
    // a destructive action no longer sits in the same row as "Edit". The menu
    // item opens the same ConfirmDialog the old top-level button did.
    await page.getByRole("button", { name: "More actions", exact: true }).click();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    // Both archive and delete ConfirmDialogs are mounted simultaneously. The archive dialog
    // is the first one (its confirm button reads "Archive"); click the visible one.
    await page
      .getByTestId("confirm-dialog-confirm")
      .filter({ hasText: /Archive/ })
      .click();
    // After archiving, the "Archived" badge appears in the header. Match it exactly
    // (so the archive dialog's body "Archived habits leave today's list..." is excluded)
    // and take .last() (so a hidden stale detail instance Expo Router keeps mounted
    // doesn't make the locator ambiguous) - same pattern as editedName above.
    await expect(page.getByText("Archived", { exact: true }).last()).toBeVisible({
      timeout: 10_000,
    });

    // --- DELETE ---
    // The menu closes when its item fires, so it has to be reopened. It now
    // offers "Restore" where it offered "Archive", which is the archive having
    // landed on the server rather than only in the header badge.
    await page.getByRole("button", { name: "More actions", exact: true }).click();
    await expect(page.getByRole("button", { name: "Restore", exact: true })).toBeVisible({
      timeout: 5_000,
    });
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

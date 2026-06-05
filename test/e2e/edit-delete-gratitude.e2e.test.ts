import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllGratitudeEntriesForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("edit and delete a gratitude entry", () => {
  test.beforeEach(async () => {
    await deleteAllGratitudeEntriesForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllGratitudeEntriesForUser(SEED_USERS.alice.id);
  });

  test("alice creates, favorites, edits, then deletes a gratitude entry", async ({ page }) => {
    const originalItem = "Morning walk in the sun";
    const editedItem = "Evening walk with the dog";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // --- CREATE ---
    await page.goto("/tools/gratitude-log/new");
    await page.getByRole("textbox", { name: "What made you laugh?" }).fill(originalItem);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save, detail screen shows the original item.
    await expect(page.getByText(originalItem)).toBeVisible({ timeout: 15_000 });

    // --- FAVORITE ---
    // The detail screen has a "Favorite" button (unfavorited state); clicking it stars the entry.
    await page.getByRole("button", { name: "Favorite", exact: true }).click();
    // Toast "Added to favorites" appears (best-effort check; detail stays on screen).
    await expect(page.getByRole("button", { name: "Favorited", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to favorites list and confirm the entry appears there.
    await page.goto("/tools/gratitude-log/favorites");
    await expect(page.getByText(originalItem)).toBeVisible({ timeout: 10_000 });

    // --- EDIT ---
    // Go back to the detail screen (from the favorites list) or navigate directly.
    await page.goBack();
    // We should be on the detail screen URL /tools/gratitude-log/<id>
    await expect(page).toHaveURL(/\/tools\/gratitude-log\/[^/]+$/, { timeout: 10_000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    // Editor screen opens at /tools/gratitude-log/<id>/edit
    await expect(page).toHaveURL(/\/tools\/gratitude-log\/[^/]+\/edit$/, { timeout: 10_000 });

    // Clear the first gratitude field and type the new value.
    const firstInput = page.getByRole("textbox", { name: "What made you laugh?" });
    await firstInput.clear();
    await firstInput.fill(editedItem);

    await page.getByRole("button", { name: "Update", exact: true }).click();

    // After update, detail screen shows the edited value.
    await expect(page).toHaveURL(/\/tools\/gratitude-log\/[^/]+$/, { timeout: 15_000 });
    // Use .last() because router.replace may leave a hidden previous instance in the DOM.
    await expect(page.getByText(editedItem).last()).toBeVisible({ timeout: 15_000 });

    // Original value should no longer be visible.
    await expect(page.getByText(originalItem)).toBeHidden({ timeout: 5_000 });

    // --- DELETE ---
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After deletion, redirected to the gratitude log list.
    await expect(page).toHaveURL(/\/tools\/gratitude-log$/, { timeout: 15_000 });

    // The edited item must not appear in the list.
    await expect(page.getByText(editedItem)).toBeHidden({ timeout: 5_000 });
  });
});

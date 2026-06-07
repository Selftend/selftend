import { expect, test } from "./fixtures";

import { deleteAllJournalEntriesForUser } from "./helpers";

test.describe("edit and delete a journal entry", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test("alice edits then deletes a journal entry", async ({ page }) => {
    const originalTitle = "Original journal title";
    const originalBody = "This is the original body.";
    const updatedTitle = "Updated journal title";
    const updatedBody = "This is the updated body.";

    // Create via the new-entry form.
    await page.goto("/tools/journal/new");
    // editor.titlePlaceholder = "Untitled", editor.bodyPlaceholder = "Write what's on your mind."
    await page.getByPlaceholder("Untitled").fill(originalTitle);
    await page.getByPlaceholder("Write what's on your mind.").fill(originalBody);
    // editor.save = "Save"
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to /tools/journal/[id] - detail screen.
    await expect(page).toHaveURL(/\/tools\/journal\/[^/]+$/, { timeout: 15_000 });

    // EDIT: detail.edit = "Edit"
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    // editor.update = "Update" (used when editMode=true)
    await page.getByPlaceholder("Untitled").fill(updatedTitle);
    await page.getByPlaceholder("Write what's on your mind.").fill(updatedBody);
    await page.getByRole("button", { name: "Update", exact: true }).click();

    // After Update, app replaces to the detail page. The URL is the primary signal.
    await expect(page).toHaveURL(/\/tools\/journal\/[^/]+$/, { timeout: 15_000 });
    // Assert the edited values are visible on the detail screen.
    // Use .last() because router.replace keeps the previous detail instance in the stack with
    // display:none; the newly focused instance (last in DOM order) is the visible one.
    await expect(page.getByText(updatedTitle).last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(updatedBody).last()).toBeVisible({ timeout: 15_000 });

    // DELETE: detail.delete = "Delete", detail.confirmDelete.confirm = "Delete"
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page).toHaveURL(/\/tools\/journal$/, { timeout: 15_000 });
    // The updated body should not appear on the list screen.
    await expect(page.getByText(updatedBody)).toBeHidden({ timeout: 10_000 });
  });
});

import { expect, test } from "./fixtures";

import { deleteAllThoughtRecordsForUser } from "./helpers";

test.describe("edit and delete a thought record", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllThoughtRecordsForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllThoughtRecordsForUser(user.id);
  });

  test("alice creates a thought record, edits the balanced thought, then deletes it", async ({
    page,
  }) => {
    const situation =
      "I noticed my heart racing before a routine team meeting and started bracing for criticism.";
    const automaticThought = "They are going to call me out for not delivering enough.";
    const originalBalancedThought =
      "Most meetings are routine status updates; I have no specific evidence of a problem yet.";
    const editedBalancedThought =
      "I can ask for clarification if needed; one meeting is not proof of failure.";

    const balancedThoughtInput = page.getByPlaceholder(
      "Example: I do not know what the email means yet. One message is not proof that I failed.",
    );

    // --- CREATE via the one-column form (#1381) ---
    await page.goto("/modules/cbt/new");
    // Dismiss cookie banner if it reappears.
    await page
      .getByRole("button", { name: "Essential only", exact: true })
      .click({ timeout: 2_000 })
      .catch(() => undefined);

    // Every part is on screen at once - fill straight down the column.
    await page
      .getByPlaceholder(
        "Example: I saw an email from my manager and my chest tightened immediately.",
      )
      .fill(situation);
    await page.getByPlaceholder("What did your mind say?").fill(automaticThought);
    await page.getByRole("button", { name: "Add thought", exact: true }).click();
    await page.getByText("Anxious", { exact: true }).first().click();
    await page.getByRole("checkbox", { name: "Catastrophising", exact: true }).click();
    await balancedThoughtInput.fill(originalBalancedThought);
    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // A NEW record lands on the calm closing moment first; "View record" reaches detail.
    await expect(page.getByText("You examined a thought.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "View record", exact: true }).click();

    // After that, detail screen shows the record at /modules/cbt/history/<id>.
    await expect(page).toHaveURL(/\/modules\/cbt\/history\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(originalBalancedThought)).toBeVisible({ timeout: 15_000 });

    // --- EDIT ---
    // The detail screen has an "Edit record" button that re-opens the column prefilled.
    await page.getByRole("button", { name: "Edit record", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/cbt\/new/, { timeout: 15_000 });

    // The balanced thought is right there - no steps to walk through.
    await expect(balancedThoughtInput).toHaveValue(originalBalancedThought, { timeout: 15_000 });
    await balancedThoughtInput.clear();
    await balancedThoughtInput.fill(editedBalancedThought);
    await page.getByRole("button", { name: "Save record", exact: true }).click();

    // After save, detail screen reflects the edited balanced thought.
    await expect(page).toHaveURL(/\/modules\/cbt\/history\/[^/]+$/, { timeout: 15_000 });
    // Use .last() in case router.replace leaves a hidden stale instance.
    await expect(page.getByText(editedBalancedThought).last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(originalBalancedThought)).toBeHidden({ timeout: 5_000 });

    // --- DELETE (#1384: the button says Delete; the mutation still soft-archives) ---
    // The thought-record detail screen exposes "Edit record" and "Delete" buttons.
    // Delete asks for confirmation first (#474) - the first tap only opens the dialog.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Delete this record")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("confirm-dialog-confirm").click();

    // After the delete, redirected to /modules/cbt/history.
    await expect(page).toHaveURL(/\/modules\/cbt\/history/, { timeout: 15_000 });

    // The archived record is excluded from the useThoughtRecords query (archived_at IS NULL).
    // The history screen's empty-state text confirms no records are listed.
    // (router.replace may leave hidden stale instances in the DOM stack; asserting the
    //  empty-state text appears is more reliable than asserting the edited thought is hidden.)
    await expect(page.getByText("No records on this day")).toBeVisible({ timeout: 10_000 });
  });
});

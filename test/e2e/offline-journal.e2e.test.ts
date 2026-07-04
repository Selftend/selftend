import { expect, test } from "./fixtures";

import { deleteAllJournalEntriesForUser } from "./helpers";

test.describe("offline journal save", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test("save fails visibly offline, keeps the draft, and succeeds after reconnect", async ({
    page,
  }) => {
    const title = "Offline test title";
    const body = "Written while the network was down.";

    await page.goto("/tools/journal/new");
    await page.getByPlaceholder("Untitled").fill(title);
    await page.getByPlaceholder("Write what's on your mind.").fill(body);

    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // The journal editor shows its own inline save-error message (not a toast -
    // its mutation sets suppressGlobalErrorToast). Spec wording said "toast";
    // inline persistent error text satisfies the same no-silent-failure intent.
    await expect(page.getByText(/couldn't save your entry/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // The offline banner is showing.
    await expect(page.getByText(/you're offline/i)).toBeVisible();

    // The draft survived — nothing was cleared, no navigation happened.
    await expect(page.getByPlaceholder("Untitled")).toHaveValue(title);
    await expect(page.getByPlaceholder("Write what's on your mind.")).toHaveValue(body);

    await page.context().setOffline(false);
    await expect(page.getByText(/you're offline/i)).toBeHidden({ timeout: 10_000 });

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});

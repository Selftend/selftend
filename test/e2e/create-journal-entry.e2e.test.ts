import { expect, test } from "./fixtures";

import { deleteAllJournalEntriesForUser } from "./helpers";

test.describe("create journal entry", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test("alice writes a journal entry and sees it on the detail screen and in the list", async ({
    page,
  }) => {
    const title = "Test journal title";
    const body = "This is the journal body.";

    await page.goto("/tools/journal/new");

    await page.getByPlaceholder("Untitled").fill(title);
    await page.getByPlaceholder("Write what's on your mind.").fill(body);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to the detail page.
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(body)).toBeVisible();

    // The entry also appears in the journal list. A today entry renders both in
    // the "Today" day card and the full History list, so the title matches twice
    // (see JournalListScreen + journal-list-screen.test.tsx) - assert the first.
    await page.goto("/tools/journal");
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });
  });
});

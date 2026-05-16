import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllGratitudeEntriesForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("create gratitude entry", () => {
  test.beforeEach(async () => {
    await deleteAllGratitudeEntriesForUser(SEED_USERS.alice.id);
  });

  test.afterEach(async () => {
    await deleteAllGratitudeEntriesForUser(SEED_USERS.alice.id);
  });

  test("alice logs a gratitude item and sees it on the detail screen and in the list", async ({
    page,
  }) => {
    const item = "Morning coffee";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/tools/gratitude-log/new");

    await page.getByPlaceholder("A small thing that mattered.").first().fill(item);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to the detail page.
    await expect(page.getByText(item)).toBeVisible({ timeout: 15_000 });

    // The entry also appears in the gratitude list.
    await page.goto("/tools/gratitude-log");
    await expect(page.getByText(item)).toBeVisible({ timeout: 10_000 });
  });
});

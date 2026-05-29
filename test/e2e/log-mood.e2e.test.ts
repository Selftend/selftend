import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllMoodLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("log mood", () => {
  test.beforeEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
  });

  test.afterEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
  });

  test("alice logs a neutral mood and sees it on the detail screen and in the list", async ({
    page,
  }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/tools/mood-tracker/new");

    // Pick score 3 ("OK") on the mood scale - accessible label comes from
    // mood:checkin.scaleLabels.3.
    await page.getByRole("button", { name: "OK", exact: true }).click();

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to the detail page. The neutral emoji is the
    // most stable identifier for the saved score.
    await expect(page.getByText("😐")).toBeVisible({ timeout: 15_000 });

    // The entry also appears on the tracker list.
    await page.goto("/tools/mood-tracker");
    await expect(page.getByText("😐")).toBeVisible({ timeout: 10_000 });
  });
});

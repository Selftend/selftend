import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllSleepLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

test.describe("log sleep", () => {
  test.beforeEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
  });

  test.afterEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
  });

  test("alice logs sleep and sees it on the detail screen and in the list", async ({ page }) => {
    const notes = "Sleep e2e notes";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // Go directly to the log form - bypasses the sleep tracker's onboarding gate.
    await page.goto("/tools/sleep/new");

    // Duration starts at the 7h 30m default; one +30 step makes it 8h (480 min).
    await page.getByRole("button", { name: "Add 30 minutes", exact: true }).click();
    // Quality is a 5-star control; tap the 4th star.
    await page.getByRole("button", { name: "Rate 4 of 5", exact: true }).click();
    await page.getByPlaceholder("Anything that affected your sleep?").fill(notes);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app redirects to the detail page; the notes string is the
    // most stable identifier for the saved entry.
    await expect(page.getByText(notes)).toBeVisible({ timeout: 15_000 });

    // The entry also appears on the sleep list.
    await page.goto("/tools/sleep");
    await expect(page.getByText("8h")).toBeVisible({ timeout: 10_000 });
  });
});

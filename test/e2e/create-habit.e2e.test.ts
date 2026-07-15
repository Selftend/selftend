import { expect, test } from "./fixtures";

import { deleteAllHabitsForUser, dismissPostSignInModals } from "./helpers";

test.describe("create habit", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllHabitsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllHabitsForUser(user.id);
  });

  test("alice creates a daily habit and sees it on the detail screen and in the list", async ({
    page,
  }) => {
    const habitName = "E2E read one page";

    // Navigate directly to the editor - bypasses the home-screen onboarding gate.
    await page.goto("/tools/habits/new");

    // A prior spec's trailing preferences write can leave this worker user with a
    // stale policy_version_accepted at boot; the consent gate then hijacks the
    // deep link to "/". Clear any gates (no-op when absent), then deep-link again.
    await dismissPostSignInModals(page);
    await page.goto("/tools/habits/new");

    await page.getByPlaceholder("Read, Walk after lunch, Stretch...").fill(habitName);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save the app routes to /tools/habits/[id]. The habit name is the
    // most stable identifier on the detail page.
    await expect(page.getByText(habitName)).toBeVisible({ timeout: 15_000 });

    // The habit also appears on the home/list screen.
    await page.goto("/tools/habits");
    await expect(page.getByText(habitName)).toBeVisible({ timeout: 10_000 });
  });
});

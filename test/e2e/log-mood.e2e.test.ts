import { expect, test } from "./fixtures";

import { deleteAllMoodLogsForUser } from "./helpers";

test.describe("log mood", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllMoodLogsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllMoodLogsForUser(user.id);
  });

  test("alice logs a neutral mood and sees it on the detail screen and in the list", async ({
    page,
  }) => {
    await page.goto("/tools/mood-tracker/new");

    // Pick score 3 ("OK") on the mood scale - accessible label comes from
    // mood:checkin.scaleLabels.3.
    await page.getByRole("radio", { name: "OK", exact: true }).click();

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Wait for the post-save redirect to the entry detail page before asserting.
    // The editor form renders its own 😐 radio, so a bare 😐 check can pass while
    // still on /new — and navigating away then races the in-flight router.replace,
    // which can land the browser back on the detail page after the goto.
    await page.waitForURL(/\/tools\/mood-tracker\/(?!new$)[^/]+$/, { timeout: 15_000 });

    // The detail page shows the saved score's emoji.
    await expect(page.getByText("😐")).toBeVisible({ timeout: 15_000 });

    // The entry also appears on the tracker list. Navigate via the sidebar link
    // (client-side) rather than page.goto(): the save-redirect's history updates
    // can still be settling, and a hard goto racing a same-document navigation is
    // resolved by Playwright as same-document — the list never loads.
    // (.first() = the sidebar nav link; the detail breadcrumb also exposes a
    // "Check-in" link and either would do, but strict mode needs one.)
    await page.getByRole("link", { name: "Check-in" }).first().click();
    await expect(page).toHaveURL(/\/tools\/mood-tracker$/);

    // Scope to the history entry row: the check-in card's mood scale always
    // renders a 😐 radio on this screen, so a bare getByText("😐") matches 2
    // elements once the list paints (strict-mode violation).
    await expect(
      page.getByRole("button", { name: /View mood entry from/ }).getByText("😐"),
    ).toBeVisible({ timeout: 10_000 });
  });
});

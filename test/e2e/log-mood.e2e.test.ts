import { expect, test } from "./fixtures";

import { deleteAllMoodLogsForUser } from "./helpers";

test.describe("log mood", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllMoodLogsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllMoodLogsForUser(user.id);
  });

  test("alice logs a neutral mood and sees it on the detail screen and in all history", async ({
    page,
  }) => {
    await page.goto("/tools/check-in/new");

    // Pick score 3 ("Okay") on the mood scale - accessible label comes from
    // mood:checkin.scaleLabels.3.
    await page.getByRole("radio", { name: "Okay", exact: true }).click();

    await page.getByRole("button", { name: "Save check-in", exact: true }).click();

    // Wait for the post-save redirect to the entry detail page before asserting.
    // The editor form renders its own 😐 radio, so a bare 😐 check can pass while
    // still on /new — and navigating away then races the in-flight router.replace,
    // which can land the browser back on the detail page after the goto.
    await page.waitForURL(/\/tools\/check-in\/(?!new$)[^/]+$/, { timeout: 15_000 });

    // The detail page shows the saved score's emoji.
    await expect(page.getByText("😐")).toBeVisible({ timeout: 15_000 });

    // The overview carries no entry list of its own (#735): the week strip is
    // check-in's recency view, and past entries live on the all-history screen.
    // Navigate via the sidebar link (client-side) rather than page.goto(): the
    // save-redirect's history updates can still be settling, and a hard goto
    // racing a same-document navigation is resolved by Playwright as
    // same-document — the page never loads.
    // (.first() = the sidebar nav link; the detail breadcrumb also exposes a
    // "Check-in" link and either would do, but strict mode needs one.)
    await page.getByRole("link", { name: "Check-in" }).first().click();
    await expect(page).toHaveURL(/\/tools\/check-in$/);

    // The overview states the entry once, through the picker — no list echoes it.
    await expect(page.getByRole("button", { name: /View mood entry from/ })).toHaveCount(0);

    // The one route to the entry: the week row's link to all history.
    await page.getByRole("link", { name: /Show all history/ }).click();
    await expect(page).toHaveURL(/\/tools\/check-in\/history$/);

    // Scope to the entry row rather than a bare 😐 — the row names the score
    // word and the time (mood:allHistory.viewEntry).
    await expect(
      page.getByRole("button", { name: /View Okay check-in from/ }).getByText("😐"),
    ).toBeVisible({ timeout: 10_000 });
  });
});

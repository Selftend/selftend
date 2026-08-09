import { expect, test } from "./fixtures";

import { deleteAllSleepLogsForUser } from "./helpers";

test.describe("log sleep", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllSleepLogsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllSleepLogsForUser(user.id);
  });

  test("alice logs sleep and sees it on the detail screen and in the list", async ({ page }) => {
    const notes = "Sleep e2e notes";

    // Go directly to the log form - bypasses the sleep tracker's onboarding gate.
    await page.goto("/tools/sleep/new");

    // Duration starts at the 7h 30m default; one +30 step makes it 8h (480 min).
    await page.getByRole("button", { name: "Add 30 minutes", exact: true }).click();
    // Quality is five named options (#774); "Good" is the stored 4.
    await page.getByRole("radio", { name: "Good", exact: true }).click();
    await page.getByPlaceholder("Anything that affected your sleep?").fill(notes);

    // log.save = "Save night"
    await page.getByRole("button", { name: "Save night", exact: true }).click();

    // Wait for the post-save redirect to the detail page (log-mood lesson):
    // the form's own textarea also carries the notes text, so a bare text
    // check can pass while still on /new - and the goto below then aborts the
    // in-flight insert (#172: the trace showed the POST cancelled and the
    // list correctly reading []). Ids are UUIDs, so a "new" segment can only
    // be the editor itself.
    await expect(page).toHaveURL(/\/tools\/sleep\/(?!new)[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(notes)).toBeVisible({ timeout: 15_000 });

    // The entry also appears on the sleep list.
    await page.goto("/tools/sleep");
    await expect(page.getByText("8h").first()).toBeVisible({ timeout: 10_000 });
  });
});

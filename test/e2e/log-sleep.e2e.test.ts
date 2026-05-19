import { expect, test } from "@playwright/test";

import { SEED_USERS, createServiceClient, dismissPostSignInModals, signInAsViaUi } from "./helpers";

async function deleteAllSleepLogsForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("sleep_logs").delete().eq("user_id", userId);
}

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

    // Go directly to the log form — bypasses the sleep tracker's onboarding gate.
    await page.goto("/tools/sleep/new");

    // Pick 8 hours (480 min) duration and quality 4.
    await page.getByRole("button", { name: "8h", exact: true }).click();
    await page.getByRole("button", { name: "4", exact: true }).click();
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

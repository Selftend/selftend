import { expect, test } from "@playwright/test";

import { SEED_USERS, createServiceClient, dismissPostSignInModals, signInAsViaUi } from "./helpers";

async function deleteAllMeditationSessionsForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("meditation_sessions").delete().eq("user_id", userId);
}

test.describe("log meditation session", () => {
  test.beforeEach(async () => {
    await deleteAllMeditationSessionsForUser(SEED_USERS.alice.id);
  });

  test.afterEach(async () => {
    await deleteAllMeditationSessionsForUser(SEED_USERS.alice.id);
  });

  test("alice logs a meditation session with the skip-reflection flow", async ({ page }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // The log route accepts a ?duration= query param. Going to it directly
    // bypasses the timer/pre-sit screens and lets us drive the form straight.
    await page.goto("/tools/meditation/session/log?duration=10");

    // "Skip reflection" saves with all fields blank and then routes back to /tools/meditation.
    await page.getByRole("button", { name: "Skip reflection", exact: true }).click();

    // After save the app redirects to /tools/meditation. Look for a stable
    // element on the meditation home — its title.
    await expect(page).toHaveURL(/\/tools\/meditation/, { timeout: 15_000 });

    // Verify a row landed in the database (visible across UI listings).
    const admin = createServiceClient();
    const result = await admin
      .from("meditation_sessions")
      .select("duration_minutes, stage_at_session")
      .eq("user_id", SEED_USERS.alice.id);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].duration_minutes).toBe(10);
  });
});

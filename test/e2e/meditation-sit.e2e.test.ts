import { expect, test } from "./fixtures";

import { createServiceClient } from "./helpers";

async function deleteAllMeditationSessionsForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("meditation_sessions").delete().eq("user_id", userId);
}

test.describe("meditation sit", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllMeditationSessionsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllMeditationSessionsForUser(user.id);
  });

  test("finishing early records the sit; Skip leaves it intact (#786)", async ({ page, user }) => {
    // The sit route takes its setup as query params, which is exactly how the
    // overview's Begin hands them over - going to it directly skips the wait.
    await page.goto("/tools/meditation/session?duration=1&bell=0");

    // The sit starts on focus; finishing early records the elapsed time
    // (floored to one minute) BEFORE the reflection is offered.
    await page.getByRole("button", { name: "Finish early", exact: true }).click();

    // The reflection opens over an already-saved row - its copy says so.
    await expect(page.getByText("Saved already — the rest is only if it's useful.")).toBeVisible();

    // Skip writes nothing further and returns to the overview.
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/meditation$/, { timeout: 15_000 });

    const admin = createServiceClient();
    const result = await admin
      .from("meditation_sessions")
      .select("duration_minutes, obstacle_tags, reflection")
      .eq("user_id", user.id);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].duration_minutes).toBe(1);
    expect(result.data?.[0].obstacle_tags).toEqual([]);
    expect(result.data?.[0].reflection).toBe("");
  });

  test("saving the reflection updates the recorded row rather than creating one", async ({
    page,
    user,
  }) => {
    await page.goto("/tools/meditation/session?duration=1&bell=0");
    await page.getByRole("button", { name: "Finish early", exact: true }).click();
    await expect(page.getByText("Saved already — the rest is only if it's useful.")).toBeVisible();

    await page.getByTestId("sit-pull-resistance").click();
    await page.getByPlaceholder("Anything worth noting?").fill("Noisy street, sat anyway.");
    await page.getByRole("button", { name: "Save reflection", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/meditation$/, { timeout: 15_000 });

    const admin = createServiceClient();
    const result = await admin
      .from("meditation_sessions")
      .select("duration_minutes, obstacle_tags, reflection")
      .eq("user_id", user.id);
    expect(result.error).toBeNull();
    // One row: the reflection is an UPDATE of the sit the timer saved.
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].obstacle_tags).toEqual(["resistance"]);
    expect(result.data?.[0].reflection).toBe("Noisy street, sat anyway.");
  });
});

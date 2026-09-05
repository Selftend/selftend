import { expect, test } from "./fixtures";

import { createServiceClient, deleteAllFavoritesForUser } from "./helpers";

/**
 * The skip half of the one-panel introduction (#1958). `sign-up-onboarding.e2e`
 * walks the finish half on a brand-new account; this one covers what only a skip
 * decides - `app_onboarding_completed_via = 'skip'` - and that a skip changes
 * nothing on Home: Favourites stay empty over the full catalogue, and the
 * introduction does not come back on reload. Kept as its own spec because the
 * finish spec cannot observe the skip path at all.
 */
test.describe("onboarding skip", () => {
  test.beforeEach(async ({ user }) => {
    const admin = createServiceClient();
    // Home reads `favorites` since #1956; a row left by another spec would fill the
    // Favourites section this test asserts empty.
    await deleteAllFavoritesForUser(user.id);
    const { error } = await admin
      .from("user_preferences")
      .update({
        app_onboarding_completed: false,
        app_onboarding_completed_via: null,
        app_onboarding_completed_at: null,
      })
      .eq("user_id", user.id);
    if (error) throw new Error(`Unable to prepare onboarding state: ${error.message}`);
  });

  test.afterEach(async ({ user }) => {
    const admin = createServiceClient();
    await deleteAllFavoritesForUser(user.id);
    const { error } = await admin
      .from("user_preferences")
      .update({ app_onboarding_completed: true, app_onboarding_completed_via: null })
      .eq("user_id", user.id);
    if (error) throw new Error(`Unable to restore onboarding state: ${error.message}`);
  });

  test("skip persists as 'skip', leaves Favourites empty, and does not appear again after reload", async ({
    page,
    user,
  }) => {
    await page.goto("/(app)");
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // The pinned Escape wears the word (#1258 M2): it is the one close in the app
    // with a lasting consequence, and the footer no longer duplicates it.
    await expect(page.getByRole("button", { name: "Skip for now", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Skip for now", exact: true }).click();
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeHidden({
      timeout: 15_000,
    });
    // The empty-Favourites line (#1956): one quiet sentence, no box, no door. The
    // catalogue below it renders regardless, so a skip changes nothing here.
    await expect(page.getByText("Star a tool or a module to keep it here.")).toBeVisible();
    await expect(page.getByTestId("home-tools").locator('[data-testid^="card-tool-"]')).toHaveCount(
      8,
    );

    const admin = createServiceClient();
    const [favorites, preferences] = await Promise.all([
      admin.from("favorites").select("kind, key").eq("user_id", user.id),
      admin
        .from("user_preferences")
        .select(
          "app_onboarding_completed, app_onboarding_completed_via, app_onboarding_completed_at",
        )
        .eq("user_id", user.id)
        .single(),
    ]);
    expect(favorites.error).toBeNull();
    expect(favorites.data).toEqual([]);
    expect(preferences.error).toBeNull();
    // All three fields, never the flag alone (#1958) — why is on
    // `finishAppOnboarding` in src/components/app/protected-layout.tsx.
    expect(preferences.data).toMatchObject({
      app_onboarding_completed: true,
      app_onboarding_completed_via: "skip",
    });
    expect(preferences.data?.app_onboarding_completed_at).toEqual(expect.any(String));

    await page.reload();
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeHidden();
    await expect(page.getByText("Star a tool or a module to keep it here.")).toBeVisible();
  });
});

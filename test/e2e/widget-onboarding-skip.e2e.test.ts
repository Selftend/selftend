import { expect, test } from "./fixtures";

import {
  createServiceClient,
  deleteAllFavoritesForUser,
  resetWidgetPreferencesForUser,
} from "./helpers";

test.describe("widget onboarding skip", () => {
  test.beforeEach(async ({ user }) => {
    const admin = createServiceClient();
    await resetWidgetPreferencesForUser(user.id);
    // Home reads `favorites` since #1956; a row left by another spec would fill the
    // Favourites section this test asserts empty.
    await deleteAllFavoritesForUser(user.id);
    const { error } = await admin
      .from("user_preferences")
      .update({
        app_onboarding_completed: false,
        app_onboarding_completed_via: null,
        app_onboarding_completed_at: null,
        widgets_seeded: false,
      })
      .eq("user_id", user.id);
    if (error) throw new Error(`Unable to prepare onboarding state: ${error.message}`);
  });

  test.afterEach(async ({ user }) => {
    const admin = createServiceClient();
    await resetWidgetPreferencesForUser(user.id);
    await deleteAllFavoritesForUser(user.id);
    const { error } = await admin
      .from("user_preferences")
      .update({ app_onboarding_completed: true, app_onboarding_completed_via: null })
      .eq("user_id", user.id);
    if (error) throw new Error(`Unable to restore onboarding state: ${error.message}`);
  });

  test("skip leaves Favourites empty and does not appear again after reload", async ({
    page,
    user,
  }) => {
    await page.goto("/(app)");
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Skip for now", exact: true }).click();
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeHidden({
      timeout: 15_000,
    });
    // The empty-Favourites line (#1956): one quiet sentence, no box, no door. The
    // catalogue below it renders regardless, so this is the only thing a skip changes.
    await expect(page.getByText("Star a tool or a module to keep it here.")).toBeVisible();

    const admin = createServiceClient();
    const [widgets, favorites, preferences] = await Promise.all([
      admin.from("widget_preferences").select("widget_id").eq("user_id", user.id),
      admin.from("favorites").select("kind, key").eq("user_id", user.id),
      admin
        .from("user_preferences")
        .select("app_onboarding_completed, app_onboarding_completed_via, widgets_seeded")
        .eq("user_id", user.id)
        .single(),
    ]);
    expect(widgets.error).toBeNull();
    expect(widgets.data).toEqual([]);
    expect(favorites.error).toBeNull();
    expect(favorites.data).toEqual([]);
    expect(preferences.error).toBeNull();
    expect(preferences.data).toMatchObject({
      app_onboarding_completed: true,
      app_onboarding_completed_via: "skip",
      widgets_seeded: true,
    });

    await page.reload();
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeHidden();
    await expect(page.getByText("Star a tool or a module to keep it here.")).toBeVisible();
  });
});

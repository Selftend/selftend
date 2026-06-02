/**
 * Settings preferences e2e - language switch + theme switch.
 *
 * Language: driven by AsyncStorage ("selftend:language") which is seeded from
 * user_preferences.language via useSettingsSync on first load. Changing it in
 * the UI writes to both AsyncStorage and user_preferences.language (via the
 * sync hook). After DB-restore the next page load re-syncs from DB → localStorage.
 *
 * Theme: driven by AsyncStorage ("selftend:theme") synced to
 * user_preferences.theme. Same DB-restore strategy.
 *
 * Restore strategy: snapshot the full user_preferences row in beforeAll, upsert
 * it back in afterEach. Since each Playwright test gets a fresh browser context,
 * localStorage is isolated per test - DB restore is sufficient to prevent
 * cross-test contamination via the sync hook.
 */
import { expect, test } from "@playwright/test";

import { SEED_USERS, createServiceClient, dismissPostSignInModals, signInAsViaUi } from "./helpers";

type PreferenceRow = Record<string, unknown>;

const USER_ID = SEED_USERS.alice.id;

let originalPreferences: PreferenceRow | null = null;

async function getPreferenceRow(): Promise<PreferenceRow> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select("*")
    .eq("user_id", USER_ID)
    .single();
  if (error) throw new Error(`Could not read user_preferences: ${error.message}`);
  return data as PreferenceRow;
}

async function restorePreferences() {
  if (!originalPreferences) return;
  const admin = createServiceClient();
  const { error } = await admin
    .from("user_preferences")
    .upsert(originalPreferences, { onConflict: "user_id" });
  if (error) throw new Error(`Could not restore user_preferences: ${error.message}`);
}

test.describe("settings - language switch", () => {
  test.beforeAll(async () => {
    originalPreferences = await getPreferenceRow();
  });

  test.afterEach(async () => {
    await restorePreferences();
  });

  test("switching to Bulgarian updates the UI and persists across reload", async ({ page }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // Open the user-menu popover (header avatar button).
    await page.getByRole("button", { name: "Open account menu", exact: true }).click();

    // The language section label is "Switch language" (navigation:languageToggle.toggle).
    await expect(page.getByText("Switch language", { exact: true })).toBeVisible();

    // Verify "English" is currently selected (has a checkmark) and "Bulgarian" is not.
    // The Pressable role="button" has accessibilityLabel = t(`languageToggle.${code}`).
    // We click "Bulgarian" to switch.
    await page.getByRole("button", { name: "Bulgarian", exact: true }).click();

    // After the language change the UI re-renders in Bulgarian. The popover stays
    // open - the language-toggle label in the still-open popover updates immediately
    // from "Switch language" → "Смени езика".
    await expect(page.getByText("Смени езика", { exact: true })).toBeVisible({ timeout: 5_000 });

    // The "Bulgarian" button should now show as active (selected).
    await expect(page.getByRole("button", { name: "Български", exact: true })).toBeVisible({
      timeout: 3_000,
    });

    // Persist check: reload the page. The DB was updated by useSettingsSync which
    // writes language → AsyncStorage and user_preferences.language. On reload the
    // i18n provider reads AsyncStorage and the UI comes up in Bulgarian.
    await page.reload();
    await dismissPostSignInModals(page);

    // After reload open the menu to confirm the language is still Bulgarian.
    // Button label is now "Отвори меню на профила" (translated).
    await page.getByRole("button", { name: "Отвори меню на профила", exact: true }).click();
    await expect(page.getByText("Смени езика", { exact: true })).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("settings - theme switch", () => {
  test.beforeAll(async () => {
    // May already be captured from the language describe block but snapshot
    // defensively in case suites run independently.
    if (!originalPreferences) {
      originalPreferences = await getPreferenceRow();
    }
  });

  test.afterEach(async () => {
    await restorePreferences();
  });

  test("switching to dark theme updates the color scheme and persists across reload", async ({
    page,
  }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // Open user-menu popover.
    await page.getByRole("button", { name: "Open account menu", exact: true }).click();

    // The theme section label is "Switch theme" (navigation:themeToggle.toggle).
    await expect(page.getByText("Switch theme", { exact: true })).toBeVisible();

    // Click "Dark" theme option (accessibilityLabel = "Dark").
    await page.getByRole("button", { name: "Dark", exact: true }).click();

    // The root html element should have class "dark" after the theme store updates.
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5_000 });

    // Persist check: reload.
    await page.reload();
    await dismissPostSignInModals(page);

    // After reload, theme is re-hydrated from AsyncStorage (set during first visit)
    // and the dark class should still be applied.
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 8_000 });

    // Now restore to "System" so the persisted store won't bleed into other tests
    // if context isolation fails.
    await page.getByRole("button", { name: "Open account menu", exact: true }).click();
    await expect(page.getByText("Switch theme", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "System", exact: true }).click();
  });

  test("switching to light theme updates the color scheme and persists across reload", async ({
    page,
  }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.getByRole("button", { name: "Open account menu", exact: true }).click();
    await expect(page.getByText("Switch theme", { exact: true })).toBeVisible();

    // Click "Light" theme option.
    await page.getByRole("button", { name: "Light", exact: true }).click();

    // The root html element should NOT have class "dark" for light mode.
    // Instead it should have "light" class (NativeWind applies the matching class).
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5_000 });

    // Persist check: reload.
    await page.reload();
    await dismissPostSignInModals(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 8_000 });

    // Restore to System.
    await page.getByRole("button", { name: "Open account menu", exact: true }).click();
    await page.getByRole("button", { name: "System", exact: true }).click();
  });
});

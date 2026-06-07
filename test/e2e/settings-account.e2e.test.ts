/**
 * Settings account e2e - display-name, notification toggles, reset onboarding.
 *
 * Restore strategy: snapshot the full user_preferences row and profiles row for
 * alice in beforeAll; restore both in afterEach so reruns are deterministic and
 * other suites don't see mutated state.
 *
 * alice's seeded state:
 *   profiles.display_name  = NULL
 *   user_preferences.language = 'en'
 *   user_preferences.app_onboarding_completed = true
 *   user_preferences.cbt_onboarding_completed = false
 *   user_preferences.notifications_enabled_global = true (default)
 *   user_preferences.cbt_reminders_enabled = false
 */
import { expect, test } from "./fixtures";

import { createServiceClient } from "./helpers";

type PreferenceRow = Record<string, unknown>;
type ProfileRow = Record<string, unknown>;

let USER_ID: string;

let originalPreferences: PreferenceRow | null = null;
let originalProfile: ProfileRow | null = null;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

async function getProfileRow(): Promise<ProfileRow> {
  const admin = createServiceClient();
  const { data, error } = await admin.from("profiles").select("*").eq("user_id", USER_ID).single();
  if (error) throw new Error(`Could not read profiles: ${error.message}`);
  return data as ProfileRow;
}

async function restorePreferences() {
  if (!originalPreferences) return;
  const admin = createServiceClient();
  const { error } = await admin
    .from("user_preferences")
    .upsert(originalPreferences, { onConflict: "user_id" });
  if (error) throw new Error(`Could not restore user_preferences: ${error.message}`);
}

async function restoreProfile() {
  if (!originalProfile) return;
  const admin = createServiceClient();
  const { error } = await admin.from("profiles").upsert(originalProfile, { onConflict: "user_id" });
  if (error) throw new Error(`Could not restore profiles: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Display-name tests
// ---------------------------------------------------------------------------

test.describe("settings - profile display name", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    originalPreferences = await getPreferenceRow();
    originalProfile = await getProfileRow();
  });

  test.afterEach(async () => {
    await restoreProfile();
    await restorePreferences();
  });

  test("saves display name and shows confirmation; persists across reload", async ({ page }) => {
    await page.goto("/(app)/settings");

    // Wait for the profile card to load (the display-name label is the stable marker).
    await expect(page.getByText("Display name", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Fill the display-name input.
    const nameInput = page.getByPlaceholder("Your name (optional)", { exact: true });
    await nameInput.fill("E2E Test Name");

    // Click the Save name button.
    await page.getByRole("button", { name: "Save name", exact: true }).click();

    // Assert the inline success message "Display name saved." appears.
    await expect(page.getByText("Display name saved.", { exact: true })).toBeVisible({
      timeout: 8_000,
    });

    // Persist check: reload and verify the input shows the saved name.
    await page.reload();
    await page.goto("/(app)/settings");

    await expect(page.getByPlaceholder("Your name (optional)", { exact: true })).toHaveValue(
      "E2E Test Name",
      { timeout: 8_000 },
    );
  });
});

// ---------------------------------------------------------------------------
// Notifications toggle tests
// ---------------------------------------------------------------------------

test.describe("settings - notification toggles", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    if (!originalPreferences) originalPreferences = await getPreferenceRow();
    if (!originalProfile) originalProfile = await getProfileRow();
  });

  test.afterEach(async () => {
    await restorePreferences();
    // Profiles not mutated in this suite but restore for safety.
    await restoreProfile();
  });

  test("global master switch off then on persists; per-target flag DB write reflects in UI", async ({
    page,
  }) => {
    await page.goto("/(app)/settings");
    await expect(page.getByText("Reminders & notifications", { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to /notifications via the "Open notifications" button.
    await page.getByRole("button", { name: "Open notifications", exact: true }).click();
    await expect(page.getByText("Notifications", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // The global master switch is labeled "Notifications enabled".
    // alice's default: notifications_enabled_global = true.
    const globalSwitch = page.getByRole("switch", { name: "Notifications enabled", exact: true });
    await expect(globalSwitch).toBeVisible({ timeout: 5_000 });
    await expect(globalSwitch).toHaveAttribute("aria-checked", "true");

    // Turn the global switch OFF.
    await globalSwitch.click();

    // After toggling off, the switch reflects off state.
    await expect(globalSwitch).toHaveAttribute("aria-checked", "false", { timeout: 5_000 });

    // DB persist check: reload and confirm global switch is still OFF.
    await page.reload();
    await page.goto("/notifications");
    const reloadedGlobalSwitch = page.getByRole("switch", {
      name: "Notifications enabled",
      exact: true,
    });
    await expect(reloadedGlobalSwitch).toHaveAttribute("aria-checked", "false", {
      timeout: 8_000,
    });

    // Service client check: DB reflects off.
    const admin = createServiceClient();
    const { data: afterOff } = await admin
      .from("user_preferences")
      .select("notifications_enabled_global")
      .eq("user_id", USER_ID)
      .single();
    expect(afterOff?.notifications_enabled_global).toBe(false);

    // Turn the global switch back ON.
    await reloadedGlobalSwitch.click();
    await expect(reloadedGlobalSwitch).toHaveAttribute("aria-checked", "true", { timeout: 5_000 });

    // Wait briefly for the DB update to propagate (async mutation) then verify.
    await page.waitForTimeout(1_000);
    const { data: afterOnFinal } = await admin
      .from("user_preferences")
      .select("notifications_enabled_global")
      .eq("user_id", USER_ID)
      .single();
    expect(afterOnFinal?.notifications_enabled_global).toBe(true);

    // Per-target persistence: write cbt_reminders_enabled = true directly via
    // service client (bypassing OS push scheduling which is not available in the
    // e2e web environment), then reload and assert the CBT switch shows as ON.
    await admin
      .from("user_preferences")
      .update({ cbt_reminders_enabled: true })
      .eq("user_id", USER_ID);

    await page.reload();
    await page.goto("/notifications");

    // The CBT switch is the first "Enable reminders" switch (CBT is first in MODULES section).
    const cbtSwitch = page.getByRole("switch", { name: "Enable reminders", exact: true }).first();
    await expect(cbtSwitch).toHaveAttribute("aria-checked", "true", { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Reset onboarding test
// ---------------------------------------------------------------------------

test.describe("settings - reset onboarding", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    if (!originalPreferences) originalPreferences = await getPreferenceRow();
    if (!originalProfile) originalProfile = await getProfileRow();
  });

  test.afterEach(async () => {
    await restorePreferences();
    await restoreProfile();
  });

  test("reset onboarding clears onboarding flags and shows confirmation", async ({ page }) => {
    await page.goto("/(app)/settings");

    // Wait for the onboarding section.
    await expect(page.getByText("Onboarding", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Click "Reset onboarding".
    await page.getByRole("button", { name: "Reset onboarding", exact: true }).click();

    // The success message "Onboarding will be shown again." appears inline.
    // It appears in two places (card text + toast description) - use .first().
    await expect(
      page.getByText("Onboarding will be shown again.", { exact: true }).first(),
    ).toBeVisible({ timeout: 8_000 });

    // DB check: app_onboarding_completed should now be false, and
    // shown_button_tours should be empty.
    const admin = createServiceClient();
    const { data } = await admin
      .from("user_preferences")
      .select(
        "app_onboarding_completed, cbt_onboarding_completed, shown_button_tours, gratitude_onboarding_completed, mood_onboarding_completed",
      )
      .eq("user_id", USER_ID)
      .single();
    expect(data?.app_onboarding_completed).toBe(false);
    expect(data?.cbt_onboarding_completed).toBe(false);
    expect(data?.shown_button_tours ?? []).toEqual([]);

    // Persist check: navigate to "/" → the onboarding modal reappears because
    // app_onboarding_completed is now false. The modal is only shown at pathname "/".
    await page.goto("/");
    const welcomeModal = page.getByText(/Welcome to Selftend/i);
    const modalVisible = await welcomeModal
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    expect(modalVisible).toBe(true);
  });
});

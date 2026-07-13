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

import { createServiceClient, dismissPostSignInModals } from "./helpers";

type PreferenceRow = Record<string, unknown>;
type ProfileRow = Record<string, unknown>;

let USER_ID: string;

let originalPreferences: PreferenceRow | null = null;
let originalProfile: ProfileRow | null = null;
let originalWidgets: PreferenceRow[] | null = null;

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

async function getWidgetRows(): Promise<PreferenceRow[]> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("widget_preferences")
    .select("*")
    .eq("user_id", USER_ID)
    .order("position");
  if (error) throw new Error(`Could not read widget_preferences: ${error.message}`);
  return (data ?? []) as PreferenceRow[];
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
  // profiles is a decrypting view (display_name encrypted at rest); its INSTEAD OF INSERT trigger
  // resolves the per-user merge (PostgREST upsert's ON CONFLICT cannot target a view).
  const { error } = await admin.from("profiles").insert(originalProfile);
  if (error) throw new Error(`Could not restore profiles: ${error.message}`);
}

async function restoreWidgets() {
  if (!originalWidgets) return;
  const admin = createServiceClient();
  const { error: deleteError } = await admin
    .from("widget_preferences")
    .delete()
    .eq("user_id", USER_ID);
  if (deleteError) throw new Error(`Could not clear widget_preferences: ${deleteError.message}`);
  if (originalWidgets.length === 0) return;
  const { error: insertError } = await admin.from("widget_preferences").insert(originalWidgets);
  if (insertError) {
    throw new Error(`Could not restore widget_preferences: ${insertError.message}`);
  }
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

    // Wait for the useUserProfile query (getOrSyncUserProfile) to resolve before
    // interacting with the input. On a fresh pool user the query reads display_name=null
    // and syncs "E2E Worker" from user_metadata.full_name, then the useEffect sets the
    // input value. If we fill before that write lands, the useEffect fires afterward and
    // resets the input to "E2E Worker", causing the save to persist the wrong value.
    // Waiting for a non-empty value guarantees the profile query has settled.
    const nameInput = page.getByPlaceholder("Your name (optional)", { exact: true });
    await expect(nameInput).not.toHaveValue("", { timeout: 10_000 });

    // Fill the display-name input.
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
    originalWidgets = await getWidgetRows();
  });

  test.afterEach(async () => {
    await restorePreferences();
    await restoreProfile();
    await restoreWidgets();
  });

  test("reset onboarding replays the introduction and preserves Home widgets", async ({ page }) => {
    const admin = createServiceClient();
    const { error: deleteError } = await admin
      .from("widget_preferences")
      .delete()
      .eq("user_id", USER_ID);
    if (deleteError)
      throw new Error(`Could not prepare widget preferences: ${deleteError.message}`);
    const { error: insertError } = await admin.from("widget_preferences").insert([
      { user_id: USER_ID, widget_id: "mood-checkin", position: 0 },
      { user_id: USER_ID, widget_id: "self-care", position: 1 },
    ]);
    if (insertError)
      throw new Error(`Could not prepare widget preferences: ${insertError.message}`);

    await page.goto("/(app)/settings");
    await dismissPostSignInModals(page);

    // Wait for the onboarding section.
    await expect(page.getByText("Onboarding", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Click "Reset onboarding".
    await page.getByRole("button", { name: "Reset onboarding", exact: true }).click();

    await expect(page.getByText(/Tool introductions will be shown again/i).first()).toBeVisible({
      timeout: 8_000,
    });

    // The app introduction and tool introductions reset. Existing widgets are not touched.
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

    expect(
      (await getWidgetRows()).map(({ widget_id, position }) => ({ widget_id, position })),
    ).toEqual([
      { widget_id: "mood-checkin", position: 0 },
      { widget_id: "self-care", position: 1 },
    ]);

    // Returning Home replays only the welcome introduction. Completing it must not enter
    // recommendation questions or replace the current Home layout.
    await page.goto("/");
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeHidden();
    await expect(page.getByText("What brings you here?", { exact: true })).toBeHidden();
    const home = page.getByTestId("home-layout");
    await expect(home.getByText("Check-in", { exact: true })).toBeVisible();
    await expect(home.getByText("Self-care log", { exact: true })).toBeVisible();

    const { data: completed } = await admin
      .from("user_preferences")
      .select("app_onboarding_completed")
      .eq("user_id", USER_ID)
      .single();
    expect(completed?.app_onboarding_completed).toBe(true);
    expect(
      (await getWidgetRows()).map(({ widget_id, position }) => ({ widget_id, position })),
    ).toEqual([
      { widget_id: "mood-checkin", position: 0 },
      { widget_id: "self-care", position: 1 },
    ]);
  });
});

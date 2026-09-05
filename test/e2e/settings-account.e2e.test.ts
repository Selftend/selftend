/**
 * Settings account e2e - display-name, notification toggles, onboarding actions.
 *
 * Restore strategy: snapshot the full user_preferences row and profiles row for
 * alice in beforeAll; restore both in afterEach so reruns are deterministic and
 * other suites don't see mutated state.
 *
 * alice's seeded state:
 *   profiles.display_name  = NULL
 *   user_preferences.language = 'en'
 *   user_preferences.app_onboarding_completed = true
 *   user_preferences.notifications_enabled_global = true (default)
 *   user_preferences.cbt_reminders_enabled = false
 */
import { expect, NORMALIZED_GATE_PREFS, test } from "./fixtures";

import {
  createServiceClient,
  dismissPostSignInModals,
  expectSuccessToast,
  seedFavoritesForUser,
} from "./helpers";

type PreferenceRow = Record<string, unknown>;
type ProfileRow = Record<string, unknown>;
type FavoriteRow = { kind: "tool" | "module"; key: string };

let USER_ID: string;

let originalPreferences: PreferenceRow | null = null;
let originalProfile: ProfileRow | null = null;
let originalFavorites: FavoriteRow[] | null = null;

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

async function getFavoriteRows(): Promise<FavoriteRow[]> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("favorites")
    .select("kind, key")
    .eq("user_id", USER_ID)
    .order("kind")
    .order("key");
  if (error) throw new Error(`Could not read favorites: ${error.message}`);
  return (data ?? []) as FavoriteRow[];
}

async function restorePreferences() {
  if (!originalPreferences) return;
  const admin = createServiceClient();
  // Gate fields re-normalized on restore: the beforeAll capture predates the
  // fixtures' per-test normalization, so the raw row can carry gate-firing
  // values (stale policy version) that would hit a later test (#172).
  const { error } = await admin
    .from("user_preferences")
    .upsert({ ...originalPreferences, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });
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

async function restoreFavorites() {
  if (!originalFavorites) return;
  await seedFavoritesForUser(USER_ID, originalFavorites);
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

    // The display-name field is behind an in-place disclosure now (#982): the field,
    // its placeholder, `Save name` and `Display name saved.` all survive, one click
    // deeper. Collapsed content is UNMOUNTED, so this is a real gate rather than a
    // visibility one.
    const editName = page.getByRole("button", { name: "Edit name", exact: true });
    await expect(editName).toBeVisible({ timeout: 10_000 });
    await editName.click();

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

    // Persist check: reload and verify the input shows the saved name. A reload
    // collapses the disclosure, so it has to be opened again - which is also the
    // proof that the field is genuinely unmounted rather than merely hidden.
    await page.reload();
    await page.goto("/(app)/settings");

    await page.getByRole("button", { name: "Edit name", exact: true }).click();
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
    // The card and its "Open notifications" button are gone (#982): the settings
    // ROW is the door now, and its label is `Reminders`. Scoped to the page body,
    // because the desktop sidebar's own nav link carries the same word since #981.
    const settings = page.getByTestId("settings-layout");
    const remindersRow = settings.getByRole("button", { name: "Reminders", exact: true });
    await expect(remindersRow).toBeVisible({ timeout: 10_000 });

    // Navigate to /notifications by pressing the row itself.
    await remindersRow.click();
    // The screen's h1 is "Reminders" (#981). Asserted as the HEADING, not as text: the
    // sidebar's nav link carries the same word now, so a text match would pass on the door
    // instead of the room.
    await expect(page.getByRole("heading", { name: "Reminders", exact: true })).toBeVisible({
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

    // Each switch is named for its target now, so this asserts the CBT row specifically.
    // The old shared "Enable reminders" name plus `.first()` kept this green while
    // asserting nothing about which row it found (#981).
    const cbtSwitch = page.getByRole("switch", { name: "CBT", exact: true });
    await expect(cbtSwitch).toHaveAttribute("aria-checked", "true", { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Onboarding actions
// ---------------------------------------------------------------------------

test.describe("settings - onboarding actions", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    if (!originalPreferences) originalPreferences = await getPreferenceRow();
    if (!originalProfile) originalProfile = await getProfileRow();
    originalFavorites = await getFavoriteRows();
  });

  test.afterEach(async () => {
    await restorePreferences();
    await restoreProfile();
    await restoreFavorites();
  });

  test("replays the introduction, re-arms tips separately, and preserves Home favourites", async ({
    page,
  }) => {
    const admin = createServiceClient();
    // What Home renders under Favourites since #1956 - one tool and one module, so the
    // replay is proven not to touch either kind.
    const seeded: FavoriteRow[] = [
      { kind: "tool", key: "mood" },
      { kind: "module", key: "cbt" },
    ];
    await seedFavoritesForUser(USER_ID, seeded);
    const { error: preferenceError } = await admin
      .from("user_preferences")
      .update({ shown_button_tours: ["home:navigation"] })
      .eq("user_id", USER_ID);
    if (preferenceError)
      throw new Error(`Could not prepare onboarding preferences: ${preferenceError.message}`);

    await page.goto("/(app)/settings");
    await dismissPostSignInModals(page);

    // The `Onboarding` card heading is gone (#982) - both rows now sit in the `App`
    // run - so the wait is on the button this test actually presses. Its name
    // survives verbatim.
    const replay = page.getByRole("button", { name: "Replay introduction", exact: true });
    await expect(replay).toBeVisible({ timeout: 10_000 });

    await replay.click();

    // Toast-only feedback (#982): the shared banner pair is gone, and `.first()`
    // existed to disambiguate the banner from the toast that already fired beside
    // it. Scoped to the toast so this cannot pass against a stale permanent node.
    await expectSuccessToast(page, /app introduction will be shown again/i, { timeout: 8_000 });

    // Replaying the app introduction does not silently alter contextual tips.
    const { data: replayed } = await admin
      .from("user_preferences")
      .select("app_onboarding_completed, shown_button_tours")
      .eq("user_id", USER_ID)
      .single();
    expect(replayed?.app_onboarding_completed).toBe(false);
    expect(replayed?.shown_button_tours).toEqual(["home:navigation"]);

    await page.getByRole("button", { name: "Show tips again", exact: true }).click();
    await expectSuccessToast(page, /button tips.*can appear again/i, { timeout: 8_000 });
    const { data: tips } = await admin
      .from("user_preferences")
      .select("shown_button_tours, start_here_dismissed_at")
      .eq("user_id", USER_ID)
      .single();
    expect(tips?.shown_button_tours ?? []).toEqual([]);
    expect(tips?.start_here_dismissed_at).toBeNull();

    expect(await getFavoriteRows()).toEqual([
      { kind: "module", key: "cbt" },
      { kind: "tool", key: "mood" },
    ]);

    // Returning Home replays the welcome introduction - the whole wizard since #1958.
    // Completing it must not replace the current Favourites.
    await page.goto("/");
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(page.getByText("Welcome to Selftend", { exact: true })).toBeHidden();
    // Scoped to the SECTION, not to `home-layout`: a favourited item renders its card
    // twice on Home (Favourites and catalogue), and both copies are inside `home-layout`,
    // so that scope is precisely the strict-mode violation (#1956).
    const favourites = page.getByTestId("home-favourites");
    await expect(favourites.getByText("Check-in", { exact: true })).toBeVisible();
    await expect(
      favourites.getByText("Cognitive behavioural therapy", { exact: true }),
    ).toBeVisible();

    const { data: completed } = await admin
      .from("user_preferences")
      .select("app_onboarding_completed")
      .eq("user_id", USER_ID)
      .single();
    expect(completed?.app_onboarding_completed).toBe(true);
    expect(await getFavoriteRows()).toEqual([
      { kind: "module", key: "cbt" },
      { kind: "tool", key: "mood" },
    ]);
  });
});

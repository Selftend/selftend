import { expect, NORMALIZED_GATE_PREFS, test } from "./fixtures";

import { createServiceClient } from "./helpers";
import { policyVersion } from "../../src/features/policies/policy-content";

// ☠️ There are no tours left anywhere in the app, and this spec is what proves it
// from a browser. The day-strip "dates" tip and every per-page module-header
// ("button tour") tip were removed - see .superpowers/sdd/task-4-brief.md - then
// `home:edit` went with the dashboard's Arrange / Add tool cluster (#1956), and
// #2109 retired the last one, `home:navigation`, along with the whole tour
// machinery: once the panel held neither a tool row nor a module row (#2106), the
// tip pointing at it had nothing left to say.
//
// What survives here is the negative half, which is the half that can regress:
// module screens' action buttons render and fire with NO coach-mark overlay ever
// appearing. The positive cases went with their subject.
//
// `shown_button_tours` rows are still written and read by nothing - the column
// stays (the export function bakes it in), and stored values are inert.

// Set from the worker's pool user in beforeAll (worker-scoped fixtures are
// available to beforeAll). Module scope is per-worker-process, so this is safe.
let USER_ID: string;

type PreferenceRow = Record<string, unknown>;
let originalPreferences: PreferenceRow | null = null;

async function getPreferenceRow() {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select("*")
    .eq("user_id", USER_ID)
    .single();

  if (error) {
    throw new Error(`Could not read user preferences: ${error.message}`);
  }

  return data as PreferenceRow;
}

async function setTourState(shownButtonTours: readonly string[]) {
  const admin = createServiceClient();
  const { error } = await admin.from("user_preferences").upsert(
    {
      user_id: USER_ID,
      app_onboarding_completed: true,
      policy_version_accepted: policyVersion,
      shown_button_tours: shownButtonTours,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Could not set tour state: ${error.message}`);
  }
}

async function restoreOriginalPreferences() {
  if (!originalPreferences) return;

  const admin = createServiceClient();
  // Gate fields re-normalized on restore: the beforeAll capture predates the
  // fixtures' per-test normalization, so the raw row can carry gate-firing
  // values (stale policy version) that would hit a later test (#172).
  const { error } = await admin
    .from("user_preferences")
    .upsert({ ...originalPreferences, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Could not restore user preferences: ${error.message}`);
  }
}

test.describe("module-header buttons (per-page coach marks removed)", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    originalPreferences = await getPreferenceRow();
  });

  test.afterEach(async () => {
    await restoreOriginalPreferences();
  });

  test("action buttons render with no coach-mark overlay on first visit", async ({ page }) => {
    // Empty shown_button_tours used to mean "every header tip is unseen". Now there is
    // no header-tip mechanism at all, so the module screen must render clean regardless.
    await setTourState([]);

    await page.goto("/tools/check-in");

    // The desktop sidebar also has a "Reminders" nav link (same label - both were renamed
    // from "Notifications" with the screen, #981), so scope to the module header's own
    // action row via .last() - it renders after the sidebar in the DOM (see
    // src/components/app/protected-layout.tsx).
    await expect(page.getByLabel("Reminders", { exact: true }).last()).toBeVisible();
    await expect(page.getByLabel("About this module", { exact: true })).toBeVisible();

    // None of the removed coach-mark copy/controls should ever appear.
    await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Skip all tips", exact: true })).toHaveCount(0);
    await expect(
      page.getByText(/Tap here to manage reminders and notification settings/i),
    ).toHaveCount(0);
  });

  test("notifications action navigates to the Reminders screen with this module's target", async ({
    page,
  }) => {
    await setTourState([]);
    await page.goto("/tools/check-in");

    // See note above: the sidebar's own "Reminders" nav link shares this label, so
    // the module header's action button is the LAST match, not the first.
    await page.getByLabel("Reminders", { exact: true }).last().click();

    // The bell is a door, not a modal (#967/#1071): the press lands on the central
    // Reminders screen carrying the module's key.
    await expect(page).toHaveURL(/\/notifications\?target=mood$/);
    await expect(page.getByRole("heading", { name: "Reminders", exact: true })).toBeVisible();
  });

  test("arriving with a target scrolls that module's row into view", async ({ page }) => {
    await setTourState([]);

    // Grounding is the LAST of the ten rows, below the fold at the e2e viewport - so
    // this only passes if arrival actually scrolls (a plain visibility check would
    // pass without any scroll at all).
    await page.goto("/notifications?target=grounding");

    await expect(page.getByTestId("notification-row-grounding")).toBeInViewport();
  });

  test("info action still fires onPress (opens the module's onboarding)", async ({ page }) => {
    await setTourState([]);
    await page.goto("/tools/check-in");

    await page.getByLabel("About this module", { exact: true }).click();
    await expect(page.getByText("Know your emotional weather")).toBeVisible();
  });

  test("no coach-mark overlay appears even when no header tip was ever dismissed before", async ({
    page,
  }) => {
    // Legacy bare/scoped shown_button_tours keys from before this removal should have
    // zero effect now - the mechanism reading them is gone.
    await setTourState(["cbt:tune", "notifications"]);

    await page.goto("/modules/act");

    await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Skip all tips", exact: true })).toHaveCount(0);
  });
});

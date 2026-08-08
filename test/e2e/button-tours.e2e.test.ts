import { expect, NORMALIZED_GATE_PREFS, test } from "./fixtures";

import { createServiceClient } from "./helpers";
import { policyVersion } from "../../src/features/policies/policy-content";

// Home dashboard's two surviving first-run tips, in HOME_TOUR_STOPS order
// (src/features/tours/home-tour.tsx). The day-strip "dates" tip and every
// per-page module-header ("button tour") tip were removed - see
// .superpowers/sdd/task-4-brief.md. This spec now covers:
//   1. Module screens (e.g. mood-tracker): action buttons render and fire,
//      with no coach-mark overlay ever appearing.
//   2. The home dashboard: exactly the 2 remaining tips still show and can be
//      dismissed individually or all at once.
const HOME_TOUR_KEYS = ["home:edit", "home:navigation"] as const;

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
      cbt_onboarding_completed: true,
      policy_version_accepted: policyVersion,
      shown_button_tours: shownButtonTours,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Could not set tour state: ${error.message}`);
  }
}

async function getShownButtonTours() {
  const row = await getPreferenceRow();
  return (row.shown_button_tours ?? []) as string[];
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

    // The desktop sidebar also has a "Notifications" nav link (same label), so scope to
    // the module header's own action row via .last() - it renders after the sidebar in
    // the DOM (see src/components/app/protected-layout.tsx).
    await expect(page.getByLabel("Notifications", { exact: true }).last()).toBeVisible();
    await expect(page.getByLabel("About this module", { exact: true })).toBeVisible();

    // None of the removed coach-mark copy/controls should ever appear.
    await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Skip all tips", exact: true })).toHaveCount(0);
    await expect(
      page.getByText(/Tap here to manage reminders and notification settings/i),
    ).toHaveCount(0);
  });

  test("notifications action still fires onPress (opens its modal)", async ({ page }) => {
    await setTourState([]);
    await page.goto("/tools/check-in");

    // See note above: the sidebar's own "Notifications" nav link shares this label, so
    // the module header's action button is the LAST match, not the first.
    await page.getByLabel("Notifications", { exact: true }).last().click();
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
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

test.describe("home dashboard tips (2 remaining stops)", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    originalPreferences = await getPreferenceRow();
  });

  test.afterEach(async () => {
    await restoreOriginalPreferences();
  });

  test("shows the edit (dashboard) tip and Got it dismisses only that stop", async ({ page }) => {
    await setTourState([]);

    await page.goto("/");
    await expect(
      page.getByText(/Arrange the dashboard your way - add, remove and reorder widgets\./i),
    ).toBeVisible();

    await page.getByRole("button", { name: "Got it", exact: true }).click();

    await expect.poll(getShownButtonTours).toEqual(["home:edit"]);
  });

  test("Skip all tips dismisses both remaining home stops (no check-in or day-strip tip)", async ({
    page,
  }) => {
    await setTourState([]);

    await page.goto("/");
    await expect(
      page.getByText(/Arrange the dashboard your way - add, remove and reorder widgets\./i),
    ).toBeVisible();

    await page.getByRole("button", { name: "Skip all tips", exact: true }).click();

    await expect.poll(getShownButtonTours).toEqual([...HOME_TOUR_KEYS]);
  });

  test("no additional tip appears once the 2 remaining stops are dismissed", async ({ page }) => {
    await setTourState([...HOME_TOUR_KEYS]);

    await page.goto("/");

    // If the removed "dates" stop still existed, it would show now (its key was never
    // added to shown_button_tours). Asserting nothing shows proves it's gone.
    await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(page.getByText(/Browse previous days to see what you logged\./i)).toHaveCount(0);
  });

  test("settings reset makes home tips eligible again", async ({ page }) => {
    await setTourState([...HOME_TOUR_KEYS]);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Reset onboarding", exact: true }).click();

    await expect(page.getByText(/Tool introductions will be shown again/i).first()).toBeVisible();
    await expect.poll(getShownButtonTours).toEqual([]);
  });
});

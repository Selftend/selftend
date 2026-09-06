import { expect, NORMALIZED_GATE_PREFS, test } from "./fixtures";

import { createServiceClient, expectSuccessToast, HOME_HEADING } from "./helpers";
import { policyVersion } from "../../src/features/policies/policy-content";

// Home's ONE surviving first-run tip, in HOME_TOUR_STOPS order
// (src/features/tours/home-tour.tsx). The day-strip "dates" tip and every
// per-page module-header ("button tour") tip were removed - see
// .superpowers/sdd/task-4-brief.md - and `home:edit` went with the dashboard's
// Arrange / Add tool cluster (#1956). This spec now covers:
//   1. Module screens (e.g. check-in): action buttons render and fire,
//      with no coach-mark overlay ever appearing.
//   2. Home: the one remaining tip still shows and can be dismissed by either
//      button, and nothing else ever appears.
const HOME_TOUR_KEYS = ["home:navigation"] as const;

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

test.describe("home tips (1 remaining stop)", () => {
  test.beforeAll(async ({ user }) => {
    USER_ID = user.id;
    originalPreferences = await getPreferenceRow();
  });

  test.afterEach(async () => {
    await restoreOriginalPreferences();
  });

  /**
   * Skipping is not dismissing - the proof that used to ride the edit stop here (an
   * unregistered target falls out of the queue WITHOUT being written). The navigation
   * stop's target is the hamburger, which every e2e viewport renders, so no browser
   * state can leave it unregistered; that half of the proof now lives in
   * src/features/tours/home-tour.test.tsx ("skips an unregistered stop without marking
   * it shown"), where the registry can be left empty. What a browser CAN prove is the
   * other half: a tip that is merely SHOWING writes nothing until it is answered.
   */
  test("shows the navigation tip, writes nothing until answered, and Got it marks it", async ({
    page,
  }) => {
    await setTourState([]);

    await page.goto("/");
    await expect(page.getByRole("heading", HOME_HEADING)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Find all Modules and Tools here\./i)).toBeVisible();
    // Showing is not dismissing: nothing has been written yet.
    expect(await getShownButtonTours()).toEqual([]);

    await page.getByRole("button", { name: "Got it", exact: true }).click();

    await expect.poll(getShownButtonTours).toEqual(["home:navigation"]);
  });

  test("Skip all tips dismisses the one remaining home stop (no check-in or day-strip tip)", async ({
    page,
  }) => {
    await setTourState([]);

    await page.goto("/");
    await expect(page.getByText(/Find all Modules and Tools here\./i)).toBeVisible();

    await page.getByRole("button", { name: "Skip all tips", exact: true }).click();

    await expect.poll(getShownButtonTours).toEqual([...HOME_TOUR_KEYS]);
  });

  test("no additional tip appears once the remaining stop is dismissed", async ({ page }) => {
    await setTourState([...HOME_TOUR_KEYS]);

    await page.goto("/");

    // If the removed "dates" or "edit" stop still existed, it would show now (neither key
    // is in shown_button_tours). Anchored on Home having rendered, so "no Got it" is an
    // absence on a real screen rather than on a blank one. The dismiss button is the
    // assertion, not either stop's copy: both strings were deleted with their stops
    // (#1959 took the last), and a `getByText` on deleted copy passes unconditionally.
    await expect(page.getByRole("heading", HOME_HEADING)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Got it", exact: true })).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test("Show tips again makes home tips eligible again", async ({ page }) => {
    await setTourState([...HOME_TOUR_KEYS]);

    await page.goto("/settings");
    // `Show tips again` survives #982 verbatim as a button name; only the `Onboarding`
    // card heading around it disappeared, and this spec never asserted that heading.
    await page.getByRole("button", { name: "Show tips again", exact: true }).click();

    // Toast-only now that the shared feedback banner is gone.
    await expectSuccessToast(page, /button tips.*can appear again/i);
    await expect.poll(getShownButtonTours).toEqual([]);
  });
});

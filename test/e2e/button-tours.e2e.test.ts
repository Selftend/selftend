import { expect, test } from "@playwright/test";

import { SEED_USERS, createServiceClient, dismissPostSignInModals, signInAsViaUi } from "./helpers";
import { policyVersion } from "../../src/features/policies/policy-content";

const TOUR_KEYS = ["tune", "notifications", "info"] as const;
const USER_ID = SEED_USERS.alice.id;

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
  const { error } = await admin
    .from("user_preferences")
    .upsert(originalPreferences, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Could not restore user preferences: ${error.message}`);
  }
}

test.describe("button tours", () => {
  test.beforeAll(async () => {
    originalPreferences = await getPreferenceRow();
  });

  test.afterEach(async () => {
    await restoreOriginalPreferences();
  });

  test("Got it dismisses only the current header tip", async ({ page }) => {
    await setTourState([]);
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/modules/cbt");
    await expect(page.getByText(/Tap here to customise this module/i)).toBeVisible();

    await page.getByRole("button", { name: "Got it", exact: true }).click();

    await expect.poll(getShownButtonTours).toEqual(["tune"]);
  });

  test("Skip all tips dismisses every header tip", async ({ page }) => {
    await setTourState([]);
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/modules/cbt");
    await expect(page.getByText(/Tap here to customise this module/i)).toBeVisible();

    await page.getByRole("button", { name: "Skip all tips", exact: true }).click();

    await expect.poll(getShownButtonTours).toEqual([...TOUR_KEYS]);
  });

  test("settings reset makes header tips eligible again", async ({ page }) => {
    await setTourState(TOUR_KEYS);
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Reset onboarding", exact: true }).click();

    await expect(
      page.getByText("Onboarding will be shown again.", { exact: true }).first(),
    ).toBeVisible();
    await expect.poll(getShownButtonTours).toEqual([]);
  });
});

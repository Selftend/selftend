// Warn-and-abandon (#1444): a guest signing in to an existing account leaves
// this device's guest data behind - one calm confirm when the guest holds
// content, a straight sign-in when they hold none.
//
// Plain @playwright/test, not ./fixtures: the worker fixture plants a POOL
// user's registered session, and this journey needs a real anonymous session
// minted at runtime (spec §10: no seeded guests). Requires
// `enable_anonymous_sign_ins = true` in supabase/config.toml (#1440).

import { expect, test } from "@playwright/test";

// ☠️ From session-injection/guest-session, NOT ./fixtures: importing
// fixtures.ts registers its `beforeEach({ user })` pool-fixture hook on this
// plain-test file too, and every test here would die with "beforeEach hook has
// unknown parameter".
import { CAPTURE_STORAGE_KEY, NORMALIZED_GATE_PREFS } from "./session-injection";
import { deleteGuest, startGuestSession } from "./guest-session";
import { createServiceClient } from "../integration/helpers";

const TARGET_PASSWORD = "abandon-target-pass-1234";
const WARNING_TITLE = "Your guest data stays behind";

/**
 * A dedicated registered account per test, NOT a pool user: signing into a
 * pool user while a fixtures worker drives its UI elsewhere is a write-write
 * race on its preferences. Created pre-confirmed via the admin API - the
 * public signup path would send a confirmation email.
 */
async function createTargetAccount(email: string): Promise<string> {
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TARGET_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Creating the target account failed: ${error?.message ?? "no user"}`);
  }
  const { error: prefsError } = await admin
    .from("user_preferences")
    .upsert({ user_id: data.user.id, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });
  if (prefsError) {
    throw new Error(`Prefs normalization failed for target: ${prefsError.message}`);
  }
  return data.user.id;
}

async function signInAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  // The guest is NOT redirected into the app (#1443's is_anonymous-aware
  // redirect) - the form is reachable.
  await expect(page.getByTestId("sign-in-email")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("sign-in-email").fill(email);
  await page.getByTestId("sign-in-password").fill(TARGET_PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test.describe("guest sign-in warn-and-abandon", () => {
  let guestId: string;
  let targetId: string | undefined;

  test.beforeEach(async ({ page }) => {
    guestId = await startGuestSession(page);
  });

  test.afterEach(async () => {
    await deleteGuest(guestId);
    if (targetId) {
      const admin = createServiceClient();
      await admin.auth.admin.deleteUser(targetId).catch(() => undefined);
      targetId = undefined;
    }
  });

  test("a guest with content is warned; proceeding signs into the target and keeps the guest account", async ({
    page,
  }) => {
    const email = `abandon-target-${Date.now()}@test.local`;
    targetId = await createTargetAccount(email);

    // A row the GUEST created (planted server-side; the UI journey for
    // creating one is create-gratitude-entry's job).
    const admin = createServiceClient();
    const { error: plantError } = await admin
      .from("gratitude_entries")
      .insert({ user_id: guestId, item_1: `Guest gratitude ${Date.now()}` });
    if (plantError) throw new Error(`Planting the guest row failed: ${plantError.message}`);

    await signInAs(page, email);

    // The confirm interposes - sign-in has NOT completed.
    await expect(page.getByText(WARNING_TITLE)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Sign in without it", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    // This device now holds the TARGET account's session.
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      CAPTURE_STORAGE_KEY,
    );
    const session = JSON.parse(stored ?? "{}") as {
      user?: { id?: string; email?: string; is_anonymous?: boolean };
    };
    expect(session.user?.id).toBe(targetId);
    expect(session.user?.email).toBe(email);
    expect(session.user?.is_anonymous).toBeFalsy();

    // The abandoned guest is orphaned, never deleted - lifecycle cleanup
    // (#1449) is the only deletion path.
    const { data: guestLookup, error: lookupError } = await admin.auth.admin.getUserById(guestId);
    expect(lookupError).toBeNull();
    expect(guestLookup?.user?.id).toBe(guestId);
  });

  test("an empty guest signs straight in - no warning to click through", async ({ page }) => {
    const email = `abandon-empty-${Date.now()}@test.local`;
    targetId = await createTargetAccount(email);

    await signInAs(page, email);

    // Landing here WITHOUT touching any dialog is the proof of the skip: with
    // content, the journey above cannot reach the app until the confirm is
    // answered.
    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(WARNING_TITLE)).toHaveCount(0);
  });
});

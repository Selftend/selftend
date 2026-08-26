// Warn-and-abandon (#1444): a guest signing in to an existing account leaves
// this device's guest data behind - one calm confirm when the guest holds
// user-created content, skipped for an empty guest, never a block.
//
// Plain @playwright/test, not ./fixtures: the worker fixture plants a POOL
// user's registered session, and this journey needs a real anonymous session
// minted at runtime via signInAnonymously (spec §10: no seeded guests).
// Requires `enable_anonymous_sign_ins = true` in supabase/config.toml (#1440).

import { expect, test } from "@playwright/test";

// ☠️ From session-injection/guest-session, NOT ./fixtures: importing
// fixtures.ts registers its `beforeEach({ user })` pool-fixture hook on this
// plain-test file too, and every test here would die with "beforeEach hook has
// unknown parameter".
import { CAPTURE_STORAGE_KEY, NORMALIZED_GATE_PREFS } from "./session-injection";
import { deleteGuest, startGuestSession } from "./guest-session";
import { createServiceClient } from "../integration/helpers";

const TARGET_PASSWORD = "abandon-target-pass-1234";
const DIALOG_TITLE = "Your guest data stays behind";

/**
 * The registered account the guest signs in to. Created via the admin API,
 * pre-confirmed - never through the public signup, which would send a
 * confirmation email (the deliverability rule's unsafe step on live stacks).
 * A dedicated account, not a pool user: signing in to a pool user from a
 * plain spec would race the worker that owns it.
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
  // Normalize the gates so landing in the app is the assertion, not the
  // consent flow.
  const { error: prefsError } = await admin
    .from("user_preferences")
    .upsert({ user_id: data.user.id, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });
  if (prefsError) {
    throw new Error(`Prefs normalization failed for target ${data.user.id}: ${prefsError.message}`);
  }
  return data.user.id;
}

async function signInAsTarget(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  await expect(page.getByTestId("sign-in-email")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("sign-in-email").fill(email);
  await page.getByTestId("sign-in-password").fill(TARGET_PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

async function storedSessionUser(page: import("@playwright/test").Page) {
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    CAPTURE_STORAGE_KEY,
  );
  return (JSON.parse(stored ?? "{}") as { user?: { id?: string; email?: string } }).user;
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

  test("a guest with content is warned, can export in place, and proceeding signs into the target", async ({
    page,
  }) => {
    const email = `guest-abandon-${Date.now()}@test.local`;
    targetId = await createTargetAccount(email);

    // A row the guest created - what the dialog exists to warn about.
    const admin = createServiceClient();
    const { error: plantError } = await admin
      .from("gratitude_entries")
      .insert({ user_id: guestId, item_1: `Guest gratitude before abandoning ${Date.now()}` });
    if (plantError) throw new Error(`Planting the guest row failed: ${plantError.message}`);

    await signInAsTarget(page, email);

    // The confirm appears BEFORE the sign-in completes.
    await expect(page.getByText(DIALOG_TITLE)).toBeVisible({ timeout: 15_000 });
    expect((await storedSessionUser(page))?.id).toBe(guestId);

    // "Export your data first" runs the existing export in place - a download
    // starts, no navigation happens, the dialog stays up.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export your data first", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^selftend-export-.*\.json$/);
    await expect(page.getByText(DIALOG_TITLE)).toBeVisible();

    // Proceeding abandons the guest and signs into the target account.
    await page.getByRole("button", { name: "Sign in anyway", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    const sessionUser = await storedSessionUser(page);
    expect(sessionUser?.id).toBe(targetId);
    expect(sessionUser?.email).toBe(email);

    // The orphaned guest account is NOT deleted at abandonment (spec §6: only
    // lifecycle cleanup deletes) - account and row both still exist.
    const { data: orphan } = await admin.auth.admin.getUserById(guestId);
    expect(orphan.user?.id).toBe(guestId);
    const { data: rows } = await admin
      .from("gratitude_entries")
      .select("id")
      .eq("user_id", guestId);
    expect(rows?.length).toBe(1);
  });

  test("an empty guest signs straight in - no warning", async ({ page }) => {
    const email = `guest-abandon-empty-${Date.now()}@test.local`;
    targetId = await createTargetAccount(email);

    // This guest holds only auto rows (the normalized user_preferences); the
    // check must not count those, or every fresh guest would be warned about
    // data they never created.
    await signInAsTarget(page, email);

    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    expect((await storedSessionUser(page))?.id).toBe(targetId);
    await expect(page.getByText(DIALOG_TITLE)).toBeHidden();
  });
});

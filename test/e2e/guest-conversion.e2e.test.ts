// Guest conversion (#1443): email + password convert the guest IN PLACE.
//
// Plain @playwright/test, not ./fixtures: the worker fixture plants a POOL
// user's registered session, and this journey needs the opposite - a real
// anonymous session, minted at runtime via signInAnonymously (spec §10: no
// seeded guests). Requires `enable_anonymous_sign_ins = true` in
// supabase/config.toml (#1440) - auth config applies at `supabase start`, so a
// stack booted before that key existed fails the mint, not the app.

import { expect, test } from "@playwright/test";

// ☠️ From session-injection/guest-session, NOT ./fixtures: importing
// fixtures.ts registers its `beforeEach({ user })` pool-fixture hook on this
// plain-test file too, and every test here would die with "beforeEach hook has
// unknown parameter".
import { CAPTURE_STORAGE_KEY } from "./session-injection";
import { deleteGuest, startGuestSession } from "./guest-session";
import { createServiceClient } from "../integration/helpers";

test.describe("guest conversion", () => {
  let guestId: string;

  test.beforeEach(async ({ page }) => {
    guestId = await startGuestSession(page);
  });

  test.afterEach(async () => {
    await deleteGuest(guestId);
  });

  test("email + password convert the guest in place, keeping the user id", async ({ page }) => {
    const email = `guest-conv-${Date.now()}@test.local`;
    const guestItem = `Guest gratitude before conversion ${Date.now()}`;

    // A row the GUEST created (planted server-side; the UI journey for
    // creating one is create-gratitude-entry's job). Re-asserted through the
    // UI after conversion: same user id is the mechanism, but this proves the
    // refreshed registered JWT still reads the row through RLS.
    const admin = createServiceClient();
    const { error: plantError } = await admin
      .from("gratitude_entries")
      .insert({ user_id: guestId, item_1: guestItem });
    if (plantError) throw new Error(`Planting the guest row failed: ${plantError.message}`);

    await page.goto("/sign-up");

    // The guest is NOT redirected into the app - they get the conversion form.
    await expect(page.getByText("Create your account", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Your data comes with you - everything you've added stays."),
    ).toBeVisible();
    // No OAuth on the conversion form until #1445's linkIdentity path.
    await expect(page.getByText("Continue with Google")).toBeHidden();

    await page.locator('input[placeholder="m@example.com"]:visible').fill(email);
    const pwInputs = page.locator('input[type="password"]:visible');
    await pwInputs.nth(0).fill("guest-conv-pass-1234");
    await pwInputs.nth(1).fill("guest-conv-pass-1234");
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // Straight into the app (autoconfirm: no email, no interstitial).
    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    // The optional Home tour may pop for this fresh account; dismiss it so the
    // banner and gratitude assertions below run against a settled page (same
    // handling as sign-up-onboarding).
    const skipTour = page.getByRole("button", { name: "Skip all tips", exact: true });
    if (await skipTour.isVisible()) await skipTour.click();

    // The attached email is unverified - the existing banner layer takes over.
    await expect(page.getByText("Verify your email to secure your account.")).toBeVisible({
      timeout: 15_000,
    });

    // The conversion happened IN PLACE: same user id, is_anonymous
    // flipped, and the session in storage is the refreshed one (the JWT keeps
    // claiming guest until refreshSession - the refresh is part of the flow).
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      CAPTURE_STORAGE_KEY,
    );
    const session = JSON.parse(stored ?? "{}") as {
      user?: { id?: string; is_anonymous?: boolean; email?: string };
    };
    expect(session.user?.id).toBe(guestId);
    expect(session.user?.email).toBe(email);
    expect(session.user?.is_anonymous).toBeFalsy();

    // All guest data is present under the registered account: the entry the
    // guest logged is right there in the tool, read with the refreshed token.
    await page.goto("/tools/gratitude-log");
    await expect(page.getByText(guestItem)).toBeVisible({ timeout: 15_000 });
  });

  test("an email collision shows the inline error and Sign in instead prefills sign-in", async ({
    page,
  }) => {
    // Seeded pool user (supabase/seed.sql) - read-only here, so no cross-worker
    // interference: the conversion 422s before touching the account.
    const takenEmail = "e2e-w0@test.local";

    await page.goto("/sign-up");
    await expect(page.getByText("Create your account", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[placeholder="m@example.com"]:visible').fill(takenEmail);
    const pwInputs = page.locator('input[type="password"]:visible');
    await pwInputs.nth(0).fill("guest-conv-pass-1234");
    await pwInputs.nth(1).fill("guest-conv-pass-1234");
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // Inline, on the form - no pre-submit existence check, no navigation.
    await expect(page.getByText("An account with this email already exists.")).toBeVisible({
      timeout: 15_000,
    });

    // "Sign in instead" lands on sign-in (the guest is NOT bounced back into
    // the app - #1443 made the redirect is_anonymous-aware) with the typed
    // email prefilled.
    await page.getByRole("button", { name: "Sign in instead", exact: true }).click();
    await expect(page.getByTestId("sign-in-email")).toHaveValue(takenEmail, { timeout: 15_000 });
  });
});

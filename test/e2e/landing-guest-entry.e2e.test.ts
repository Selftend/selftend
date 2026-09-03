// Landing guest entry (#1441): the web landing's primary CTA creates a guest
// session in place and enters the app. Requires `enable_anonymous_sign_ins =
// true` in supabase/config.toml (#1440) - auth config applies at `supabase
// start`, so a stack booted before that key existed fails the mint, not the
// app. The dark fallback (anonymous_provider_disabled degrades the CTA to the
// sign-up form) cannot be toggled per-test on a shared stack, so it is pinned
// at the unit seam (use-start-as-guest.test.ts) instead.
//
// Plain @playwright/test, not ./fixtures: the worker fixture plants a POOL
// user's registered session, and this journey must start signed OUT on the
// marketing landing.

import { expect, test } from "@playwright/test";

// ☠️ From session-injection, NOT ./fixtures (its beforeEach pool hook would
// attach to this file and kill every test at 0ms).
import { CANDIDATE_STORAGE_KEYS } from "./session-injection";
import { clearAgeGate, dismissCookieBanner } from "./helpers";
import { createServiceClient } from "../integration/helpers";

test.describe("landing guest entry", () => {
  let guestId: string | undefined;

  test.afterEach(async () => {
    // The guest has no email, so delete by the id captured mid-test.
    if (!guestId) return;
    const admin = createServiceClient();
    await admin.auth.admin.deleteUser(guestId).catch(() => undefined);
  });

  test("the Start-now CTA creates a guest and enters the app", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    // The landing keeps sign-in and sign-up reachable beside the primary CTA,
    // and the durability line sits at the CTA.
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
    await expect(
      page.getByText(
        "Your data stays in this browser until you create an account - browsers can clear it.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Start now - no account needed", exact: true }).click();

    // Inside the authenticated shell: the AGE GATE is the first thing a fresh
    // account sees (#1764), and reaching it IS guest entry.
    //
    // ☠️ This is the only place in the suite that proves the gate covers the
    // GUEST path - spec #227 §3 was written against two entry paths and the app
    // has four, and the silent `signInAnonymously` guest is the one per-flow
    // plumbing would have missed. Every other spec plants a session whose
    // `policy_version_accepted` is already set, so the gate never fires there.
    const ageGateDay = page.getByTestId("age-gate-day");
    await expect(ageGateDay).toBeVisible({ timeout: 15_000 });

    // Capture the new guest's id for cleanup from whichever storage key the
    // bundle persisted under (see session-injection.ts on why it varies).
    guestId = await page.evaluate((keys) => {
      for (const key of keys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as { user?: { id?: string } };
          if (parsed.user?.id) return parsed.user.id;
        } catch {
          // Not a session payload - keep looking.
        }
      }
      return undefined;
    }, CANDIDATE_STORAGE_KEYS);
    expect(guestId).toBeTruthy();

    await clearAgeGate(page);

    // ...then the consent gate, which the age gate now sits above.
    const consentTitle = page.getByText("Quick policy check", { exact: true });
    await expect(consentTitle).toBeVisible({ timeout: 15_000 });

    await page.getByRole("checkbox").first().click();
    const acceptButton = page.getByRole("button", { name: "Accept and continue", exact: true });
    await expect(acceptButton).toBeEnabled({ timeout: 5_000 });
    await acceptButton.click();

    // ...followed by the onboarding wizard: the guest is in the app, created
    // without an email address, a password or a name. The age gate asks two
    // questions on the way in and keeps neither answer's source - the date of
    // birth is compared and dropped - so "no account needed" still holds.
    await expect(page.getByText("Welcome to Selftend")).toBeVisible({ timeout: 15_000 });
  });
});

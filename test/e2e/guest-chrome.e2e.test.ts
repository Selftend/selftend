// Guest chrome (#1442): sign-out and the verify-email banner must not exist
// for a guest. A guest's session token is the only key to their account, so
// signing out is silent irreversible data loss - the control is hidden on both
// surfaces (header menu, settings row) via useSignOut's shared guard. The
// verify banner has nothing to verify. Delete-account and export stay: for a
// guest, "start fresh" IS delete-account.
//
// Plain @playwright/test, not ./fixtures (see guest-session.ts's warning) -
// this journey needs a real anonymous session, minted at runtime.

import { expect, test } from "@playwright/test";

import { deleteGuest, startGuestSession } from "./guest-session";

test.describe("guest chrome", () => {
  let guestId: string;

  test.beforeEach(async ({ page }) => {
    guestId = await startGuestSession(page);
  });

  test.afterEach(async () => {
    await deleteGuest(guestId);
  });

  test("a guest sees no sign-out and no verify banner; delete-account stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    // The optional Home tour may pop for this fresh account; dismiss it so the
    // menu and settings assertions run against a settled page.
    const skipTour = page.getByRole("button", { name: "Skip all tips", exact: true });
    if (await skipTour.isVisible()) await skipTour.click();

    // The guest's planted prefs carry email_verified: false - exactly the
    // state in which a broken guard would render the banner.
    await expect(page.getByText("Verify your email to secure your account.")).toBeHidden();

    // Header menu: Settings proves the actions row rendered; Sign Out is the
    // absence under test, anchored by that sibling rather than vacuous.
    await page.getByRole("button", { name: "Open account menu", exact: true }).click();
    await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Out", exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Settings", exact: true }).click();

    // Settings account run: delete-account (and export) render, the sign-out
    // row does not.
    await expect(page.getByRole("button", { name: "Delete my account", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Export my data", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeHidden();
  });
});

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
import { dismissHomeTour } from "./helpers";

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

    // The Home tour arms a beat after the screen settles for this fresh
    // account, and its scrim intercepts the header clicks below - the waiting
    // helper, not a single isVisible sample (which raced and lost in CI).
    await dismissHomeTour(page);

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

  // #1869: the other half of the same chrome. Sign-out is hidden for a guest
  // (above), which left them with no account control at all - and no route to
  // the sign-in form from anywhere inside the app, since `app/index.tsx` bounces
  // any session past the landing screen's Sign in. This proves the form is
  // REACHABLE, which is the whole job of the door.
  //
  // ☠️ Its own test rather than more steps in the one above: pressing the row
  // navigates away, and that journey continues into Settings.
  //
  // ☠️ The warn-and-abandon confirm is deliberately NOT re-tested here. It fires
  // at SUBMIT, not on arrival - `useGuestAbandonGuard` wraps the submit handlers
  // inside `sign-in-form.tsx`, so a guest sees exactly what a signed-out visitor
  // sees on arrival - and `guest-signin-abandon.e2e.test.ts` already covers
  // submit → confirm end to end. Duplicating it here would add a slow test that
  // asserts someone else's contract.
  test("a guest reaches the sign-in form from the header menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await dismissHomeTour(page);

    await page.getByRole("button", { name: "Open account menu", exact: true }).click();
    // The identity row names the state the door is offered for (#1829/#1810) -
    // the anchor that keeps the assertion below from passing on a menu that
    // rendered for the wrong kind of user.
    await expect(page.getByText("Guest", { exact: true })).toBeVisible();

    await page.getByTestId("user-menu-sign-in-row").click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByTestId("sign-in-email")).toBeVisible({ timeout: 15_000 });
  });
});

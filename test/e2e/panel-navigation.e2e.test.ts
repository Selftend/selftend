/**
 * Panel navigation does not stack duplicate screens (#989).
 *
 * The nav panel is LATERAL navigation between peer destinations, but expo-router's
 * default NAVIGATE only reuses the route it is already ON — a target sitting deeper in
 * the stack is pushed again. So Routines → Home left TWO mounted Home screens, the
 * earlier one backgrounded and hidden, and every query Home mounts ran twice.
 *
 * This is a root-COUNT test rather than a visual one on purpose: both copies render, the
 * older one is merely hidden, so every visual assertion passed while the bug was live.
 * Counting roots is the only form of this test that can fail.
 */

import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";

import { dismissHomeTour, dismissPostSignInModals, navigateViaPanel } from "./helpers";

/** Counts hidden roots too, which is the whole point — the stale copy is invisible. */
const homeRoots = (page: Page) => page.getByTestId("home-layout").count();

test("returning to Home through the panel does not mount a second Home", async ({ page }) => {
  // `/`, not `/(app)`: that is how a signed-in user actually arrives (the root route
  // redirects), and it is the entry the rest of the suite uses.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Favourites", level: 2 })).toBeVisible({
    timeout: 15_000,
  });
  await dismissPostSignInModals(page);
  expect(await homeRoots(page)).toBe(1);

  // Two round trips, because one duplicate could be a one-off; an unbounded stack grows
  // by one Home per visit and that is the shape the bug actually had.
  for (let round = 0; round < 2; round++) {
    await navigateViaPanel(page, "Routines");
    await expect(page).toHaveURL(/\/routines/, { timeout: 15_000 });

    await navigateViaPanel(page, "Home");
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Favourites", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await dismissHomeTour(page);

    expect(await homeRoots(page)).toBe(1);
  }

  // `.first()` is the point: with the duplicate present it resolved to the hidden
  // backgrounded copy, which is why `routine-scheduling` had to reach for `.last()`.
  // One root means the plain locator is correct again.
  await expect(page.getByTestId("home-layout").first()).toBeVisible();

  // The accepted trade, pinned so it is a decision rather than a surprise. Singular
  // MOVES the existing screen to the top, and on web that replaces the history entry
  // instead of adding one: after a panel round trip the stack is [Routines, Home] and
  // history is [/, /], so the first Back lands on Home again rather than on Routines.
  // Measured against both alternatives before choosing: without the fix that Back went
  // to /routines but home was mounted twice; with `dismissTo` every panel navigation
  // replaced, so Back left the app from any destination. One absorbed Back press is the
  // cheapest of the three. What must NOT happen is Back resurrecting a second root.
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Favourites", level: 2 })).toBeVisible({
    timeout: 15_000,
  });
  expect(await homeRoots(page)).toBe(1);
});

/**
 * Panel navigation does not stack duplicate screens (#989).
 *
 * The nav panel is LATERAL navigation between peer destinations, but expo-router's
 * default NAVIGATE only reuses the route it is already ON — a target sitting deeper in
 * the stack is pushed again. So Routines → Home left TWO mounted Home screens, the
 * earlier one backgrounded and hidden, and every query Home mounts ran twice.
 *
 * This is a DOM-count test rather than a visual one on purpose: both copies render, the
 * older one is merely hidden, so every visual assertion passed while the bug was live.
 * Counting roots is the only form of this test that can fail.
 */

import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";

import { dismissPostSignInModals, navigateViaPanel } from "./helpers";

/**
 * The home tour spotlights the nav button, and its scrim sits ABOVE the open panel — so
 * an undismissed tour blocks the panel's links, not just the header. Product behaviour,
 * not a bug. It arms a beat after the screen settles, which is why this waits rather
 * than sampling `isVisible()` once: the sampled version saw nothing, skipped, and then
 * the tour armed while the panel was open.
 */
async function dismissTour(page: Page) {
  const skip = page.getByTestId("tour-skip-all");
  const showed = await skip
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (showed) {
    await skip.click();
    await expect(skip).toBeHidden({ timeout: 10_000 });
  }
}

const homeRoots = (page: Page) =>
  page.evaluate(() => document.querySelectorAll('[data-testid="home-layout"]').length);

test("returning to Home through the panel does not mount a second Home", async ({ page }) => {
  // `/`, not `/(app)`: that is how a signed-in user actually arrives (the root route
  // redirects), and it is the entry the rest of the suite uses.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
    timeout: 15_000,
  });
  // Clears the widget wizard and the tour in one go; `shown_button_tours` is persisted
  // by "Skip all tips", so the tour cannot re-arm later in the run.
  await dismissPostSignInModals(page);
  await dismissTour(page);
  expect(await homeRoots(page)).toBe(1);

  // Two round trips, because one duplicate could be a one-off; an unbounded stack grows
  // by one Home per visit and that is the shape the bug actually had.
  for (let round = 0; round < 2; round++) {
    await navigateViaPanel(page, "Routines");
    await expect(page).toHaveURL(/\/routines/, { timeout: 15_000 });

    await navigateViaPanel(page, "Home");
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Your tools", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await dismissTour(page);

    expect(await homeRoots(page)).toBe(1);
  }

  // `.first()` is the point: with the duplicate present it resolved to the hidden
  // backgrounded copy, which is why `routine-scheduling` had to reach for `.last()`.
  // One root means the plain locator is correct again.
  await expect(page.getByTestId("home-layout").first()).toBeVisible();
});

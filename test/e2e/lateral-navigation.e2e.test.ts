/**
 * Lateral navigation does not stack duplicate screens (#1027).
 *
 * expo-router's NAVIGATE reuses only the route it is already ON, so pushing a screen that
 * already sits deeper in the stack mounts a SECOND copy. Both run every hook and the
 * older one is hidden, so nothing looks wrong — which is why these are counted rather
 * than looked at. #989 fixed the nav panel; these are the imperative `router.push` sites.
 *
 * Both cases here are ones a user reaches without trying: a breadcrumb targets an
 * ancestor, which is in the stack by definition, and the policy pages push each other.
 */

import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";

import { dismissPostSignInModals } from "./helpers";

/**
 * One per mounted `/tools/check-in` screen.
 *
 * The subject moved here on #2096: this used to count `/modules`, whose own
 * breadcrumb was the ancestor being returned to. There is no `Modules` crumb any
 * more - `modules` is a transparent segment and `/modules/cbt` is its own top
 * crumb - so the guard needed a surviving two-crumb trail rather than a deleted
 * assertion. The bug it protects against is untouched by that.
 *
 * ⚠️ A TOOL home, not a module home. `ModuleHomeHeader` composes a count into the
 * stat line beside its title, so `text-is` on a module home is a locator that
 * breaks when the data changes; check-in's `<h1>` is the bare title. Both this
 * header and the `ScreenHeader` this used to count render through
 * `Text variant="h1"`, so the locator shape is unchanged.
 */
const checkInRoots = (page: Page) => page.locator('h1:text-is("Check-in")').count();

/** One per mounted `/privacy` screen — the BUTTON, since security's <h1> shares its words. */
const privacyRoots = (page: Page) =>
  page.locator('[role="button"]:has-text("How we protect your data")').count();

/**
 * ☠️ The counts below are CSS/text locators, never `getByRole`. A backgrounded screen is
 * `aria-hidden`, so it is absent from the accessibility tree entirely - `getByRole(...)
 * .count()` returns 1 whether or not the duplicate exists, and a role-based version of
 * this test passes against the unfixed app. Verified by mutation, not assumed. CSS and
 * text engines match the real DOM, hidden or not, which is the only way to see this bug.
 *
 * They are also scoped tightly enough to exclude look-alikes: the security page's <h1>
 * carries the same words as privacy's button, so the privacy count names the role
 * attribute rather than the text alone.
 */

test("a breadcrumb returns to its ancestor instead of stacking a second copy", async ({ page }) => {
  await page.goto("/tools/check-in");
  await expect(page.getByRole("heading", { name: "Check-in", exact: true, level: 1 })).toBeVisible({
    timeout: 15_000,
  });
  await dismissPostSignInModals(page);
  expect(await checkInRoots(page)).toBe(1);

  // Down one level, so `/tools/check-in` is now an ancestor sitting in the stack. The
  // week strip's own door to all history is the one in-app route down; a `page.goto`
  // here would defeat the test, because the ancestor has to be IN the stack for the
  // duplicate to be possible at all.
  await page.getByRole("link", { name: /Show all history/ }).click();
  await expect(page).toHaveURL(/\/tools\/check-in\/history$/, { timeout: 15_000 });

  // The breadcrumb's `Check-in` crumb targets that ancestor. Before #1027 this pushed a
  // second `/tools/check-in`, and every hook on it ran twice from then on. The crumb is
  // unambiguous now that the panel carries no per-tool rows (#2106), but `.first()` is
  // kept: this test is about counting duplicates, so it must never be the thing that
  // trips strict mode.
  await page.getByRole("link", { name: "Check-in", exact: true }).first().click();
  await expect(page).toHaveURL(/\/tools\/check-in$/, { timeout: 15_000 });
  // `.last()`, and deliberately: with the duplicate present `.first()` is the HIDDEN
  // backgrounded copy, so this readiness wait would fail on visibility and the duplicate
  // would be reported as "not visible" rather than by the COUNT below, which names it.
  await expect(
    page.getByRole("heading", { name: "Check-in", exact: true, level: 1 }).last(),
  ).toBeVisible({ timeout: 15_000 });

  expect(await checkInRoots(page)).toBe(1);

  // Back, measured on this surface rather than assumed from the policy one: the ticket's
  // own point is that "a breadcrumb's Back expectation is not a settings menu's". Singular
  // replaces the history entry rather than adding one, so Back holds here instead of
  // returning to the child - the same trade #989 accepted, and the duplicate must not
  // come back with it.
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Check-in", exact: true, level: 1 }).last(),
  ).toBeVisible({ timeout: 15_000 });
  expect(await checkInRoots(page)).toBe(1);
});

test("policy pages that cross-link do not stack copies of each other", async ({ page }) => {
  // Public pages, so this exercises the ROOT stack rather than the authenticated one.
  await page.goto("/privacy");
  const toSecurity = page.getByRole("button", { name: "How we protect your data" });
  await expect(toSecurity).toBeVisible({ timeout: 15_000 });
  expect(await privacyRoots(page)).toBe(1);

  await toSecurity.click();
  await expect(page).toHaveURL(/\/security/, { timeout: 15_000 });

  // Security pushes privacy straight back - the purest ping-pong in the app.
  await page.getByRole("button", { name: "Read the full Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "How we protect your data" })).toBeVisible({
    timeout: 15_000,
  });

  // One privacy screen, not two.
  expect(await privacyRoots(page)).toBe(1);

  // The same trade #989 measured and accepted, pinned here for the imperative sites too:
  // singular MOVES the screen to the top, which on web replaces the history entry rather
  // than adding one, so the first Back after a return lands where you already are. The
  // alternative (`dismissTo`) replaces on EVERY navigation and costs Back entirely. What
  // must never happen is Back resurrecting the duplicate.
  await page.goBack();
  await expect(page.getByRole("button", { name: "How we protect your data" })).toBeVisible({
    timeout: 15_000,
  });
  expect(await privacyRoots(page)).toBe(1);
});

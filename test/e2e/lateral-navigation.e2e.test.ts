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
 * ☠️ The pair is chosen for having NO DATA GATE, which cost a CI round to learn.
 * The obvious substitute - check-in, drilling into all-history - fails for a pool
 * user who has never logged a mood: the week section carrying the history link is
 * wrapped in `hasAnyCheckIn`, so the link is not merely hidden, it is never
 * rendered at all. (`log-mood` clicks that same link happily, because it saves an
 * entry first - which is exactly why the locator looked safe.) This screen's
 * header is a literal string and its cards come from a static `HABITS_LEARN_CARDS`
 * array, so both ends of the journey exist for a brand-new account.
 *
 * The title is distinctive enough to need no scoping, and `ScreenHeader` renders
 * it through `Text variant="h1"` - the same element the `/modules` count read.
 */
const learnRoots = (page: Page) =>
  page.locator('h1:text-is("Habit building - core ideas")').count();

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
  await page.goto("/tools/habits/learn");
  await expect(
    page.getByRole("heading", { name: "Habit building - core ideas", exact: true, level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
  await dismissPostSignInModals(page);
  expect(await learnRoots(page)).toBe(1);

  // Down one level, so `/tools/habits/learn` is now an ancestor sitting in the stack.
  // Through the card, never a `page.goto`: the bug needs the ancestor to be IN the
  // stack, and a hard navigation would replace the stack instead of growing it. A
  // `Pressable` with `role="button"`, not a link - it pushes through the Origin helper.
  await page.getByRole("button", { name: "The 1% compounding effect", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/habits\/learn\/compounding$/, { timeout: 15_000 });

  // The breadcrumb's `Learn` crumb targets that ancestor. Before #1027 this pushed a
  // second `/tools/habits/learn`, and every hook on it ran twice from then on. The trail
  // reads `Habits · Learn · The 1% compounding effect` - crumb 0 is `Habits` rather than
  // `Tools`, which is #2096 in the one place a user actually reads it.
  await page.getByRole("link", { name: "Learn", exact: true }).first().click();
  await expect(page).toHaveURL(/\/tools\/habits\/learn$/, { timeout: 15_000 });
  // `.last()`, and deliberately: with the duplicate present `.first()` is the HIDDEN
  // backgrounded copy, so this readiness wait would fail on visibility and the duplicate
  // would be reported as "not visible" rather than by the COUNT below, which names it.
  await expect(
    page
      .getByRole("heading", { name: "Habit building - core ideas", exact: true, level: 1 })
      .last(),
  ).toBeVisible({ timeout: 15_000 });

  expect(await learnRoots(page)).toBe(1);

  // Back, measured on this surface rather than assumed from the policy one: the ticket's
  // own point is that "a breadcrumb's Back expectation is not a settings menu's". Singular
  // replaces the history entry rather than adding one, so Back holds here instead of
  // returning to the child - the same trade #989 accepted, and the duplicate must not
  // come back with it.
  await page.goBack();
  await expect(
    page
      .getByRole("heading", { name: "Habit building - core ideas", exact: true, level: 1 })
      .last(),
  ).toBeVisible({ timeout: 15_000 });
  expect(await learnRoots(page)).toBe(1);
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

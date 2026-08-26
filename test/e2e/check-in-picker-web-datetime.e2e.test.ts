import { expect, test } from "./fixtures";

/**
 * The web check-in picker: calendar and time row in one view (#1302).
 *
 * Before this, the combined `datetime` mode toggled between a day grid and the
 * library's own web time wheel - a bare drag surface with no keyboard path and
 * no accessibility attributes at all (#1191) - and that toggle was also where
 * the card halved in height (300px -> 150px) on every mood/journal/gratitude/
 * sleep edit. On web this field now pairs a plain calendar with the app's own
 * typed `HH:MM` row underneath it, both mounted always, so there is exactly one
 * view and nothing to toggle.
 *
 * The mood check-in editor (`/tools/check-in/new`) is used only as a host for
 * the field - the same `DateTimeField` also ships on journal, gratitude and
 * sleep, so nothing here is mood-specific. No entry is ever saved, so there is
 * no seeded data to clean up afterwards.
 */

const TRIGGER = "Date & time";

test.describe("web check-in picker: one view for date and time", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/check-in/new");
    await expect(page.getByRole("button", { name: TRIGGER })).toBeVisible({ timeout: 15_000 });
  });

  test("opens on the calendar and the typed time row together, with no library time wheel", async ({
    page,
  }) => {
    await page.getByRole("button", { name: TRIGGER }).click();

    // Both halves present the moment the sheet opens - nothing has to be
    // toggled to reach either one.
    await expect(page.getByTestId("btn-month")).toBeVisible();
    await expect(page.getByLabel(`${TRIGGER}, hour`)).toBeVisible();
    await expect(page.getByLabel(`${TRIGGER}, minute`)).toBeVisible();

    // The thing this replaces is gone from the page entirely.
    await expect(page.locator('input[type="time"]')).toHaveCount(0);
  });

  test("the time is settable by keyboard alone, and Done commits it", async ({ page }) => {
    await page.getByRole("button", { name: TRIGGER }).click();

    // A fresh entry defaults to "now", and the field clamps any time past now
    // back to it (#1298) - so a typed minute has roughly even odds of landing
    // in the future within the same hour and being silently reverted. Moving
    // a month back first puts the whole day unambiguously in the past, so the
    // typed time below is never at risk of that clamp.
    await page.getByTestId("btn-prev").click();
    await page
      .getByTestId("days")
      .getByRole("button", { name: /\b15, \d{4}$/ })
      .click();

    const minute = page.getByLabel(`${TRIGGER}, minute`);
    await minute.click();
    await minute.fill("37");
    await page.keyboard.press("Tab");

    await page.getByRole("button", { name: "Done" }).click();

    // The row's own display text is how the field shows its commit - no form
    // save needed to observe it, and this is the same trigger the typed value
    // was entered under.
    await expect(page.getByRole("button", { name: TRIGGER }).getByText(/:37/)).toBeVisible();
  });

  test("the footer stays reachable on a small phone viewport and in landscape", async ({
    page,
  }) => {
    // iPhone SE with Safari's toolbars showing - the case the ticket names,
    // where the combined sheet used to miss the available height by 16px
    // without the shared sheet's scroll container.
    await page.setViewportSize({ width: 375, height: 505 });
    await page.getByRole("button", { name: TRIGGER }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeInViewport();

    // Phone landscape - the worst case measured in #1231, where every variant
    // (including the picker shipped before that map) overflows without a
    // scroll container. Resized with the sheet still open, rather than closed
    // and reopened, which keeps this test to the one thing it measures.
    // (The sheet's backdrop is no longer a labelled "Close" on web at all since
    // #1305 - it is out of the accessibility tree - so the page's own top-bar
    // Close is the only one left.)
    await page.setViewportSize({ width: 667, height: 320 });

    // "Reachable" means reachable by scrolling, not already on screen the
    // instant the viewport shrinks: at this size the card genuinely overflows,
    // and the scroll POSITION from the taller viewport carries over as-is (a
    // resize does not itself scroll anything). A real wheel gesture over the
    // sheet - not `scrollIntoViewIfNeeded()` - is what actually proves a user
    // can get there, the same way #1297 first measured this scroll container.
    await page.getByRole("dialog").hover();
    await page.mouse.wheel(0, 800);
    await expect(page.getByRole("button", { name: "Done" })).toBeInViewport();
  });
});

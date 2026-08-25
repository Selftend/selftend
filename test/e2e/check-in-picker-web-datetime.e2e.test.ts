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
    await page.getByRole("button", { name: "Close" }).click();

    // Phone landscape - the worst case measured in #1231, where every variant
    // (including the picker shipped before that map) overflows without a
    // scroll container.
    await page.setViewportSize({ width: 667, height: 320 });
    await page.getByRole("button", { name: TRIGGER }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeInViewport();
  });
});

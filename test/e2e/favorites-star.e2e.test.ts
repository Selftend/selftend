import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

import { deleteAllFavoritesForUser, dismissPostSignInModals } from "./helpers";

/**
 * Press the star and wait for its write to COMMIT. The star flips optimistically and
 * fires no success toast (ADR-0004), so the only honest "the row is there" signal is the
 * PostgREST response itself - a reload issued on the optimistic flip alone aborts the
 * request in flight and reads back the pre-press state.
 */
async function pressStarAndAwaitWrite(page: Page, star: Locator, method: "POST" | "DELETE") {
  const written = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/favorites") &&
      response.request().method() === method &&
      response.ok(),
  );
  await star.click();
  await written;
}

/**
 * The star is LIVE on `/tools` and `/modules` (#1955): a press writes a `favorites` row,
 * the filled state survives a reload, a second press reverses it, and nothing toasts on
 * the way. Home does not render the result yet (next slice); this proves the write.
 *
 * The star's state is read through `aria-pressed`, which `toggleButtonStateProps` puts
 * on the star's Pressable on web - the same attribute a screen reader announces.
 *
 * Grounding and DBT are used deliberately: neither is in any seeded layout, so a leftover
 * row from another run cannot make the "starts hollow" assertion pass by accident.
 */
test.describe("favourites: the star on the catalogue pages", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllFavoritesForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllFavoritesForUser(user.id);
  });

  test("starring a tool on /tools persists across a reload and a second press undoes it", async ({
    page,
  }) => {
    await page.goto("/tools");
    await expect(page.getByText("Standalone trackers", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    await dismissPostSignInModals(page);

    const star = page.getByTestId("card-star-tool-grounding");
    // No star is drawn until the favourites list is in; this wait IS that load.
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await expect(star).toHaveAccessibleName("Favourite Grounding");

    await pressStarAndAwaitWrite(page, star, "POST");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await expect(star).toHaveAccessibleName("Remove Grounding from favourites");
    // No success toast (ADR-0004): the star's own state is the whole feedback.
    await expect(page.getByTestId("app-toast")).toHaveCount(0);

    // The write, not the optimistic flip: a fresh load reads the row back.
    await page.reload();
    await expect(page.getByText("Standalone trackers", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    const starAfterReload = page.getByTestId("card-star-tool-grounding");
    await expect(starAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "true");

    await pressStarAndAwaitWrite(page, starAfterReload, "DELETE");
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "false");

    await page.reload();
    await expect(page.getByText("Standalone trackers", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    const starAfterUndo = page.getByTestId("card-star-tool-grounding");
    await expect(starAfterUndo).toBeVisible({ timeout: 15_000 });
    await expect(starAfterUndo).toHaveAttribute("aria-pressed", "false");
  });

  test("starring a module on /modules persists, and the star never opens the module", async ({
    page,
  }) => {
    await page.goto("/modules");
    await expect(page.getByText("Structured therapeutic programmes", { exact: false })).toBeVisible(
      { timeout: 15_000 },
    );
    await dismissPostSignInModals(page);

    const star = page.getByTestId("card-star-module-dbt");
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");

    await pressStarAndAwaitWrite(page, star, "POST");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    // The star is a sibling of the navigating region, not a child: pressing it stays put.
    await expect(page).toHaveURL(/\/modules$/);

    await page.reload();
    await expect(page.getByText("Structured therapeutic programmes", { exact: false })).toBeVisible(
      { timeout: 15_000 },
    );
    const starAfterReload = page.getByTestId("card-star-module-dbt");
    await expect(starAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "true");
  });
});

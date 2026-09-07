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
 * The star is LIVE on Home (#1955): a press writes a `favorites` row, the filled state
 * survives a reload, a second press reverses it, and nothing toasts on the way.
 *
 * The subject MOVED on #2114, it did not shrink. These two journeys ran on `/tools` and
 * `/modules`, where the star first landed; those pages are gone and Home renders the same
 * eight tools and three modules through the same card, so the catalogue this spec proves
 * the write against is now Home's own Tools and Modules sections.
 *
 * ☠️☠️ Every card and star lookup below is SCOPED to its section, and this suite is the
 * one that most needs it: pressing the star is what puts the item into Favourites, and a
 * favourited item renders TWICE on Home - once under Favourites, once in the catalogue
 * below - through the same component under the same `testID`. A bare
 * `getByTestId("card-star-tool-grounding")` is therefore green on the first lookup and a
 * Playwright strict-mode violation on every one after the press lands, including the
 * post-reload re-lookups. The section holds the whole catalogue whatever Favourites
 * holds, which makes the scoped lookup deterministic in both states.
 *
 * The star's state is read through `aria-pressed`, which `toggleButtonStateProps` puts
 * on the star's Pressable on web - the same attribute a screen reader announces.
 *
 * Grounding and DBT are used deliberately: neither is in any seeded layout, so a leftover
 * row from another run cannot make the "starts hollow" assertion pass by accident.
 *
 * ☠️ Readiness is the section's own card count, not a line of prose. The hub descriptions
 * these tests used to wait on were deleted with the pages, and Home's headings are short
 * enough to appear elsewhere; a full catalogue is the signal that the favourites query has
 * resolved and the cards are drawn, which is what the star needs to exist.
 *
 * Written on the parallel build of #1955 (PR #1969, superseded) and adopted here.
 */
const toolsSection = (page: Page) => page.getByTestId("home-tools");
const modulesSection = (page: Page) => page.getByTestId("home-modules");

/** Home is up and its catalogue is drawn: eight tools and three modules, always. */
async function awaitHomeCatalogue(page: Page) {
  await expect(toolsSection(page).locator('[data-testid^="card-tool-"]')).toHaveCount(8, {
    timeout: 15_000,
  });
  await expect(modulesSection(page).locator('[data-testid^="card-module-"]')).toHaveCount(3, {
    timeout: 15_000,
  });
}

test.describe("favourites: the star on Home's catalogue", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllFavoritesForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllFavoritesForUser(user.id);
  });

  test("starring a tool on Home persists across a reload and a second press undoes it", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissPostSignInModals(page);
    await awaitHomeCatalogue(page);

    const star = toolsSection(page).getByTestId("card-star-tool-grounding");
    // No star is drawn until the favourites list is in; this wait IS that load.
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await expect(star).toHaveAccessibleName("Favourite Grounding");

    await pressStarAndAwaitWrite(page, star, "POST");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await expect(star).toHaveAccessibleName("Remove Grounding from favourites");
    // No success toast (ADR-0004): the star's own state is the whole feedback.
    await expect(page.getByTestId("app-toast")).toHaveCount(0);

    // The second card, and the reason every lookup here is scoped: the press just put
    // Grounding into Favourites, so this same testID now matches twice on the page.
    await expect(page.getByTestId("card-star-tool-grounding")).toHaveCount(2);

    // The write, not the optimistic flip: a fresh load reads the row back.
    await page.reload();
    await awaitHomeCatalogue(page);
    const starAfterReload = toolsSection(page).getByTestId("card-star-tool-grounding");
    await expect(starAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "true");

    await pressStarAndAwaitWrite(page, starAfterReload, "DELETE");
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "false");

    await page.reload();
    await awaitHomeCatalogue(page);
    const starAfterUndo = toolsSection(page).getByTestId("card-star-tool-grounding");
    await expect(starAfterUndo).toBeVisible({ timeout: 15_000 });
    await expect(starAfterUndo).toHaveAttribute("aria-pressed", "false");
  });

  test("starring a module on Home persists, and the star never opens the module", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissPostSignInModals(page);
    await awaitHomeCatalogue(page);

    const star = modulesSection(page).getByTestId("card-star-module-dbt");
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");

    await pressStarAndAwaitWrite(page, star, "POST");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    // The star is a sibling of the navigating region, not a child: pressing it stays put.
    // Home is the root, so "stayed" is asserted on the pathname rather than a suffix.
    expect(new URL(page.url()).pathname).toBe("/");

    await page.reload();
    await awaitHomeCatalogue(page);
    const starAfterReload = modulesSection(page).getByTestId("card-star-module-dbt");
    await expect(starAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "true");
  });
});

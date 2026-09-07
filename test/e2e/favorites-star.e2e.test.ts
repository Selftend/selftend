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
 * The star is LIVE on Home's catalogue (#1955): a press writes a `favorites` row, the
 * filled state survives a reload, a second press reverses it, and nothing toasts on the
 * way.
 *
 * The subject moved here on #2114: this ran on `/tools` and `/modules`, which are no
 * longer pages. Home is where the catalogue always was in full — the hubs listed a
 * subset of it — and it renders the same rows through the same `item-card.tsx`.
 *
 * ☠️ **Every card and star lookup is SCOPED to its section, and it has to be.** Home
 * renders a favourited item TWICE: once under Favourites (#1956) and again in its
 * catalogue position, through the same component with the same `testID`. This suite is
 * the one that creates that duplicate — the first press does it — so a bare
 * `getByTestId("card-star-tool-grounding")` is a strict-mode violation from that moment
 * on, and the post-reload re-lookups are worse. `getByTestId("home-tools")` /
 * `("home-modules")` are the scopes; they are also the readiness signal, since Home
 * renders both sections for every account with no data gate in front of either.
 *
 * The star's state is read through `aria-pressed`, which `toggleButtonStateProps` puts
 * on the star's Pressable on web - the same attribute a screen reader announces.
 *
 * Grounding and DBT are used deliberately: neither is in any seeded layout, so a leftover
 * row from another run cannot make the "starts hollow" assertion pass by accident.
 *
 * Written on the parallel build of #1955 (PR #1969, superseded) and adopted here.
 */
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
    const tools = page.getByTestId("home-tools");
    await expect(tools).toBeVisible({ timeout: 15_000 });
    await dismissPostSignInModals(page);

    const star = tools.getByTestId("card-star-tool-grounding");
    // No star is drawn until the favourites list is in; this wait IS that load.
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await expect(star).toHaveAccessibleName("Favourite Grounding");

    await pressStarAndAwaitWrite(page, star, "POST");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await expect(star).toHaveAccessibleName("Remove Grounding from favourites");
    // No success toast (ADR-0004): the star's own state is the whole feedback.
    await expect(page.getByTestId("app-toast")).toHaveCount(0);
    // The second card the scoping exists for: the press put Grounding under
    // Favourites too, so the unscoped testID now matches twice.
    await expect(
      page.getByTestId("home-favourites").getByTestId("card-tool-grounding"),
    ).toBeVisible({ timeout: 15_000 });

    // The write, not the optimistic flip: a fresh load reads the row back.
    await page.reload();
    const toolsAfterReload = page.getByTestId("home-tools");
    await expect(toolsAfterReload).toBeVisible({ timeout: 15_000 });
    const starAfterReload = toolsAfterReload.getByTestId("card-star-tool-grounding");
    await expect(starAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "true");

    await pressStarAndAwaitWrite(page, starAfterReload, "DELETE");
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "false");

    await page.reload();
    const toolsAfterUndo = page.getByTestId("home-tools");
    await expect(toolsAfterUndo).toBeVisible({ timeout: 15_000 });
    const starAfterUndo = toolsAfterUndo.getByTestId("card-star-tool-grounding");
    await expect(starAfterUndo).toBeVisible({ timeout: 15_000 });
    await expect(starAfterUndo).toHaveAttribute("aria-pressed", "false");
  });

  test("starring a module on Home persists, and the star never opens the module", async ({
    page,
  }) => {
    await page.goto("/");
    const modules = page.getByTestId("home-modules");
    await expect(modules).toBeVisible({ timeout: 15_000 });
    await dismissPostSignInModals(page);

    const star = modules.getByTestId("card-star-module-dbt");
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");

    await pressStarAndAwaitWrite(page, star, "POST");
    await expect(star).toHaveAttribute("aria-pressed", "true");
    // The star is a sibling of the navigating region, not a child: pressing it stays put.
    // Home is the origin now, so the assertion is that the URL still has no path at all.
    await expect(page).toHaveURL(/:\d+\/$/);

    await page.reload();
    const modulesAfterReload = page.getByTestId("home-modules");
    await expect(modulesAfterReload).toBeVisible({ timeout: 15_000 });
    const starAfterReload = modulesAfterReload.getByTestId("card-star-module-dbt");
    await expect(starAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(starAfterReload).toHaveAttribute("aria-pressed", "true");
  });
});

/**
 * Arrange-screen e2e (#980).
 *
 * A rewrite, not a patch. The previous suite drove the add modal's search placeholder,
 * its `Add` pill, its own `Done`, the `Edit widgets` toggle and the `Drag to rearrange`
 * hint - every one of which left with `AddWidgetModal` and the edit mode. Its closing
 * block also ADMITTED that reorder was never asserted, blaming a `Sortable.Flex` the
 * screen had already stopped using.
 *
 * So reorder had no coverage at all, and this suite carries its first real assertion.
 * It is driven through the drag handle's KEYBOARD path rather than a synthetic drag: the
 * keyboard path is a shipped accessibility requirement (drag alone only partially answers
 * WCAG 2.2 SC 2.5.7), so this tests something users have rather than simulating a gesture
 * Playwright cannot faithfully produce. The move is asserted against the STORE as well as
 * the render - a row that moves on screen and snaps back on reload is exactly the failure
 * #975 removed from the tool tier.
 *
 * ⚠️ Home locators were `` because panel navigation left TWO mounted home roots and
 * `.first()` resolved to the hidden one. #989 fixed that, so they are plain again — a
 * strict-mode violation here means the duplicate is back. The one genuine ambiguity that
 * remains is unrelated: `Sleep` names both the Right now nudge and the tool row on a
 * single home, so that assertion goes by testID rather than by text.
 */

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

import {
  createServiceClient,
  dismissPostSignInModals,
  resetWidgetPreferencesForUser,
} from "./helpers";

const CHECK_IN = "Check-in";
const SELF_CARE = "Self-care log";
const CBT_PROGRAMME = "CBT programme";

// Seeded in a known order, so "the order changed" is a statement about the write rather
// than about whatever the seed happened to contain.
async function seedWidgets(userId: string, widgetIds: string[]) {
  const admin = createServiceClient();
  const { error } = await admin
    .from("widget_preferences")
    .insert(widgetIds.map((widget_id, position) => ({ user_id: userId, widget_id, position })));
  if (error) throw new Error(error.message);
}

/** The stored order, which is the fact `set_widget_order` is judged on. */
async function storedOrder(userId: string): Promise<string[]> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("widget_preferences")
    .select("widget_id")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.widget_id as string);
}

/**
 * The tool tier as arrange DRAWS it, ordered by where each handle actually sits.
 *
 * Not by DOM order: `Sortable.Grid` positions its items with transforms, so the document
 * order is an implementation detail and reading it would assert the wrong thing. Callers
 * wrap this in `expect.poll` - a react-native-web slide reports a stale box for ~250ms
 * after it starts, so the first reading can legitimately be the old layout.
 */
async function renderedToolOrder(page: Page): Promise<string[]> {
  const handles = await page.locator('[data-testid^="arrange-handle-"]').all();
  const placed = await Promise.all(
    handles.map(async (handle) => ({
      id: ((await handle.getAttribute("data-testid")) ?? "").replace("arrange-handle-", ""),
      y: (await handle.boundingBox())?.y ?? 0,
    })),
  );
  return placed.sort((a, b) => a.y - b.y).map((entry) => entry.id);
}

test.describe("home arrange screen", () => {
  test.beforeEach(async ({ user }) => {
    // Empty is a deliberate, stable state; defaults are never auto-seeded.
    await resetWidgetPreferencesForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await resetWidgetPreferencesForUser(user.id);
  });

  test("adds from the chip run, reorders by keyboard, removes and undoes, then Done returns home", async ({
    page,
    user,
  }) => {
    await seedWidgets(user.id, ["mood-checkin", "sleep-latest", "cbt-programme"]);

    await page.goto("/(app)");
    await dismissPostSignInModals(page);
    await expect(page.getByRole("heading", { name: "Your tools", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // --- Arrange is a ROUTE, reached from home's tune action -----------------
    await page.getByRole("button", { name: "Arrange", exact: true }).click();
    await expect(page).toHaveURL(/\/arrange$/);

    // The banner is the one sentence. The design's second - "Nothing is deleted -
    // it stays in Tools" - was false for most removable ids and is not shipped.
    await expect(
      page.getByText("Drag to reorder, or remove what you don't check in with."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/stays in Tools/i)).toHaveCount(0);

    // Both tiers, named with home's own tier names. The programme section is the one
    // the drawn screen could not reach at all.
    await expect(page.getByRole("heading", { name: "Your tools", exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Guided programmes", exact: true }),
    ).toBeVisible();

    // --- Add from the chip run ----------------------------------------------
    // No search field: the run is complete and registry-ordered, so there is nothing
    // to search for that is not already in view.
    await expect(page.getByPlaceholder("Search widgets...")).toHaveCount(0);
    await page.getByTestId("arrange-chip-self-care").click();
    // Added ids leave the run - it is add-only.
    await expect(page.getByTestId("arrange-chip-self-care")).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("arrange-handle-self-care")).toBeVisible();
    expect(await storedOrder(user.id)).toEqual([
      "mood-checkin",
      "sleep-latest",
      "cbt-programme",
      "self-care",
    ]);

    // --- Reorder through the handle's keyboard path --------------------------
    // The suite's FIRST reorder assertion. `role="button"` makes the handle a tab stop
    // on web (react-native-web gives a button-role View tabIndex 0), so it focuses and
    // takes the arrow keys.
    const firstHandle = page.getByTestId("arrange-handle-mood-checkin");
    await firstHandle.focus();
    await expect(firstHandle).toBeFocused();
    await page.keyboard.press("ArrowDown");

    // The store moved...
    await expect
      .poll(() => storedOrder(user.id), { timeout: 10_000 })
      .toEqual(["sleep-latest", "mood-checkin", "cbt-programme", "self-care"]);
    // ...and so did the render. Both, because either one alone is the snap-back lie.
    await expect
      .poll(() => renderedToolOrder(page), { timeout: 10_000 })
      .toEqual(["sleep-latest", "mood-checkin", "self-care"]);

    // ☠️ And AGAIN, without re-focusing. Reordering by keyboard has to work more than
    // once per row: `focusable` is `tabIndex` under react-native-web, so if the handle
    // stopped being focusable while the write settled, this second press would land on
    // the document and the row would stop moving after one step.
    await expect(firstHandle).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() => storedOrder(user.id), { timeout: 10_000 })
      .toEqual(["sleep-latest", "self-care", "cbt-programme", "mood-checkin"]);
    await expect
      .poll(() => renderedToolOrder(page), { timeout: 10_000 })
      .toEqual(["sleep-latest", "self-care", "mood-checkin"]);

    // The programme row never entered either write: `set_widget_order` reassigns only the
    // positions its named ids already hold, and only the tool tier is named - so
    // `cbt-programme` sat at position 2 throughout. It has no handle at all; its order is
    // not the user's to set (#977).
    await expect(page.getByTestId("arrange-handle-cbt-programme")).toHaveCount(0);

    // --- Remove a programme card, and get it back from the chip that returns ---
    await page.getByRole("button", { name: `Remove ${CBT_PROGRAMME}`, exact: true }).click();
    await expect(page.getByTestId("arrange-chip-cbt-programme")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Guided programmes", exact: true }),
    ).toBeHidden();

    // Undo restores it to the index it held in the FULL preference order - position 2,
    // between the tool rows it sat among, not appended at the tail (#964).
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Guided programmes", exact: true })).toBeVisible(
      { timeout: 10_000 },
    );
    await expect
      .poll(() => storedOrder(user.id), { timeout: 10_000 })
      .toEqual(["sleep-latest", "self-care", "cbt-programme", "mood-checkin"]);

    // --- Remove a tool row, and leave it removed -----------------------------
    await page.getByRole("button", { name: `Remove ${SELF_CARE}`, exact: true }).click();
    await expect(page.getByTestId("arrange-chip-self-care")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("arrange-handle-self-care")).toHaveCount(0);

    // --- Done is router.back() ------------------------------------------------
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your tools", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // Home renders the order arrange wrote, and the removal stuck. By testID, not by text:
    // `Sleep` also names the Right now nudge, so the bare string matches twice on one home.
    await expect(page.getByTestId("tool-row-sleep-latest")).toBeVisible();
    await expect(page.getByTestId("tool-row-mood-checkin")).toBeVisible();
    await expect(page.getByText(SELF_CARE, { exact: true })).toHaveCount(0);
    // `mood-checkin` last, because two keyboard moves took it there and both stuck. The
    // programme row is still at the position it was seeded into, untouched by either.
    expect(await storedOrder(user.id)).toEqual(["sleep-latest", "cbt-programme", "mood-checkin"]);
  });

  test("browser back is Done, and home carries no arrange controls of its own", async ({
    page,
    user,
  }) => {
    await seedWidgets(user.id, ["mood-checkin", "sleep-latest"]);

    await page.goto("/(app)");
    await dismissPostSignInModals(page);
    await expect(page.getByRole("heading", { name: "Your tools", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // Home has no editing affordance left: no per-row remove, no move chevrons, no
    // `Drag to rearrange` hint. Both header actions are doors to the route.
    await expect(page.getByRole("button", { name: `Remove ${CHECK_IN}` })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Move ${CHECK_IN} earlier` })).toHaveCount(0);
    await expect(page.getByText("Drag to rearrange")).toHaveCount(0);

    // `Add tool` leads to the same screen as `Arrange`: adding lives there as the chip
    // run now that the modal is gone.
    await page.getByRole("button", { name: "Add tool", exact: true }).click();
    await expect(page).toHaveURL(/\/arrange$/);
    await expect(page.getByTestId("arrange-chip-self-care")).toBeVisible({ timeout: 10_000 });

    // Browser back is Done by construction, because Done IS back.
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Your tools", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Drag to reorder, or remove what you don't check in with."),
    ).toHaveCount(0);
  });
});

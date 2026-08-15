/**
 * Manage-emotions reorder e2e (#965).
 *
 * The emotion list had no non-drag way to change its order, which fails WCAG 2.2 SC 2.5.7
 * (Dragging Movements, AA) and left a screen-reader or keyboard-only user able to add,
 * rename and delete emotions but not to order them - and order is the whole point of the
 * surface, since it sets the check-in picker's arrangement.
 *
 * Driven through the handle's KEYBOARD path rather than a synthetic drag, for the same
 * reason `home-widgets.e2e` is: the keyboard path is the shipped accessibility
 * requirement, and it is the half jest cannot see at all (jest runs the native platform,
 * where `arrowKeyMoveProps` is a no-op by design). The move is asserted against the STORE
 * as well as the render - a row that moves on screen and snaps back on reload is a lie,
 * not a reorder.
 *
 * ⚠️ This surface is a `Modal`, not a route, which is what makes it worth its own spec
 * even though `arrange-screen` proves the same helper elsewhere: the handle has to be
 * reachable by Tab INSIDE react-native-web's modal, and nesting inside `Sortable.Handle`
 * inside a second `GestureHandlerRootView` must not take it out of the tab order.
 */

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

import { createServiceClient, dismissPostSignInModals } from "./helpers";

/**
 * Three emotions in a known order, so "the order changed" is a statement about the write
 * rather than about whatever the default seed happened to contain. `emotions_seeded` is
 * set with them: `listOrSeedEmotions` only seeds an EMPTY list, but the flag is what keeps
 * a later empty state from re-seeding 22 defaults underneath the assertions.
 */
const SEEDED = ["anxious", "grateful", "sad"] as const;
const NAMES: Record<(typeof SEEDED)[number], string> = {
  anxious: "Anxious",
  grateful: "Grateful",
  sad: "Sad",
};

async function seedEmotions(userId: string) {
  const admin = createServiceClient();
  await admin.from("emotion_preferences").delete().eq("user_id", userId);
  const { error } = await admin.from("emotion_preferences").insert(
    SEEDED.map((emotion_id, position) => ({
      user_id: userId,
      emotion_id,
      position,
      is_custom: false,
    })),
  );
  if (error) throw new Error(error.message);
  const { error: flagError } = await admin
    .from("user_preferences")
    .upsert({ user_id: userId, emotions_seeded: true }, { onConflict: "user_id" });
  if (flagError) throw new Error(flagError.message);
}

async function clearEmotions(userId: string) {
  const admin = createServiceClient();
  await admin.from("emotion_preferences").delete().eq("user_id", userId);
}

/** The stored order, which is the fact `setEmotionOrder` is judged on. */
async function storedOrder(userId: string): Promise<string[]> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("emotion_preferences")
    .select("emotion_id")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.emotion_id as string);
}

/** The order as drawn, read off the rows' own edit labels. */
async function renderedOrder(page: Page): Promise<string[]> {
  const labels = await page.getByRole("button", { name: /^Edit / }).all();
  const names = await Promise.all(labels.map((row) => row.getAttribute("aria-label")));
  return names.map((name) => (name ?? "").replace(/^Edit /, ""));
}

test.describe("manage emotions reorder", () => {
  test.beforeEach(async ({ user }) => {
    await seedEmotions(user.id);
  });

  test.afterEach(async ({ user }) => {
    await clearEmotions(user.id);
  });

  test("alice reorders her emotions with the keyboard, twice, without touching a drag", async ({
    page,
    user,
  }) => {
    await page.goto("/tools/check-in/new");
    await dismissPostSignInModals(page);

    await page.getByRole("button", { name: "Manage emotions", exact: true }).click();
    await expect(page.getByText("Manage emotions")).toBeVisible({ timeout: 10_000 });
    expect(await renderedOrder(page)).toEqual([NAMES.anxious, NAMES.grateful, NAMES.sad]);

    // `role="button"` is what makes the handle a tab stop on web: react-native-web gives a
    // button-role View tabIndex 0 unless `focusable === false`. So it focuses, and takes
    // the arrow keys.
    const handle = page.getByTestId("emotion-reorder-handle-anxious");
    await handle.focus();
    await expect(handle).toBeFocused();
    await page.keyboard.press("ArrowDown");

    // The store moved...
    await expect
      .poll(() => storedOrder(user.id), { timeout: 10_000 })
      .toEqual(["grateful", "anxious", "sad"]);
    // ...and so did the render. Both, because either one alone is the snap-back lie.
    await expect
      .poll(() => renderedOrder(page), { timeout: 10_000 })
      .toEqual([NAMES.grateful, NAMES.anxious, NAMES.sad]);

    // ☠️ And AGAIN, without re-focusing. `focusable` is `tabIndex` under react-native-web,
    // so if it folded in "a write is in flight" the handle would leave the tab order while
    // the reorder settled, this second press would land on the document, and reordering by
    // keyboard would work exactly once per row.
    await expect(handle).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() => storedOrder(user.id), { timeout: 10_000 })
      .toEqual(["grateful", "sad", "anxious"]);
    await expect
      .poll(() => renderedOrder(page), { timeout: 10_000 })
      .toEqual([NAMES.grateful, NAMES.sad, NAMES.anxious]);

    // A third press would leave the list, and that is a no-op rather than a wrong write.
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(500);
    expect(await storedOrder(user.id)).toEqual(["grateful", "sad", "anxious"]);

    // Back up to where it started, so the two directions are both exercised.
    await page.keyboard.press("ArrowUp");
    await expect
      .poll(() => storedOrder(user.id), { timeout: 10_000 })
      .toEqual(["grateful", "anxious", "sad"]);

    // The reorder never opened the editor. The handle is a SIBLING of the row's press
    // target, not a child of it (#915/#922) - nesting it would fire the row press on
    // release, and making the handle interactive is exactly the change that tempts that.
    await expect(page.getByText("Manage emotions")).toBeVisible();
    await expect(page.getByText("Edit emotion")).toHaveCount(0);
  });
});

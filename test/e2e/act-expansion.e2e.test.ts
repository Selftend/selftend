import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/act/expansion/new  — ActExpansionNewScreen (multi-step wizard)
 *   /modules/act/expansion      — ActExpansionListScreen (filters to selectedDate = today)
 *   /modules/act/expansion/[id] — ActExpansionDetailScreen
 *
 * Wizard steps (5):
 *   1. emotion — Textarea "What emotion is present?" + NumberRating 0–100 intensity before
 *   2. body    — Textarea "Where do you feel it in your body?"
 *   3. struggle — Pressable "Yes - I'm resisting..." or "No - I'm just noticing it"
 *                + optional discomfort type ("The original feeling..." | "Extra suffering...")
 *   4. technique — Pressable cards (default "TAME It with Kindness")
 *   5. after   — NumberRating 0–100 intensity after + optional notes textarea
 *
 * DELETE only — no edit affordance.
 */

test.describe("ACT expansion: create, view, delete", () => {
  test.beforeEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });

  test("alice creates an expansion log, views it, and deletes it", async ({ page }) => {
    const emotionText = "Dread before a difficult conversation.";
    const bodyText = "Tight chest, heaviness in the stomach.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to new ────────────────────────────────────────────────────────
    await page.goto("/modules/act/expansion/new");

    // ── Step 1: Emotion + intensity before ───────────────────────────────────
    await page.getByPlaceholder("e.g. anxiety, dread, shame, anger").fill(emotionText);

    // Rate intensity before at 70
    await page.getByRole("button", { name: "70", exact: true }).click();

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Body sensation ────────────────────────────────────────────────
    await page
      .getByPlaceholder("e.g. tightness in the chest, heaviness in the stomach")
      .fill(bodyText);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Struggle switch ───────────────────────────────────────────────
    // Select "Yes - I'm resisting or trying to get rid of it"
    await page
      .getByRole("button", { name: "Yes - I'm resisting or trying to get rid of it", exact: true })
      .click();
    // Select discomfort type "The original feeling, as it is"
    await page.getByRole("button", { name: "The original feeling, as it is", exact: true }).click();

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 4: Technique — default is "fourStepExpansion" (TAME It with Kindness) ─
    // Just continue with the default
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 5: Intensity after + notes ──────────────────────────────────────
    // Rate intensity after at 40
    await page.getByRole("button", { name: "40", exact: true }).click();

    // Save
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // ── Navigate to list ───────────────────────────────────────────────────────
    await page.goto("/modules/act/expansion");
    await expect(page.getByText(emotionText)).toBeVisible({ timeout: 15_000 });

    // ── Open detail ────────────────────────────────────────────────────────────
    await page.getByText(emotionText).first().click();
    await expect(page).toHaveURL(/\/modules\/act\/expansion\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(emotionText).last()).toBeVisible({ timeout: 10_000 });

    // ── Delete ──────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After delete, router.replace('/modules/act/expansion') is called.
    await expect(page).toHaveURL(/\/modules\/act\/expansion$/, { timeout: 15_000 });
    // The log should be gone from the list.
    await expect(page.getByText(emotionText)).toBeHidden({ timeout: 10_000 });
  });
});

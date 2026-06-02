import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/act/connection/new  - ActConnectionNewScreen (multi-step wizard)
 *   /modules/act/connection      - ActConnectionListScreen (filters to selectedDate = today)
 *   /modules/act/connection/[id] - ActConnectionDetailScreen
 *
 * Wizard steps (4):
 *   1. technique  - Pressable cards (default "noticeFiveThings" = "Notice Five Things")
 *   2. exercise   - Guidance card shown; for "noticeFiveThings" no input needed
 *   3. notices    - Textarea "What did you notice?"
 *   4. after      - NumberRating 1–10 mood after + optional notes textarea
 *
 * List card shows: log.noticesFromSenses || technique name as primary text.
 * Detail heading: log.noticesFromSenses || technique name.
 *
 * drop-anchor (/modules/act/connection/drop-anchor) - guided exercise only, no log created.
 * SKIPPED in this test: The route is a one-way guided exercise, not a log wizard.
 *
 * DELETE only - no edit affordance.
 */

test.describe("ACT connection: create, view, delete", () => {
  test.beforeEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });

  test("alice creates a connection log, views it, and deletes it", async ({ page }) => {
    const noticesText =
      "I noticed the hum of the fan, the coolness of the desk, the blue sky outside.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to new ────────────────────────────────────────────────────────
    await page.goto("/modules/act/connection/new");

    // ── Step 1: Technique - default is "noticeFiveThings"; just continue ──────
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Exercise guidance (read-only card for noticeFiveThings) ────────
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: What I noticed ─────────────────────────────────────────────────
    await page.getByPlaceholder("What you saw, heard, felt, smelled, tasted...").fill(noticesText);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 4: After - mood rating 1–10 ──────────────────────────────────────
    await page.getByRole("button", { name: "7", exact: true }).click();

    // Save
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // ── Navigate to list ───────────────────────────────────────────────────────
    await page.goto("/modules/act/connection");
    await expect(page.getByText(noticesText)).toBeVisible({ timeout: 15_000 });

    // ── Open detail ────────────────────────────────────────────────────────────
    await page.getByText(noticesText).first().click();
    await expect(page).toHaveURL(/\/modules\/act\/connection\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(noticesText).last()).toBeVisible({ timeout: 10_000 });

    // ── Delete ──────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After delete, router.replace('/modules/act/connection') is called.
    await expect(page).toHaveURL(/\/modules\/act\/connection$/, { timeout: 15_000 });
    // The log should be gone from the list.
    await expect(page.getByText(noticesText)).toBeHidden({ timeout: 10_000 });
  });
});

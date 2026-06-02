import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/act/observing-self/new  - ActObservingSelfNewScreen (multi-step wizard)
 *   /modules/act/observing-self      - ActObservingSelfListScreen (filters to selectedDate = today)
 *   /modules/act/observing-self/[id] - ActObservingSelfDetailScreen
 *
 * Wizard steps (4):
 *   1. technique  - Pressable cards (default "tenDeepBreaths" = "Ten deep breaths")
 *   2. exercise   - Guidance card shown (read-only); continue
 *   3. observed   - Textarea "What did you observe from this vantage point?"
 *   4. after      - NumberRating 1–10 mood after + optional notes textarea
 *
 * List card shows: session.whatWasObserved || technique name.
 * Detail heading:  session.whatWasObserved || technique name.
 *
 * DELETE only - no edit affordance.
 * i18n key: observingSelf.deleteConfirm = "Delete this session?"
 *           observingSelf.delete = "Delete"
 */

test.describe("ACT observing-self: create, view, delete", () => {
  test.beforeEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });

  test("alice creates an observing-self session, views it, and deletes it", async ({ page }) => {
    const observedText =
      "I noticed tension in my shoulders and an anxious thought about tomorrow's meeting.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to new ────────────────────────────────────────────────────────
    await page.goto("/modules/act/observing-self/new");

    // ── Step 1: Technique - default is "tenDeepBreaths"; just continue ────────
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Exercise guidance (read-only card for tenDeepBreaths) ──────────
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: What I observed ────────────────────────────────────────────────
    await page
      .getByPlaceholder("Thoughts, feelings, sensations you noticed - without judging them")
      .fill(observedText);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 4: After - mood rating 1–10 ──────────────────────────────────────
    await page.getByRole("button", { name: "6", exact: true }).click();

    // Save
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // ── Navigate to list ───────────────────────────────────────────────────────
    await page.goto("/modules/act/observing-self");
    await expect(page.getByText(observedText)).toBeVisible({ timeout: 15_000 });

    // ── Open detail ────────────────────────────────────────────────────────────
    await page.getByText(observedText).first().click();
    await expect(page).toHaveURL(/\/modules\/act\/observing-self\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(observedText).last()).toBeVisible({ timeout: 10_000 });

    // ── Delete ──────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After delete, router.replace('/modules/act/observing-self') is called.
    await expect(page).toHaveURL(/\/modules\/act\/observing-self$/, { timeout: 15_000 });
    // The session should be gone from the list.
    await expect(page.getByText(observedText)).toBeHidden({ timeout: 10_000 });
  });
});

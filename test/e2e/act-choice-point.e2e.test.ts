import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/act/choice-point/new  — ActChoicePointNewScreen (SINGLE-STEP form)
 *   /modules/act/choice-point      — ActChoicePointListScreen (filters to selectedDate = today)
 *   /modules/act/choice-point/[id] — ActChoicePointDetailScreen
 *
 * Single-step form (no wizard steps):
 *   - "What hooks you?"  — TextInput + icon button (accessibilityLabel="Add")
 *   - "Away moves"       — TextInput + icon button (accessibilityLabel="Add")
 *   - "Toward moves"     — TextInput + icon button (accessibilityLabel="Add")
 *   - "Notes" (Textarea, accessibilityLabel="Notes")
 *   - Save button labelled "Save"
 *
 * NOTE on selectors: React Native Web renders the StringArrayEditor inputs as
 * plain <input> elements. Playwright's CSS selector `input[type="text"]` does NOT
 * match them reliably (they show 0 count), but `input` matches all 3. Use
 * `page.locator('input').nth(N)` to target them in document order.
 *
 * Inputs appear in DOM order: hooks = nth(0), away = nth(1), toward = nth(2).
 *
 * List card primary text = cp.hooks.join(", ") when hooks are present.
 * Detail heading = t("act:choicePoint.title") = "Choice point".
 * Delete button uses t("common:delete") = "Delete".
 *
 * DELETE only — no edit affordance.
 */

test.describe("ACT choice-point: create, view, delete", () => {
  test.beforeEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });

  test("alice creates a choice point, views it, and deletes it", async ({ page }) => {
    const hookText = "Fear of embarrassing myself at work";
    const awayMoveText = "Avoiding meetings";
    const towardMoveText = "Prepare beforehand and speak up once";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to new ────────────────────────────────────────────────────────
    await page.goto("/modules/act/choice-point/new");

    // Wait for the form to be ready: "What hooks you?" label is a reliable signal
    // that the form content is fully rendered.
    await expect(page.getByText("What hooks you?")).toBeVisible({ timeout: 15_000 });

    // The three StringArrayEditor text inputs render as plain <input> elements.
    // Playwright's `input[type="text"]` selector doesn't match them reliably in
    // this RNW context; use `input` instead. DOM order: hooks, away, toward.
    const textInputs = page.locator("input");

    // ── Fill hooks ─────────────────────────────────────────────────────────────
    await textInputs.nth(0).fill(hookText);
    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    // Verify hook chip was added
    await expect(page.getByText(hookText)).toBeVisible({ timeout: 5_000 });

    // ── Fill away moves ────────────────────────────────────────────────────────
    await textInputs.nth(1).fill(awayMoveText);
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
    await expect(page.getByText(awayMoveText)).toBeVisible({ timeout: 5_000 });

    // ── Fill toward moves ──────────────────────────────────────────────────────
    await textInputs.nth(2).fill(towardMoveText);
    await page.getByRole("button", { name: "Add", exact: true }).nth(2).click();
    await expect(page.getByText(towardMoveText)).toBeVisible({ timeout: 5_000 });

    // ── Save ───────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // ── Navigate to list ───────────────────────────────────────────────────────
    await page.goto("/modules/act/choice-point");
    // List card primary text = hooks.join(", ")
    await expect(page.getByText(hookText)).toBeVisible({ timeout: 15_000 });

    // ── Open detail ────────────────────────────────────────────────────────────
    await page.getByText(hookText).first().click();
    await expect(page).toHaveURL(/\/modules\/act\/choice-point\/[^/]+$/, { timeout: 15_000 });
    // Detail shows each hook as its own text node in the hooks card
    await expect(page.getByText(hookText).last()).toBeVisible({ timeout: 10_000 });

    // ── Delete ──────────────────────────────────────────────────────────────────
    // Detail uses t("common:delete") = "Delete"
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After delete, router.replace('/modules/act/choice-point') is called.
    await expect(page).toHaveURL(/\/modules\/act\/choice-point$/, { timeout: 15_000 });
    // The choice point should be gone from the list.
    await expect(page.getByText(hookText)).toBeHidden({ timeout: 10_000 });
  });
});

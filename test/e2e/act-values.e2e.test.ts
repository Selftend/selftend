import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/act/values           - ActValuesScreen
 *   /modules/act/values/[domain]  - ActValueDomainScreen (upsert a single domain)
 *   /modules/act/values/bulls-eye - ActBullsEyeScreen
 *
 * Valid domain params: "work" | "leisure" | "relationships" | "personalGrowth"
 * Domain screen labels (act.json > values):
 *   - "Work & education"        (work)
 *   - "Leisure & play"          (leisure)
 *   - "Relationships"           (relationships)
 *   - "Health & personal growth" (personalGrowth)
 *
 * Domain screen wizard steps (5 steps):
 *   1. value     - Textarea "What do you value here?" (valueStatementLabel)
 *   2. current   - Textarea "What are you already doing that reflects this value?"
 *   3. desired   - Textarea "What would you like to do more of?"
 *   4. barriers  - Textarea "What gets in the way?"
 *   5. ratings   - NumberRating 1–10 for importance + NumberRating 1–10 for alignment
 *
 * After save: router.back() → returns to /modules/act/values
 * Values are UPSERTED (profile-like) - no delete affordance on values screen.
 *
 * Bulls-eye screen (act.json > values.bullsEye):
 *   - NumberRating 1–10 per domain (work, leisure, relationships, personalGrowth)
 *   - Save button: "Save ratings"
 *   - After save: toast "Ratings saved" → router.back()
 *
 * Cleanup: deleteAllActLogsForUser covers act_value_entries + act_bulls_eye_snapshots.
 * NOTE: No delete affordance on values - it's an upsert flow, not log/delete.
 */

test.describe("ACT values: edit a domain value and save a bulls-eye check-in", () => {
  test.beforeEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
  });

  test("alice edits the Work domain value, saves it, and verifies it persists", async ({
    page,
  }) => {
    const valueStatement = "Being engaged and growing in meaningful work.";
    const currentActions = "Showing up consistently and learning from each task.";
    const desiredActions = "Take on one stretch project per quarter.";
    const barriers = "Hooked by perfectionism - unhook with defusion.";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to the work domain screen ────────────────────────────────────
    await page.goto("/modules/act/values/work");

    // ── Step 1: Value statement ───────────────────────────────────────────────
    await page.getByRole("textbox", { name: "What do you value here?" }).fill(valueStatement);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Current actions ───────────────────────────────────────────────
    await page
      .getByRole("textbox", { name: "What are you already doing that reflects this value?" })
      .fill(currentActions);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Desired actions ───────────────────────────────────────────────
    await page
      .getByRole("textbox", { name: "What would you like to do more of?" })
      .fill(desiredActions);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 4: Barriers ──────────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "What gets in the way?" }).fill(barriers);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 5: Ratings ───────────────────────────────────────────────────────
    // Importance rating (1–10): select 8
    // The labels are "How important is this domain to you? (1–10)" and
    // "How aligned is your daily life with this value? (1–10)"
    // Both use NumberRating min=1 max=10 step=1. We click "8" for importance.
    // There are two sets of buttons 1–10, so we need .first() / .last() or
    // targeting by aria-label group. Use .nth(0) set and .nth(1) set approach:
    // We get all buttons named "8" - first is importance, second is alignment.
    await page.getByRole("button", { name: "8", exact: true }).first().click();
    // Alignment rating: click second "6" button
    await page.getByRole("button", { name: "6", exact: true }).last().click();

    // Save (last step)
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save router.back() → navigate to values screen to verify persistence
    await page.goto("/modules/act/values");

    // The value statement should now appear in the Work & education domain card
    await expect(page.getByText(valueStatement).last()).toBeVisible({ timeout: 15_000 });

    // ── Re-open the domain to confirm persistence ─────────────────────────────
    await page.goto("/modules/act/values/work");

    // The value statement textarea should be pre-filled with the saved value
    await expect(page.getByRole("textbox", { name: "What do you value here?" })).toHaveValue(
      valueStatement,
      { timeout: 15_000 },
    );
  });

  test("alice saves a bulls-eye check-in and sees it in the history", async ({ page }) => {
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    // ── Navigate to the bulls-eye screen ──────────────────────────────────────
    await page.goto("/modules/act/values/bulls-eye");

    // ── Rate all four domains ─────────────────────────────────────────────────
    // Domain labels (act.json > values.bullsEye):
    //   "Work & education" | "Leisure & play" | "Relationships" | "Health & personal growth"
    // Each NumberRating uses min=1, max=10, step=1 → 10 buttons per domain.
    // Domains appear in fixed order: work(0), leisure(1), relationships(2), personalGrowth(3).
    // Total 40 numbered buttons on page; buttons 1–10 per domain share the same labels.
    // Use nth() to select the correct domain's instance of a given number.
    // nth(0)=work, nth(1)=leisure, nth(2)=relationships, nth(3)=personalGrowth.

    // Work: 7 - first occurrence of "7"
    await page.getByRole("button", { name: "7", exact: true }).nth(0).click();
    // Leisure: 5 - first occurrence of "5"
    await page.getByRole("button", { name: "5", exact: true }).nth(1).click();
    // Relationships: 8 - first occurrence of "8" is in work range; leisure=nth(1), relationships=nth(2)
    await page.getByRole("button", { name: "8", exact: true }).nth(2).click();
    // Health: 6 - nth(3)
    await page.getByRole("button", { name: "6", exact: true }).nth(3).click();

    // ── Save the ratings ──────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Save ratings", exact: true }).click();

    // After save: toast "Ratings saved" appears and router.back() is called.
    // Navigate back to the bulls-eye screen to verify the history entry.
    await page.goto("/modules/act/values/bulls-eye");

    // The history section should show at least one snapshot entry with the "7/10" rating
    await expect(page.getByText("7/10").last()).toBeVisible({ timeout: 15_000 });
  });
});

import { expect, test } from "./fixtures";

import { deleteAllActLogsForUser } from "./helpers";

/**
 * Routes:
 *   /modules/act/defusion/new   - ActDefusionNewScreen
 *   /modules/act/defusion       - ActDefusionListScreen  (filters to selectedDate = today)
 *   /modules/act/defusion/[id]  - ActDefusionDetailScreen
 *
 * i18n (act.json > defusion):
 *   thoughtLabel   "What is the thought?"
 *   thoughtPlaceholder "Write the thought as it appeared"
 *   categoryLabel  "What kind of thought is this?"
 *   fusionBeforeLabel "How strongly is this thought pulling you right now?"
 *   techniqueLabel "Pick a defusion technique"
 *   defusedVersionLabel "How does the thought look after the technique? (optional)"
 *   fusionAfterLabel "How strongly is it pulling you now?"
 *   saveLog "Save"
 *   continue "Continue"
 *   delete "Delete"
 *   deleteConfirm "Delete this log?"
 *
 * Categories (chips): "Self-judgment" | "Worry" | "Past regret" | "Negative prediction" | "Should / must rule" | "Other"
 * Techniques (cards): "I'm having the thought that..." | ...
 *
 * Fusion rating (NumberRating min=0 max=100 step=10): buttons "0","10","20",...,"100"
 *
 * DELETE only - no edit affordance on this screen.
 */

test.describe("ACT defusion: create, view, delete", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllActLogsForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllActLogsForUser(user.id);
  });

  test("alice creates a defusion log, views it, and deletes it", async ({ page }) => {
    const fusedThought = "I will definitely fail this presentation.";
    const defusedVersion = "I'm having the thought that I will fail this presentation.";

    // ── Step 1: Thought ────────────────────────────────────────────────────────
    await page.goto("/modules/act/defusion/new");

    await page.getByPlaceholder("Write the thought as it appeared").fill(fusedThought);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Category ───────────────────────────────────────────────────────
    // Select "Worry" chip
    await page.getByRole("button", { name: "Worry", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Fusion before (NumberRating 0-100 step 10) ────────────────────
    // Click button "60"
    await page.getByRole("button", { name: "60", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 4: Technique ─────────────────────────────────────────────────────
    // The first technique is "I'm having the thought that..." - it should already be selected
    // (default is 'havingTheThoughtThat'). Just continue.
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 5: After & notes ─────────────────────────────────────────────────
    await page
      .getByPlaceholder("e.g. \"I'm having the thought that I'm going to fail\"")
      .fill(defusedVersion);

    // Rate fusion after at 20
    await page.getByRole("button", { name: "20", exact: true }).click();

    // Save the log
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After save, router.back() navigates away. Go directly to the list.
    await page.goto("/modules/act/defusion");
    await expect(page.getByText(fusedThought)).toBeVisible({ timeout: 15_000 });

    // ── Open the detail ────────────────────────────────────────────────────────
    await page.getByText(fusedThought).first().click();
    await expect(page).toHaveURL(/\/modules\/act\/defusion\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(fusedThought).last()).toBeVisible({ timeout: 10_000 });

    // ── Delete ─────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    // After delete, router.replace('/modules/act/defusion') is called.
    await expect(page).toHaveURL(/\/modules\/act\/defusion$/, { timeout: 15_000 });
    // The log should be gone from the list.
    await expect(page.getByText(fusedThought)).toBeHidden({ timeout: 10_000 });
  });
});

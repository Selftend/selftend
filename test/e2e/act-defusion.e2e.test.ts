import { expect, test } from "./fixtures";

import { deleteAllActLogsForUser, expectSuccessToast } from "./helpers";

/**
 * Routes:
 *   /modules/act/defusion/new   - ActDefusionNewScreen  (ONE SCROLLING COLUMN)
 *   /modules/act/defusion       - ActDefusionListScreen  (filters to selectedDate = today)
 *   /modules/act/defusion/[id]  - ActDefusionDetailScreen
 *
 * ☠️ Rewritten with the column (#1380). This spec used to advance the form with
 * five clicks on an exact-name "Continue" button - the button the column
 * deletes. Nothing here may reintroduce a step: every field is on the page from
 * the first paint, which is what the first assertion below pins.
 *
 * i18n (act.json > defusion):
 *   thoughtLabel   "What is the thought?"
 *   thoughtPlaceholder "Write the thought as it appeared"
 *   categoryLabel  "What kind of thought is this?"
 *   fusionBeforeLabel "How strongly is this thought pulling you right now?"
 *   techniqueLabel "Pick a defusion technique"
 *   defusedVersionLabel "How does the thought look after the technique? (optional)"
 *   fusionAfterLabel "How strongly is it pulling you now?"
 *   railNote "{{filled}} of {{total}} parts filled in"
 *   saveLog "Save"
 *   finishLater "Finish later"
 *   delete "Delete"
 *   deleteConfirm "Delete this log?"
 *
 * Categories (chips): "Self-judgment" | "Worry" | "Past regret" | "Negative prediction" | "Should / must rule" | "Other"
 * Techniques (cards): "I'm having the thought that..." | ...
 *
 * Fusion rating (NumberRating min=0 max=100 step=10): buttons "0","10","20",...,"100".
 * ⚠️ BOTH ratings are on the page at once, so a bare name lookup matches two
 * buttons. Scope through the `defusion-fusion-before` / `defusion-fusion-after`
 * test ids - an index would silently retarget the other rating.
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

  test("alice fills the column out of order, saves, views and deletes the log", async ({
    page,
  }) => {
    const fusedThought = "I will definitely fail this presentation.";
    const defusedVersion = "I'm having the thought that I will fail this presentation.";

    await page.goto("/modules/act/defusion/new");

    // ── The whole form is here, and there is nothing to advance ───────────────
    await expect(page.getByPlaceholder("Write the thought as it appeared")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("What kind of thought is this?")).toBeVisible();
    await expect(page.getByText("Pick a defusion technique")).toBeVisible();
    await expect(page.getByText("How strongly is it pulling you now?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toHaveCount(0);

    // Nothing is filled in yet - not even the category and the technique, which
    // the database defaults but the user has not touched.
    await expect(page.getByText("0 of 5 parts filled in")).toBeVisible();

    // ── The LAST part, answered first ─────────────────────────────────────────
    await page
      .getByPlaceholder("e.g. \"I'm having the thought that I'm going to fail\"")
      .fill(defusedVersion);
    await page
      .getByTestId("defusion-fusion-after")
      .getByRole("button", { name: "20", exact: true })
      .click();

    // One part filled, and it is the last one - a rail that counted a prefix
    // would be claiming the whole form was done by now.
    await expect(page.getByText("1 of 5 parts filled in")).toBeVisible();

    // ── The rest, upwards ─────────────────────────────────────────────────────
    await page.getByPlaceholder("Write the thought as it appeared").fill(fusedThought);
    await page.getByRole("radio", { name: "Worry", exact: true }).click();
    await page
      .getByTestId("defusion-fusion-before")
      .getByRole("button", { name: "60", exact: true })
      .click();
    await page.getByRole("radio", { name: "Musical thoughts", exact: true }).click();

    await expect(page.getByText("5 of 5 parts filled in")).toBeVisible();

    // ── Save ──────────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Wait for the "Saved" toast (fires after the DB write committed) before
    // the hard goto() - navigating earlier aborts the in-flight insert (#172).
    await expectSuccessToast(page, "Saved");

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

  test("the rail fits a 360dp phone, and nothing on it is a tap target", async ({ page }) => {
    // ⚠️ The default project is Desktop Chrome, so the phone width every ruling
    // on this map binds is invisible to every other spec here. Resized per-test.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/modules/act/defusion/new");

    await expect(page.getByText("0 of 5 parts filled in")).toBeVisible({ timeout: 15_000 });

    // All five stop names are on the rail at this width.
    for (const stop of ["The thought", "Category", "Before", "Technique", "After & notes"]) {
      await expect(page.getByText(stop, { exact: true })).toBeVisible();
    }

    // Nothing overflows sideways. A caption too wide for its fifth of the rail
    // is the failure this catches, and it is the one an assertion on text alone
    // would sail straight past.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // The rail is read-only: its stops are not buttons at any width.
    for (const stop of ["The thought", "Technique"]) {
      await expect(page.getByRole("button", { name: stop, exact: true })).toHaveCount(0);
    }
  });

  test("alice leaves the form part-way and comes back to what she typed", async ({ page }) => {
    const fusedThought = "Everyone will notice.";

    // ⚠️ Navigated through the app, never with goto(). The draft lives in memory
    // (the non-wizard draft store), so "Finish later" is a promise about leaving
    // the SCREEN, not about reloading the browser - a hard goto would wipe it and
    // this test would be asserting the opposite of the ruling.
    await page.goto("/modules/act/defusion");
    await page.getByRole("button", { name: "Defuse a thought", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/act\/defusion\/new$/, { timeout: 15_000 });

    await page.getByPlaceholder("Write the thought as it appeared").fill(fusedThought);
    await expect(page.getByText("1 of 5 parts filled in")).toBeVisible();

    await page.getByRole("button", { name: "Finish later", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/act\/defusion$/, { timeout: 15_000 });

    await page.getByRole("button", { name: "Defuse a thought", exact: true }).click();
    await expect(page.getByPlaceholder("Write the thought as it appeared")).toHaveValue(
      fusedThought,
      { timeout: 15_000 },
    );
    await expect(page.getByText("1 of 5 parts filled in")).toBeVisible();
  });
});

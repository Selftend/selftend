import { expect, test } from "./fixtures";

import { deleteAllActLogsForUser, expectSuccessToast } from "./helpers";

/**
 * Routes:
 *   /modules/act/values           - ActValuesScreen: the four domains AND the alignment
 *                                   check-in, folded together by #1379
 *   /modules/act/values/[domain]  - ActValueDomainScreen (upsert a single domain)
 *   /modules/act/values/bulls-eye - a <Redirect> stub to /modules/act/values
 *
 * Valid domain params: "work" | "leisure" | "relationships" | "personalGrowth"
 * Domain labels (act.json > values) - the check-in reads the SAME four keys since
 * #1379 retired its byte-identical duplicates:
 *   - "Work & education"         (work)
 *   - "Leisure & play"           (leisure)
 *   - "Relationships"            (relationships)
 *   - "Health & personal growth" (personalGrowth)
 *
 * Domain screen wizard steps (5 steps):
 *   1. value      - Textarea "What do you value here?" (valueStatementLabel)
 *   2. current    - Textarea "What are you already doing that reflects this value?"
 *   3. desired    - Textarea "What would you like to do more of?"
 *   4. barriers   - Textarea "What gets in the way?"
 *   5. importance - ONE NumberRating 1-10. ☠️ It used to be two: an importance rating
 *                   and an alignment rating. The alignment one is deleted (#1379) - it
 *                   was a second answer to the check-in's own question, written to a
 *                   second column that the values row then preferred over the check-in's.
 *
 * After save: router.back() → returns to /modules/act/values
 * Values are UPSERTED (profile-like) - no delete affordance on values screen.
 *
 * Check-in (act.json > values.bullsEye), inline on the values screen:
 *   - NumberRating 1-10 per domain, in ACT_LIFE_DOMAINS order:
 *     work(0), leisure(1), relationships(2), personalGrowth(3) → 40 numbered buttons
 *   - Save button: "Save ratings"; toast "Ratings saved". It does NOT navigate away.
 *   - History rows live under testID "bulls-eye-history" - the row above carries its own
 *     "Alignment: 7/10", so a bare "7/10" lookup is ambiguous on this screen.
 *
 * Cleanup: deleteAllActLogsForUser covers act_value_entries + act_bulls_eye_snapshots.
 * NOTE: No delete affordance on values - it's an upsert flow, not log/delete.
 */

test.describe("ACT values: edit a domain value and save an alignment check-in", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllActLogsForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllActLogsForUser(user.id);
  });

  test("alice edits the Work domain value, saves it, and verifies it persists", async ({
    page,
  }) => {
    const valueStatement = "Being engaged and growing in meaningful work.";
    const currentActions = "Showing up consistently and learning from each task.";
    const desiredActions = "Take on one stretch project per quarter.";
    const barriers = "Hooked by perfectionism - unhook with defusion.";

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

    // ── Step 5: Importance ────────────────────────────────────────────────────
    // ☠️ This step used to carry TWO 1-10 tracks, and this spec picked the alignment
    // one with `.last()`. Deleting that control does not fail such a lookup - it
    // silently RETARGETS it onto importance and keeps passing. So assert the absence
    // directly: exactly one track, and the alignment question is not on the screen.
    await expect(page.getByText("How aligned is your daily life with this value?")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "8", exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: "8", exact: true }).click();

    // Save (last step)
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Wait for the "Saved" toast - it appears only after mutateAsync resolves (i.e. the DB
    // write has committed). Without this, page.goto() can race the in-flight upsert under
    // parallel load and land on a list that reads stale/empty data from the DB.
    await expectSuccessToast(page, "Saved");

    // Hard-navigate to the values list so the query runs fresh against the now-committed DB row.
    await page.goto("/modules/act/values");

    // The value statement should now appear in the Work & education domain row
    await expect(page.getByText(valueStatement).last()).toBeVisible({ timeout: 15_000 });

    // ── Re-open the domain to confirm persistence ─────────────────────────────
    await page.goto("/modules/act/values/work");

    // The value statement textarea should be pre-filled with the saved value
    await expect(page.getByRole("textbox", { name: "What do you value here?" })).toHaveValue(
      valueStatement,
      { timeout: 15_000 },
    );
  });

  test("alice rates all four domains on the values screen and the rows move with her", async ({
    page,
  }) => {
    // ── The old check-in route still resolves ─────────────────────────────────
    // ☠️ Deleting the file would NOT 404: the static segment is swallowed by its
    // `[domain]` sibling, whose guard renders the SAVE-ERROR string as a not-found
    // message in a bare view with no way out. The stub is mandatory, so prove it.
    await page.goto("/modules/act/values/bulls-eye");
    await expect(page.getByText("Values check-in")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Could not save")).toHaveCount(0);

    // ── Rate all four domains ─────────────────────────────────────────────────
    // Each NumberRating uses min=1, max=10, step=1 → 10 buttons per domain, in fixed
    // domain order: work(0), leisure(1), relationships(2), personalGrowth(3). The rows
    // above carry no numbered buttons, so nth() still addresses the tracks alone.
    await page.getByRole("button", { name: "7", exact: true }).nth(0).click();
    await page.getByRole("button", { name: "5", exact: true }).nth(1).click();
    await page.getByRole("button", { name: "8", exact: true }).nth(2).click();
    await page.getByRole("button", { name: "6", exact: true }).nth(3).click();

    // ── Save the ratings ──────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Save ratings", exact: true }).click();

    // Wait for the "Ratings saved" toast - confirms the DB writes finished.
    await expectSuccessToast(page, "Ratings saved");

    // ☠️ THE BUG THIS FOLD EXISTS TO EXPOSE: the row 200px above the check-in used to
    // keep its old number after a save, because it read the domain form's rival column
    // instead of the check-in's. No reload here on purpose - the save's invalidation
    // has to reach the row's own read for this to pass.
    await expect(page.getByText("Alignment: 7/10")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Alignment: 5/10")).toBeVisible();
    await expect(page.getByText("Alignment: 8/10")).toBeVisible();
    await expect(page.getByText("Alignment: 6/10")).toBeVisible();

    // ── The history keeps PER-DOMAIN rows, never an average ───────────────────
    // Scoped to the history section: the row above says "Alignment: 7/10", so a bare
    // "7/10" lookup would match either surface.
    const history = page.getByTestId("bulls-eye-history");
    await expect(history.getByText("7/10")).toBeVisible({ timeout: 15_000 });
    await expect(history.getByText("5/10")).toBeVisible();
    await expect(history.getByText("8/10")).toBeVisible();
    await expect(history.getByText("6/10")).toBeVisible();

    // Four independent rows with four timestamps - no averaged number anywhere.
    await expect(page.getByText("avg", { exact: false })).toHaveCount(0);

    // ── The ratings survive a hard reload as saved history ────────────────────
    await page.goto("/modules/act/values");
    await expect(page.getByTestId("bulls-eye-history").getByText("7/10")).toBeVisible({
      timeout: 15_000,
    });
  });
});

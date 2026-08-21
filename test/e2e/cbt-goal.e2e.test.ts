import { expect, test } from "./fixtures";

import {
  createServiceClient,
  deleteAllGoalsForUser,
  deleteAllValuesProfileForUser,
} from "./helpers";

/**
 * Routes:
 *   /modules/cbt/goals/new          - NewGoalScreen (create)
 *   /modules/cbt/goals/new?goalId=X - NewGoalScreen (edit)
 *   /modules/cbt/goals/[id]         - GoalDetailScreen
 *   /modules/cbt/goals              - GoalsScreen
 *
 * Wizard steps (cbt.json > goals):
 *   step1 "1. Domain & type"  - lifeDomain + goalType (buttons/chips) + the optional
 *                               value picker, which is chips when the user has priority
 *                               values and a "Clarify your values" link when they do not
 *   step2 "2. Details"        - title + description + targetDate
 *   step3 "3. Milestones"     - milestones field array
 *
 * Key labels (cbt.json > goals):
 *   titleLabel "Goal title"
 *   titlePlaceholder "Describe the goal in a few words."
 *   milestoneDescription "What is this step?"
 *   milestonePlaceholder "Describe this step clearly."
 *   save "Save goal"
 *   continue "Continue"
 *   edit "Edit goal"
 *   milestones "Milestones"
 *   valueClear "Clear value"          - rendered ONLY while a value is selected
 *   valueEmptyLink "Clarify your values"
 *
 * Domains: "Work" | "Relationships" | "Health" | "Leisure" | "Personal Growth" | "Other"
 * Types: "Do more of" | "Do less of" | "Improve a relationship" | "Improve quality of life"
 *
 * NOTE: The goal detail screen has NO delete button.
 * Goals can be marked "Completed" or "Paused" (status change) from the detail screen.
 * "Abandoned" status is not exposed in the detail UI - only Completed and Paused.
 * Cleanup is handled via deleteAllGoalsForUser.
 */

test.describe("CBT goal: create, toggle milestone, edit, and change status", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllGoalsForUser(user.id);
    // No values profile by default: step 1 must offer the quiet link, and the whole
    // wizard must still complete. This is the state the shipped programme actually
    // puts a user in - its first week sets goals BEFORE it clarifies values.
    await deleteAllValuesProfileForUser(user.id);
  });
  test.afterEach(async ({ user }) => {
    await deleteAllGoalsForUser(user.id);
    await deleteAllValuesProfileForUser(user.id);
  });

  test("alice creates a goal with a milestone, marks the milestone complete, edits the title, and marks the goal completed", async ({
    page,
  }) => {
    const originalTitle = "Run 3 times per week";
    const editedTitle = "Run 3 times per week consistently";
    const milestoneDescription = "Complete first week of running";

    await page.goto("/modules/cbt/goals/new");

    // ── Step 1: Domain & type ──────────────────────────────────────────────────
    // Select "Health" domain and "Do more of" type
    await page.getByRole("button", { name: "Health", exact: true }).click();
    await page.getByRole("button", { name: "Do more of", exact: true }).click();

    // With no values profile the value picker degrades to a quiet link out - never
    // an empty control, and never something that blocks Continue below.
    await expect(page.getByRole("link", { name: "Clarify your values" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Details ────────────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "Goal title" }).fill(originalTitle);

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 3: Milestones ─────────────────────────────────────────────────────
    // One milestone field is pre-populated; fill it in.
    await page.getByRole("textbox", { name: "What is this step?" }).fill(milestoneDescription);

    await page.getByRole("button", { name: "Save goal", exact: true }).click();

    // After save, routed to /modules/cbt/goals/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(milestoneDescription)).toBeVisible({ timeout: 10_000 });

    // ── Toggle milestone complete ──────────────────────────────────────────────
    // The milestone renders as a Checkbox with accessibilityLabel = milestone.description.
    await page.getByRole("checkbox", { name: milestoneDescription }).click();
    // After toggling, the milestone label gets line-through style; verify the checkbox is checked.
    await expect(page.getByRole("checkbox", { name: milestoneDescription })).toBeChecked({
      timeout: 10_000,
    });

    // ── Edit the goal title ────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Edit goal", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/new\?goalId=/, { timeout: 15_000 });

    // Wait for step 1 to load with existing domain/type, then advance
    await expect(page.getByRole("button", { name: "Health", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 2: update the title
    const titleField = page.getByRole("textbox", { name: "Goal title" });
    await expect(titleField).toBeVisible({ timeout: 10_000 });
    await titleField.clear();
    await titleField.fill(editedTitle);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3: keep milestone as-is, save
    await page.getByRole("button", { name: "Save goal", exact: true }).click();

    // After save, router.replace to /modules/cbt/goals/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/[^/]+$/, { timeout: 15_000 });
    // Assert edited title is visible. Use .last() for router.replace DOM stack.
    await expect(page.getByText(editedTitle).last()).toBeVisible({ timeout: 15_000 });

    // ── Mark goal as completed ─────────────────────────────────────────────────
    // The detail screen shows "Completed" and "Paused" buttons for active goals.
    await page.getByRole("button", { name: "Completed", exact: true }).click();
    // A confirm card appears: confirm by clicking the status button label again.
    await page.getByRole("button", { name: "Completed", exact: true }).last().click();

    // After status change the goal detail should still be visible (stays on same page).
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/[^/]+$/, { timeout: 10_000 });
    // The status badge on the detail should now show "Completed"
    await expect(page.getByText("Completed").last()).toBeVisible({ timeout: 10_000 });
  });

  /**
   * The value anchor round trip (#1289).
   *
   * A compile-time guard stops the edit form from *forgetting* to prefill the value
   * key, but only an end-to-end run proves the key survives the write, the at-rest
   * encryption, the read back and the prefill. "Clear value" is the assertion target
   * because it renders only while a value is selected - chip selection itself is
   * carried by a style variant, which is not queryable.
   */
  test("alice anchors a goal to one of her priority values, and editing it keeps the anchor", async ({
    page,
    user,
  }) => {
    const admin = createServiceClient();
    // values_profile is an encrypted view; the INSTEAD OF trigger does the encrypting,
    // so a plain insert through the view is the same path the app itself writes on.
    const { error } = await admin.from("values_profile").insert({
      user_id: user.id,
      personal_values: [
        { key: "courageous", tier: 1 },
        { key: "curious", tier: 1 },
      ],
      priority_values: ["courageous", "curious"],
    });
    expect(error).toBeNull();

    await page.goto("/modules/cbt/goals/new");

    // ── Step 1: domain, type, and the value ────────────────────────────────────
    await page.getByRole("button", { name: "Health", exact: true }).click();
    await page.getByRole("button", { name: "Do more of", exact: true }).click();

    const courageous = page.getByRole("button", { name: "Courageous", exact: true });
    await expect(courageous).toBeVisible({ timeout: 10_000 });
    // Only the ranked priority values are offered. "Accepting" is in the full
    // adjective list but is not one of alice's priorities, so it must not appear.
    await expect(page.getByRole("button", { name: "Accepting", exact: true })).toHaveCount(0);
    await courageous.click();
    await expect(page.getByRole("button", { name: "Clear value", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "Goal title" }).fill("Swim once a week");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "What is this step?" }).fill("Book a lane");
    await page.getByRole("button", { name: "Save goal", exact: true }).click();

    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/[^/]+$/, { timeout: 15_000 });

    // ── Re-open for edit: the anchor must come back prefilled ──────────────────
    await page.getByRole("button", { name: "Edit goal", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/new\?goalId=/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Clear value", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // ── And it can be cleared back to "anchored to nothing" ───────────────────
    await page.getByRole("button", { name: "Clear value", exact: true }).click();
    await expect(page.getByRole("button", { name: "Clear value", exact: true })).toHaveCount(0);
  });
});

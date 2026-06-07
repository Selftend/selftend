import { expect, test } from "./fixtures";

import { deleteAllGoalsForUser } from "./helpers";

/**
 * Routes:
 *   /modules/cbt/goals/new          - NewGoalScreen (create)
 *   /modules/cbt/goals/new?goalId=X - NewGoalScreen (edit)
 *   /modules/cbt/goals/[id]         - GoalDetailScreen
 *   /modules/cbt/goals              - GoalsScreen
 *
 * Wizard steps (cbt.json > goals):
 *   step1 "1. Domain & type"  - lifeDomain + goalType (buttons/chips)
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
  });
  test.afterEach(async ({ user }) => {
    await deleteAllGoalsForUser(user.id);
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
});

import { expect, test } from "./fixtures";

import { createServiceClient, deleteAllGoalsForUser } from "./helpers";

/** `YYYY-MM-DD`, in the browser's local frame — the same key the field commits. */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** What the trigger should read for a day, mirroring `formatDayKey` under `en`. */
function triggerText(d: Date): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * A day that is unambiguously in the past and comfortably mid-month, so its
 * immediate neighbours share its grid: the 10th of last month.
 */
function tenthOfLastMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  d.setDate(10);
  return d;
}

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
 *                               targetDate is a boxed trigger opening the app's
 *                               own calendar sheet, named
 *                               "Target date (optional): <value|No date set>".
 *                               Grid nav: getByTestId("btn-prev"/"btn-next");
 *                               days are buttons named by their number.
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
    user,
  }) => {
    const originalTitle = "Run 3 times per week";
    const editedTitle = "Run 3 times per week consistently";
    const milestoneDescription = "Complete first week of running";
    // The 15th of next month: always future, always inside one grid page.
    const targetDate = new Date();
    targetDate.setDate(1);
    targetDate.setMonth(targetDate.getMonth() + 1);
    targetDate.setDate(15);

    await page.goto("/modules/cbt/goals/new");

    // ── Step 1: Domain & type ──────────────────────────────────────────────────
    // Select "Health" domain and "Do more of" type
    await page.getByRole("button", { name: "Health", exact: true }).click();
    await page.getByRole("button", { name: "Do more of", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // ── Step 2: Details ────────────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "Goal title" }).fill(originalTitle);

    // ── Target date ────────────────────────────────────────────────────────────
    // The field is a boxed trigger on every platform now; no browser date popup
    // is involved, so the calendar below is the app's own.
    await page
      .getByRole("button", { name: "Target date (optional): No date set", exact: true })
      .click();

    // Last month is entirely in the past, so this is stable whatever day the
    // run lands on: every one of its days is disabled.
    await page.getByTestId("btn-prev").click();
    await expect(page.getByRole("button", { name: "15", exact: true })).toBeDisabled();

    // Forward to next month, where every day is selectable.
    await page.getByTestId("btn-next").click();
    await page.getByTestId("btn-next").click();
    await page.getByRole("button", { name: "15", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();

    // Committed on Done, and read back through the trigger.
    await expect(
      page.getByRole("button", { name: `Target date (optional): ${triggerText(targetDate)}` }),
    ).toBeVisible();

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

    // ── Age the target date into the past ──────────────────────────────────────
    // The edit screen can be opened on a goal whose target date has already
    // passed, and a plain "today is the minimum" clamp would then present the
    // user's own saved value as invalid. `target_date` is an unencrypted
    // pass-through column, so it can be moved directly.
    const pastTarget = tenthOfLastMonth();
    const admin = createServiceClient();
    const { error: ageError } = await admin
      .from("goals")
      .update({ target_date: dayKey(pastTarget) })
      .eq("user_id", user.id);
    expect(ageError).toBeNull();
    // The goal is already in the query cache with a 60s staleTime, so a reload
    // is what makes the app read the aged row rather than the one it saved.
    await page.reload();
    await expect(page.getByText(originalTitle).last()).toBeVisible({ timeout: 15_000 });

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

    // ── The past-date exemption ────────────────────────────────────────────────
    const pastTrigger = page.getByRole("button", {
      name: `Target date (optional): ${triggerText(pastTarget)}`,
    });
    await expect(pastTrigger).toBeVisible({ timeout: 10_000 });
    await pastTrigger.click();

    // The calendar opens on the stored month. The saved day stays tappable;
    // every other past day around it stays shut — `minDate` set to the earlier
    // of today and the stored value would have unlocked all of them.
    await expect(page.getByRole("button", { name: "10", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "9", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "11", exact: true })).toBeDisabled();

    // Dismissing discards: the stored date is untouched by a look.
    await page.keyboard.press("Escape");
    await expect(pastTrigger).toBeVisible();

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

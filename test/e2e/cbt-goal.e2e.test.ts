import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

import {
  createServiceClient,
  deleteAllGoalsForUser,
  deleteAllValuesProfileForUser,
} from "./helpers";

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
 * A day cell in the open calendar.
 *
 * ⚠️ Matched on the TAIL of the accessible name, and scoped to the grid. Since
 * #1301 a day is named in full — "Sunday, March 15, 2026", with a "Today, "
 * prefix on today — so the bare number identifies nothing. The scoping matters
 * because the trigger reads "Tue, Mar 15, 2026" and ends the same way.
 */
function calendarDay(page: Page, day: number) {
  return page.getByTestId("days").getByRole("button", { name: new RegExp(`\\b${day}, \\d{4}$`) });
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
 *   step1 "1. Domain & type"  - lifeDomain + goalType (buttons/chips) + the optional
 *                               value picker, which is chips when the user has priority
 *                               values and a "Clarify your values" link when they do not
 *   step2 "2. Details"        - title + description + targetDate
 *                               targetDate is a boxed trigger opening the app's
 *                               own calendar sheet, named
 *                               "Target date (optional): <value|No date set>".
 *                               Grid nav: getByTestId("btn-prev"/"btn-next")
 *                               (the buttons' names are translated since #1301);
 *                               days are buttons named IN FULL since #1301 -
 *                               "Sunday, March 15, 2026", today prefixed
 *                               "Today, " - not by their number.
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
 *   valueAnchor "Guiding value: <label>" - the goal's value, read back on the detail
 *                               view and on the active-goal row in the list; absent
 *                               entirely when the goal is anchored to nothing
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

    // With no values profile the value picker degrades to a quiet link out - never
    // an empty control, and never something that blocks Continue below.
    await expect(page.getByRole("link", { name: "Clarify your values" })).toBeVisible({
      timeout: 10_000,
    });

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
    const fifteenth = calendarDay(page, 15);
    await expect(fifteenth).toBeDisabled();

    // Forward to next month, where every day is selectable.
    await page.getByTestId("btn-next").click();
    await page.getByTestId("btn-next").click();
    await fifteenth.click();
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

    // A goal anchored to nothing leaves no hole behind: no label, no empty slot,
    // no placeholder. This user has no values profile at all, which is the state
    // the shipped programme's first week actually produces. Anchored to the colon
    // so it cannot accidentally be satisfied by the wizard's own "Guiding value
    // (optional)" label if this ever runs before the save has routed away.
    await expect(page.getByText(/^Guiding value:/)).toHaveCount(0);

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
    await expect(calendarDay(page, 10)).toBeEnabled();
    await expect(calendarDay(page, 9)).toBeDisabled();
    await expect(calendarDay(page, 11)).toBeDisabled();

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

    // Role is checkbox, not button: the value chips are togglable and carry their
    // selection in aria-checked (the two single-selects above them do not).
    const courageous = page.getByRole("checkbox", { name: "Courageous", exact: true });
    await expect(courageous).toBeVisible({ timeout: 10_000 });
    await expect(courageous).not.toBeChecked();
    // Only the ranked priority values are offered. "Accepting" is in the full
    // adjective list but is not one of alice's priorities, so it must not appear.
    await expect(page.getByRole("checkbox", { name: "Accepting", exact: true })).toHaveCount(0);
    await courageous.click();
    await expect(courageous).toBeChecked();

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "Goal title" }).fill("Swim once a week");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "What is this step?" }).fill("Book a lane");
    await page.getByRole("button", { name: "Save goal", exact: true }).click();

    // Deliberately NOT the bare `goals/[^/]+$` the assertions above settle for: that
    // also matches the wizard's own `/goals/new`, so it can pass while the save is
    // still in flight, and the URL read right after it is the page we came FROM.
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/(?!new$)[^/]+$/, { timeout: 15_000 });
    const detailPath = new URL(page.url()).pathname;

    // ── The anchor is visible afterwards, on both surfaces (#1291) ─────────────
    // An anchor nobody can see again is a claim about a moment, not a property of
    // the goal.
    await expect(page.getByText("Guiding value: Courageous").last()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/modules/cbt/goals");
    await expect(page.getByText("Swim once a week").last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Guiding value: Courageous").last()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto(detailPath);

    // ── Re-open for edit: the anchor must come back prefilled ──────────────────
    await page.getByRole("button", { name: "Edit goal", exact: true }).click();
    await expect(page).toHaveURL(/\/modules\/cbt\/goals\/new\?goalId=/, { timeout: 15_000 });
    const editChip = page.getByRole("checkbox", { name: "Courageous", exact: true });
    await expect(editChip).toBeVisible({ timeout: 15_000 });
    await expect(editChip).toBeChecked();

    // ── And it can be cleared back to "anchored to nothing" ───────────────────
    await page.getByRole("button", { name: "Clear value", exact: true }).click();
    await expect(editChip).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Clear value", exact: true })).toHaveCount(0);
  });

  /**
   * A value the user has since demoted (#1291).
   *
   * Re-ranking the values screen must not reach back and change a goal that was
   * anchored before the re-rank - not by clearing it, and not by decorating it with
   * a warning that turns a change of priorities into a chore. Seeded directly
   * rather than driven through the wizard: the wizard can only offer values that
   * *are* priorities, so the state under test is unreachable from the UI.
   */
  test("alice's goal keeps showing a value she has since dropped from her priorities", async ({
    page,
    user,
  }) => {
    const admin = createServiceClient();
    // "courageous" is deliberately absent from both lists: it is not a priority,
    // and it is not even ranked any more.
    const { error: profileError } = await admin.from("values_profile").insert({
      user_id: user.id,
      personal_values: [{ key: "curious", tier: 1 }],
      priority_values: ["curious"],
    });
    expect(profileError).toBeNull();

    // `goals` is an encrypted view; the INSTEAD OF trigger encrypts `value_key`
    // on the way in, exactly as it does for a goal saved from the wizard.
    const { data: goal, error: goalError } = await admin
      .from("goals")
      .insert({
        user_id: user.id,
        title: "Speak up in the team meeting",
        description: "",
        life_domain: "work",
        goal_type: "doMore",
        status: "active",
        value_key: "courageous",
      })
      .select("id")
      .single();
    if (goalError || !goal) throw new Error(`Seed goals failed: ${goalError?.message}`);

    // The label comes from the static value list, so it resolves whatever the
    // user's own rankings now say.
    await page.goto("/modules/cbt/goals");
    await expect(page.getByText("Speak up in the team meeting").last()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Guiding value: Courageous").last()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto(`/modules/cbt/goals/${goal.id as string}`);
    await expect(page.getByText("Guiding value: Courageous").last()).toBeVisible({
      timeout: 15_000,
    });
    // The life domain still reads as it always did, beside it.
    await expect(page.getByText("Work").last()).toBeVisible({ timeout: 10_000 });
  });
});

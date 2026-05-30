import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  deleteAllActivityLogsForUser,
  deleteAllMoodLogsForUser,
  dismissCbtOnboarding,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

/**
 * Routes:
 *   /modules/cbt/activities/new    — NewActivityScreen (single form)
 *   /modules/cbt/activities/[id]   — ActivityDetailScreen
 *   /modules/cbt/activities        — ActivitiesScreen (list)
 *
 * The new-activity form (cbt.json > activities):
 *   nameLabel "Activity name"
 *   categoryLabel "Category"  → buttons "Pleasure" | "Mastery"
 *   paceCategory "PACE category" → optional buttons
 *   scheduledAt "Scheduled date & time"
 *   moodBefore "Mood before (1–5)"
 *   notes "Notes"
 *   save "Save activity"
 *
 * The detail screen (ActivityDetailScreen):
 *   - Shows activity name, category badge ("Pleasure" | "Mastery")
 *   - If not completed: shows "Mark as complete" button (activities.markComplete)
 *     and "Edit activity" button (activities.edit)
 *   - "Mark as complete" navigates to:
 *       /tools/mood-tracker/new?linkedStrategy=behavioral-activation&completeActivityId={id}
 *     The user rates mood (MoodScale 1–5: Awful/Low/OK/Good/Great) then
 *     clicks "Save" (mood.save). This completes the activity (sets completedAt +
 *     moodAfter) and redirects back to /modules/cbt/activities/{id}.
 *   - After completion: "Completed" badge is visible; "Mark as complete" button is gone.
 *
 * The detail screen has NO delete button. Cleanup is via deleteAllActivityLogsForUser.
 *
 * State assertions:
 *   - After create: activity name + "Pleasure" category badge visible on detail screen
 *   - After mark-complete: "Completed" badge visible; "Mark as complete" button gone
 */

test.describe("CBT activities: schedule and complete a behavioral-activation activity", () => {
  test.beforeEach(async () => {
    await deleteAllActivityLogsForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
  });
  test.afterEach(async () => {
    await deleteAllActivityLogsForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
  });

  test("alice schedules a pleasure activity, marks it complete via mood log, and sees the Completed badge", async ({
    page,
  }) => {
    const activityName = "Evening walk in the park";

    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/modules/cbt/activities/new");
    await dismissCbtOnboarding(page);

    // ── Fill the activity form ─────────────────────────────────────────────────
    await page.getByRole("textbox", { name: "Activity name" }).fill(activityName);

    // Category: "Pleasure" is the default but click it explicitly to be sure.
    await page.getByRole("button", { name: "Pleasure", exact: true }).click();

    // Rate mood before: click "Good" (score 4 on the MoodScale).
    // MoodScale renders Pressables with accessibilityLabel from mood:checkin.scaleLabels.
    await page.getByRole("button", { name: "Good", exact: true }).click();

    await page.getByRole("button", { name: "Save activity", exact: true }).click();

    // After save, router.replace to /modules/cbt/activities/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/activities\/[^/]+$/, { timeout: 20_000 });
    // Use .last() for router.replace DOM stack
    await expect(page.getByText(activityName).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Pleasure").last()).toBeVisible({ timeout: 10_000 });

    // "Mark as complete" button should be present (activity not yet completed)
    await expect(
      page.getByRole("button", { name: "Mark as complete", exact: true }).last(),
    ).toBeVisible({ timeout: 10_000 });

    // ── Mark as complete ───────────────────────────────────────────────────────
    // This navigates to the mood-tracker/new route with completeActivityId param.
    await page.getByRole("button", { name: "Mark as complete", exact: true }).last().click();

    // Should be on the mood tracker new entry screen.
    await expect(page).toHaveURL(/\/tools\/mood-tracker\/new/, { timeout: 15_000 });

    // Select mood score: "Good" (score 4, emoji 😊)
    await page.getByRole("button", { name: "Good", exact: true }).click();

    // Save the mood log — this also completes the activity and redirects back.
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // After completion, redirected to /modules/cbt/activities/[id]
    await expect(page).toHaveURL(/\/modules\/cbt\/activities\/[^/]+$/, { timeout: 20_000 });

    // "Completed" badge should now be visible.
    await expect(page.getByText("Completed").last()).toBeVisible({ timeout: 10_000 });

    // "Mark as complete" button should no longer be present.
    await expect(page.getByRole("button", { name: "Mark as complete", exact: true })).toHaveCount(
      0,
      { timeout: 5_000 },
    );
  });
});

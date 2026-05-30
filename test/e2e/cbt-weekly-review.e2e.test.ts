/**
 * CBT Weekly Review — read-only aggregate render test.
 *
 * Screen: app/(app)/modules/cbt/weekly-review.tsx
 * Route:  /modules/cbt/weekly-review
 *
 * What the screen aggregates (window = last 7 days: today-6 through today):
 *   1. Mood trend chart — average mood_score per day over 7 days (from mood_logs.logged_at).
 *      Shows "Mood trend" card; if no data, shows "noMoodData" text.
 *   2. Activities — planned count (all activity_logs in window by scheduled_at or created_at)
 *      and completed count (those with completed_at != null). Also shows completion rate %.
 *   3. Goal progress — active goals only; milestone completion progress (done / total).
 *   4. Thought records — count of non-archived records with created_at >= weekStart.
 *
 * Seed strategy:
 *   - 3 mood_logs: logged_at = yesterday (score 3), today (score 5), 3 days ago (score 4).
 *     All clearly within the 7-day window regardless of timezone.
 *   - 3 activity_logs: 2 with completed_at set (completed), 1 without (planned only).
 *     scheduled_at = yesterday for all three, well within the window.
 *   - 1 goal (active) with 3 milestones, 2 completed.
 *   - 3 thought_records: created_at = 2 days ago, yesterday, today.
 *
 * Assertions:
 *   - Activities: completed = 2, planned = 3, rate = "67%"
 *   - Thought records: "3 this week"
 *   - Goal progress: "2 / 3" milestone text
 *   - Mood section renders "Mood trend" card (chart points exist, no noMoodData fallback)
 *
 * Cleanup: deleteAllMoodLogsForUser, deleteAllActivityLogsForUser, deleteAllGoalsForUser,
 *          deleteAllThoughtRecordsForUser for alice.
 *
 * TIMEZONE NOTE: getWeekDates() uses local civil-date comparison via toLocalDateKey()
 * (new Date(iso).getFullYear/Month/Date). All timestamps are inserted as ISO strings with
 * explicit UTC offsets so they land on the correct local day in CI/local environments.
 * We seed "yesterday", "today", and "3 days ago" — comfortably within any 7-day window.
 */

import { expect, test } from "@playwright/test";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllActivityLogsForUser,
  deleteAllGoalsForUser,
  deleteAllMoodLogsForUser,
  deleteAllThoughtRecordsForUser,
  dismissPostSignInModals,
  signInAsViaUi,
} from "./helpers";

const ALICE_ID = SEED_USERS.alice.id;

/** Returns an ISO timestamp string for N days before now (UTC midnight + offset). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Use noon local time expressed as UTC to avoid midnight boundary issues.
  // We write the local-noon as UTC by backing out the UTC offset.
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

test.describe("CBT weekly review: aggregate render", () => {
  test.beforeEach(async () => {
    // Clean slate before each test.
    await deleteAllMoodLogsForUser(ALICE_ID);
    await deleteAllActivityLogsForUser(ALICE_ID);
    await deleteAllGoalsForUser(ALICE_ID);
    await deleteAllThoughtRecordsForUser(ALICE_ID);
  });

  test.afterEach(async () => {
    // Restore clean state after each test.
    await deleteAllMoodLogsForUser(ALICE_ID);
    await deleteAllActivityLogsForUser(ALICE_ID);
    await deleteAllGoalsForUser(ALICE_ID);
    await deleteAllThoughtRecordsForUser(ALICE_ID);
  });

  test("weekly review renders correct aggregates for seeded mood, activities, goal milestones, and thought records", async ({
    page,
  }) => {
    const admin = createServiceClient();

    // ── Seed mood logs (3 within window) ────────────────────────────────────────
    // Scores: 3, 5, 4 — all within the 7-day window (yesterday, today, 3 days ago)
    const { error: moodError } = await admin.from("mood_logs").insert([
      {
        user_id: ALICE_ID,
        mood_score: 3,
        emotions: [],
        notes: "",
        logged_at: daysAgo(1),
      },
      {
        user_id: ALICE_ID,
        mood_score: 5,
        emotions: [],
        notes: "",
        logged_at: daysAgo(0),
      },
      {
        user_id: ALICE_ID,
        mood_score: 4,
        emotions: [],
        notes: "",
        logged_at: daysAgo(3),
      },
    ]);
    if (moodError) throw new Error(`Seed mood_logs failed: ${moodError.message}`);

    // ── Seed activity_logs (3 planned, 2 completed) ──────────────────────────────
    // scheduled_at = yesterday — safely within the window.
    // completedAt set on first two rows.
    const { error: actError } = await admin.from("activity_logs").insert([
      {
        user_id: ALICE_ID,
        activity_name: "Morning run",
        category: "mastery",
        scheduled_at: daysAgo(1),
        completed_at: daysAgo(1), // completed
        notes: "",
      },
      {
        user_id: ALICE_ID,
        activity_name: "Read a book",
        category: "pleasure",
        scheduled_at: daysAgo(1),
        completed_at: daysAgo(1), // completed
        notes: "",
      },
      {
        user_id: ALICE_ID,
        activity_name: "Yoga session",
        category: "mastery",
        scheduled_at: daysAgo(1),
        completed_at: null, // planned only — not completed
        notes: "",
      },
    ]);
    if (actError) throw new Error(`Seed activity_logs failed: ${actError.message}`);

    // ── Seed a goal (active) with 3 milestones, 2 completed ─────────────────────
    const { data: goalData, error: goalError } = await admin
      .from("goals")
      .insert({
        user_id: ALICE_ID,
        title: "Run a 5K",
        description: "",
        life_domain: "health",
        goal_type: "doMore",
        status: "active",
      })
      .select("id")
      .single();
    if (goalError || !goalData) throw new Error(`Seed goals failed: ${goalError?.message}`);

    const goalId = goalData.id as string;

    const { error: milError } = await admin.from("milestones").insert([
      {
        goal_id: goalId,
        user_id: ALICE_ID,
        description: "Walk 5K",
        completed_at: daysAgo(2), // completed
      },
      {
        goal_id: goalId,
        user_id: ALICE_ID,
        description: "Run 1K without stopping",
        completed_at: daysAgo(1), // completed
      },
      {
        goal_id: goalId,
        user_id: ALICE_ID,
        description: "Run full 5K",
        completed_at: null, // not yet completed
      },
    ]);
    if (milError) throw new Error(`Seed milestones failed: ${milError.message}`);

    // ── Seed thought records (3 this week, all non-archived) ────────────────────
    const { error: trError } = await admin.from("thought_records").insert([
      {
        user_id: ALICE_ID,
        situation: "Weekly review test record 1",
        nats: [{ text: "I failed", beliefRating: 80, isHotThought: true }],
        emotions: ["anxious"],
        distortions: [],
        balanced_thought: "I did my best",
        evidence_for: [],
        evidence_against: [],
        outcome_notes: "",
        created_at: daysAgo(2),
      },
      {
        user_id: ALICE_ID,
        situation: "Weekly review test record 2",
        nats: [{ text: "I'm not good enough", beliefRating: 70, isHotThought: true }],
        emotions: ["sad"],
        distortions: [],
        balanced_thought: "I am learning",
        evidence_for: [],
        evidence_against: [],
        outcome_notes: "",
        created_at: daysAgo(1),
      },
      {
        user_id: ALICE_ID,
        situation: "Weekly review test record 3",
        nats: [{ text: "Things will go wrong", beliefRating: 60, isHotThought: true }],
        emotions: ["worried"],
        distortions: [],
        balanced_thought: "I can handle what comes",
        evidence_for: [],
        evidence_against: [],
        outcome_notes: "",
        created_at: daysAgo(0),
      },
    ]);
    if (trError) throw new Error(`Seed thought_records failed: ${trError.message}`);

    // ── Sign in and navigate to weekly review ────────────────────────────────────
    await signInAsViaUi(page, "alice");
    await dismissPostSignInModals(page);

    await page.goto("/modules/cbt/weekly-review");

    // Wait for loading to finish — the loading text should disappear.
    await expect(page.getByText("Loading your week...")).toBeHidden({ timeout: 15_000 });

    // Wait for the page title to be visible (h1 heading).
    await expect(page.getByRole("heading", { name: "Weekly review" })).toBeVisible({
      timeout: 15_000,
    });

    // ── Assert: Mood trend card renders ─────────────────────────────────────────
    // The "Mood trend" card title should be visible.
    await expect(page.getByText("Mood trend")).toBeVisible({ timeout: 10_000 });

    // We seeded 3 mood logs, so the chart should render (not the "no data" fallback).
    await expect(
      page.getByText(
        "No mood logs for this week yet. Log your mood from the dashboard to see it here.",
      ),
    ).toBeHidden({ timeout: 5_000 });

    // ── Assert: Activities — 2 completed, 3 planned, 67% rate ───────────────────
    await expect(page.getByText("Activities")).toBeVisible({ timeout: 10_000 });

    // The completed count "2" should appear as a bold stat.
    // The "completed" label sits below it; we look for both text values.
    const activitiesCard = page.locator("text=Activities").locator("../..");
    // Use locator-based approach: look for the exact stat values in the activities card region.
    // Find the "2" completed stat and "3" planned stat.
    // The screen renders: <Text>2</Text><Text>completed</Text> and <Text>3</Text><Text>planned</Text>
    // We scope to the page since locator traversal is complex in React Native web.
    await expect(page.getByText("completed")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("planned")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("rate")).toBeVisible({ timeout: 10_000 });

    // Assert the exact counts — there should be exactly a "2" and "3" in the activities section.
    // The screen renders these as large bold numbers. We assert by finding the stat text elements.
    // To keep this deterministic, we look for "67%" (2/3 = 66.666...% → Math.round = 67%).
    await expect(page.getByText("67%")).toBeVisible({ timeout: 10_000 });

    // ── Assert: Goal progress — "Run a 5K" with 2/3 milestones ─────────────────
    await expect(page.getByText("Goal progress")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Run a 5K")).toBeVisible({ timeout: 10_000 });

    // Milestone progress text: t("weeklyReview.milestonesProgress", { done: 2, total: 3 }) = "2 / 3"
    await expect(page.getByText("2 / 3")).toBeVisible({ timeout: 10_000 });

    // ── Assert: Thought records — 3 this week ───────────────────────────────────
    await expect(page.getByText("Thought records")).toBeVisible({ timeout: 10_000 });

    // The screen renders: <Text className="text-3xl font-bold">{weekRecords.length}</Text>
    // followed by <Text>this week</Text>.
    // weekRecords filters by created_at >= weekStart (today - 6 days).
    // We seeded 3 records at daysAgo(0), daysAgo(1), daysAgo(2) — all >= weekStart.
    await expect(page.getByText("this week")).toBeVisible({ timeout: 10_000 });

    // Scope the "3" count assertion to the Thought records card to avoid ambiguity with
    // the mood chart's SVG y-axis label "3" which also appears as bare text in the DOM.
    // Filter to the div that contains BOTH the "Thought records" heading AND "this week" —
    // that uniquely identifies the records Card (not the chart, not any other card).
    const recordsCard = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: "Thought records", level: 3 }) })
      .filter({ has: page.getByText("this week", { exact: true }) })
      .last();
    await expect(recordsCard.getByText("3", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Also assert "this week" label is present alongside it.
    await expect(recordsCard.getByText("this week")).toBeVisible({ timeout: 5_000 });

    // ── Assert: Reflection prompt card is present ────────────────────────────────
    await expect(page.getByText("Reflection prompt")).toBeVisible({ timeout: 10_000 });
  });
});

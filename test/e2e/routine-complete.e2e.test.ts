import { expect, test } from "./fixtures";

import {
  deleteAllMoodLogsForUser,
  deleteAllRoutinesForUser,
  dismissPostSignInModals,
  navigateViaPanel,
} from "./helpers";

test.describe("routine completes via tool use", () => {
  // Clean both the routines AND the step tool's records (mood logs): routine
  // status is DERIVED from tool records, so a leftover mood log from another
  // spec on this worker user would make a fresh routine start "complete".
  test.beforeEach(async ({ user }) => {
    await deleteAllRoutinesForUser(user.id);
    await deleteAllMoodLogsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllRoutinesForUser(user.id);
    await deleteAllMoodLogsForUser(user.id);
  });

  test("alice creates a mood routine, logs a mood, and sees the routine complete and the FAB retire", async ({
    page,
  }) => {
    const routineName = "E2E morning reset";

    // Initial load + gate dismissal (create-habit pattern): a prior spec's
    // trailing preferences write can leave stale policy_version_accepted at
    // boot, and the consent gate then hijacks the deep link to "/". Dismiss any
    // gates, then reach the routines page via the sidebar link - in-app
    // navigation is immune to the hijack.
    await page.goto("/routines");
    await dismissPostSignInModals(page);
    await navigateViaPanel(page, "Routines");
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });

    // --- Create a routine with a single mood step via the editor UI ---
    await page.getByRole("button", { name: "New routine", exact: true }).click();
    await expect(page).toHaveURL(/\/routines\/new$/, { timeout: 15_000 });

    // The name field is pre-filled with the i18n default; replace it.
    await page.getByRole("textbox", { name: "Routine name", exact: true }).fill(routineName);

    // Add the "Mood check-in" step chip; the step row's remove button is the
    // one locator unique to the ROW (the chip itself keeps the tool's name).
    await page.getByRole("button", { name: "Add Mood check-in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove Mood check-in", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Save routes (router.replace) to /routines/[id]. Wait for the post-save
    // URL before navigating away - navigating mid-replace can be swallowed as
    // a same-document navigation (log-mood lesson). Ids are UUIDs (hex), so a
    // segment starting with "new" can only be the editor itself.
    await page.waitForURL(/\/routines\/(?!new)[^/]+$/, { timeout: 15_000 });

    // --- Routines home: card is not started, FAB shows 0/1 ---
    await navigateViaPanel(page, "Routines");
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });

    // Scope status assertions to the routine CARD: the page renders tool names
    // and glyphs in several places (day strip, starter offer, editor chips).
    const card = page.getByRole("button", { name: "Open routine", exact: true });
    await expect(card.getByText(routineName, { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText("Not started", { exact: true })).toBeVisible();
    await expect(card.getByText("0/1 today", { exact: true })).toBeVisible();

    // The floating routine handle is visible while a step is still open today,
    // labelled with the routine it counts (#91).
    await expect(
      page.getByRole("button", { name: `Continue "${routineName}": 0 of 1 steps done today` }),
    ).toBeVisible({ timeout: 15_000 });

    // --- Qualifying action: log a mood, all in-app (no hard gotos) ---
    // Panel "Check-in" -> tracker home; tapping a score on the check-in card
    // pushes to /tools/check-in/new?score=N with the score pre-selected.
    await navigateViaPanel(page, "Check-in");
    await expect(page).toHaveURL(/\/tools\/mood-tracker$/, { timeout: 15_000 });

    // Mood logs were cleaned in beforeEach, so the history list is empty and
    // the check-in card's scale renders the only "OK" radio on this screen.
    await page.getByRole("radio", { name: "OK", exact: true }).click();
    await page.waitForURL(/\/tools\/mood-tracker\/new\?/, { timeout: 15_000 });

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Wait for the post-save redirect to the entry detail page before
    // navigating away (log-mood lesson: a goto racing the in-flight
    // router.replace silently doesn't navigate). The mood log is created "now"
    // through the UI, so there is no future-timestamp hazard.
    await page.waitForURL(/\/tools\/mood-tracker\/(?!new)[^/]+$/, { timeout: 15_000 });

    // --- Back on routines home: step derived complete, FAB retired ---
    await navigateViaPanel(page, "Routines");
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });

    await expect(card.getByText("Done for today", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(card.getByText("1/1 today", { exact: true })).toBeVisible();

    // No open steps left today, so the floating handle is gone (any label).
    // The completed checkmark (#91) plays only on a LIVE visible->done
    // transition; the transition here happened while the FAB was suppressed on
    // the mood form, so nothing shows at all.
    await expect(page.getByRole("button", { name: /^Continue "/ })).toBeHidden({
      timeout: 15_000,
    });
    // If the completion refetch landed while the FAB was briefly visible, the
    // checkmark plays and fades (~3s) - retry until it is gone for good.
    await expect(page.getByRole("button", { name: "Routine complete" })).toBeHidden({
      timeout: 15_000,
    });
  });
});

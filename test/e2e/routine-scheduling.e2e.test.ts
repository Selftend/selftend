import { expect, test } from "./fixtures";

import {
  deleteAllMoodLogsForUser,
  deleteAllRoutinesForUser,
  dismissPostSignInModals,
} from "./helpers";

// Weekday short names as rendered by form.weekday.* / schedule.weekday.*,
// indexed by JS getDay() numbers (0=Sun..6=Sat).
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// The editor preselects Mon-Fri when switching to a custom cadence.
const PRESELECTED_DAYS = [1, 2, 3, 4, 5];

test.describe("routine scheduling (#95: custom days, off-day surfaces, manual runs)", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllRoutinesForUser(user.id);
    await deleteAllMoodLogsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllRoutinesForUser(user.id);
    await deleteAllMoodLogsForUser(user.id);
  });

  test("an off-today custom routine hides from FAB and Home, labels its card, and still tracks a manual run", async ({
    page,
  }) => {
    const routineName = "E2E scheduled reset";

    // Everything is computed relative to the RUNNER's today (CI is UTC; the
    // browser shares the runner's timezone), per test/e2e/README.md: never
    // hardcode weekdays. Pick two weekday values that are NOT today so the
    // routine is guaranteed off-schedule for the whole run. Preferring
    // Mon-Fri values keeps the chip choreography to deselects only.
    const today = new Date().getDay();
    const targetDays = PRESELECTED_DAYS.filter((day) => day !== today).slice(0, 2);
    const offDays = PRESELECTED_DAYS.filter((day) => !targetDays.includes(day));
    const expectedLabel = `Runs ${targetDays.map((day) => DAY_NAMES[day]).join(", ")}`;

    // Initial load + gate dismissal, then in-app nav (create-habit pattern:
    // in-app navigation is immune to the consent-gate deep-link hijack).
    await page.goto("/routines");
    await dismissPostSignInModals(page);
    await page.getByRole("link", { name: "Routines", exact: true }).first().click();
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });

    // --- Create a mood routine scheduled on two non-today days ---
    await page.getByRole("button", { name: "New routine", exact: true }).click();
    await expect(page).toHaveURL(/\/routines\/new$/, { timeout: 15_000 });

    await page.getByRole("textbox", { name: "Routine name", exact: true }).fill(routineName);
    await page.getByRole("button", { name: "Add Mood check-in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove Mood check-in", exact: true }),
    ).toBeVisible();

    // Days section: switch to Custom (Mon-Fri preselected), then deselect
    // everything that is not one of the two target days.
    await page.getByRole("radio", { name: "Custom", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Mon", exact: true })).toBeVisible();
    for (const day of offDays) {
      await page.getByRole("checkbox", { name: DAY_NAMES[day], exact: true }).click();
    }

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForURL(/\/routines\/(?!new)[^/]+$/, { timeout: 15_000 });
    const routineUrl = page.url();

    // --- Routines home: calm schedule label, no unmet count, no FAB ---
    await page.getByRole("link", { name: "Routines", exact: true }).first().click();
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });

    const card = page.getByRole("button", { name: "Open routine", exact: true });
    await expect(card.getByText(routineName, { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(expectedLabel, { exact: true })).toBeVisible();
    // Resting cards carry no zero-progress badge and no "Not started" nudge.
    await expect(card.getByText("0/1 today", { exact: true })).toBeHidden();
    await expect(card.getByText("Not started", { exact: true })).toBeHidden();

    // The FAB only counts routines scheduled today - an off-today routine
    // with an open step must not nudge (any label form).
    await expect(page.getByTestId("routine-fab")).toBeHidden();

    // --- Home: the routines-today widget slot is suppressed entirely ---
    await page.getByRole("link", { name: "Home", exact: true }).first().click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByText("Routines today", { exact: true })).toBeHidden();
    await expect(page.getByTestId("routine-fab")).toBeHidden();

    // --- Manual run: off-schedule still tracks (independent-fact rule) ---
    // Log a mood through the normal check-in flow (the routine's only step).
    await page.getByRole("link", { name: "Check-in", exact: true }).first().click();
    await expect(page).toHaveURL(/\/tools\/mood-tracker$/, { timeout: 15_000 });
    await page.getByRole("radio", { name: "OK", exact: true }).click();
    await page.waitForURL(/\/tools\/mood-tracker\/new\?/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForURL(/\/tools\/mood-tracker\/(?!new)[^/]+$/, { timeout: 15_000 });

    // Back on routines home: progress shows despite the off-day - emphasis
    // changed, tracking didn't. The FAB stays quiet (still not scheduled).
    await page.getByRole("link", { name: "Routines", exact: true }).first().click();
    await expect(page).toHaveURL(/\/routines$/, { timeout: 15_000 });
    await expect(card.getByText("Done for today", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(card.getByText("1/1 today", { exact: true })).toBeVisible();
    await expect(page.getByTestId("routine-fab")).toBeHidden();
    await expect(page.getByTestId("routine-fab-complete")).toBeHidden();

    // --- Detail screen sanity: the step reads done today ---
    await page.goto(routineUrl);
    await expect(page.getByText("Done today", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

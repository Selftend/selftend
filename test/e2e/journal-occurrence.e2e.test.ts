import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { createServiceClient, deleteAllJournalEntriesForUser } from "./helpers";

function monthDistance(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
}

async function moveCalendarMonth(page: Page, from: Date, to: Date) {
  const distance = monthDistance(from, to);
  // By testID, not by name: since #1301 these buttons are translated
  // ("Next month" / "Следващ месец"), so an English name is language-bound
  // where the testID is not.
  const direction = distance < 0 ? "btn-prev" : "btn-next";
  for (let step = 0; step < Math.abs(distance); step += 1) {
    await page.getByTestId(direction).click();
  }
}

/**
 * A day cell in the open calendar.
 *
 * ⚠️ Matched on the TAIL of the accessible name, and scoped to the grid. Since
 * #1301 a day is named in full — "Sunday, March 15, 2026", with a "Today, "
 * prefix on today — so the bare number no longer identifies anything. The
 * scoping matters because the field's own trigger renders "Tue, Mar 15, 2026",
 * which ends the same way.
 */
function calendarDay(page: Page, day: number) {
  return page.getByTestId("days").getByRole("button", { name: new RegExp(`\\b${day}, \\d{4}$`) });
}

async function selectCalendarDay(page: Page, day: number) {
  const dayButton = calendarDay(page, day);
  await expect(dayButton).toHaveCount(1);
  await dayButton.click();
}

function expectedOffsetMinutes(date: Date) {
  // getTimezoneOffset() returns 0 in UTC, and negating 0 yields -0. Postgres
  // normalizes -0 to 0 for numeric columns, so compare against a normalized
  // value to avoid Object.is(-0, 0) === false failures in toBe().
  return -date.getTimezoneOffset() || 0;
}

function expectSameLocalDay(actualIso: string, expected: Date) {
  const actual = new Date(actualIso);
  expect([actual.getFullYear(), actual.getMonth(), actual.getDate()]).toEqual([
    expected.getFullYear(),
    expected.getMonth(),
    expected.getDate(),
  ]);
}

test.describe("journal occurrence date and time", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
  });

  test("creates and edits a past occurrence while preventing a future date", async ({ page }) => {
    const now = new Date();
    const firstOccurrence = new Date(now);
    firstOccurrence.setDate(now.getDate() - 2);
    const editedOccurrence = new Date(now);
    editedOccurrence.setDate(now.getDate() - 1);
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + 1);

    await page.goto("/tools/journal/new");
    await page.getByPlaceholder("Untitled").fill("Occurrence test");
    await page.getByPlaceholder("Write what's on your mind.").fill("A past journal entry.");

    await page.getByRole("button", { name: "Date", exact: true }).click();
    await moveCalendarMonth(page, now, firstOccurrence);
    await selectCalendarDay(page, firstOccurrence.getDate());
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // One assertion, not two. `/tools/journal/new` also matches
    // `/tools/journal/[^/]+$`, so the pair only worked because the `not.` line
    // ran first - and that line is the one that flaked (#548), because it is
    // the one actually waiting for the save round trip. A negative lookahead
    // says what is meant in a single wait: some id that is not `new`.
    //
    // 30s rather than 15s because this waits on a save against local Supabase
    // with four workers competing; the assertion is unchanged, it just stops
    // treating a slow environment as a failure.
    await expect(page).toHaveURL(/\/tools\/journal\/(?!new$)[^/]+$/, { timeout: 30_000 });
    const createdId = new URL(page.url()).pathname.split("/").at(-1);
    expect(createdId).toBeTruthy();

    const admin = createServiceClient();
    const { data: created, error: createdError } = await admin
      .from("journal_entries_data")
      .select("id, occurred_at, occurred_offset_minutes")
      .eq("id", createdId!)
      .single();
    if (createdError) throw new Error(createdError.message);
    expectSameLocalDay(created.occurred_at, firstOccurrence);
    expect(created.occurred_offset_minutes).toBe(expectedOffsetMinutes(firstOccurrence));

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Date", exact: true }).click();

    await moveCalendarMonth(page, firstOccurrence, futureDate);
    const futureDayButton = page.getByRole("button", {
      name: String(futureDate.getDate()),
      exact: true,
    });
    await expect(futureDayButton).toHaveCount(1);
    await expect(futureDayButton).toBeDisabled();

    await moveCalendarMonth(page, futureDate, editedOccurrence);
    await selectCalendarDay(page, editedOccurrence.getDate());
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await expect(page).not.toHaveURL(/\/edit$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/tools\/journal\/[^/]+$/, { timeout: 15_000 });

    const { data: edited, error: editedError } = await admin
      .from("journal_entries_data")
      .select("occurred_at, occurred_offset_minutes")
      .eq("id", createdId!)
      .single();
    if (editedError) throw new Error(editedError.message);
    expectSameLocalDay(edited.occurred_at, editedOccurrence);
    expect(edited.occurred_offset_minutes).toBe(expectedOffsetMinutes(editedOccurrence));
  });
});

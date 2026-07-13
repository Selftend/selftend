import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { createServiceClient, deleteAllJournalEntriesForUser } from "./helpers";

function monthDistance(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
}

async function moveCalendarMonth(page: Page, from: Date, to: Date) {
  const distance = monthDistance(from, to);
  const direction = distance < 0 ? "Prev" : "Next";
  for (let step = 0; step < Math.abs(distance); step += 1) {
    await page.getByRole("button", { name: direction, exact: true }).click();
  }
}

async function selectCalendarDay(page: Page, day: number) {
  const dayButton = page.getByRole("button", { name: String(day), exact: true });
  await expect(dayButton).toHaveCount(1);
  await dayButton.click();
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
    await expect(page).not.toHaveURL(/\/tools\/journal\/new$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/tools\/journal\/[^/]+$/, { timeout: 15_000 });
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
    expect(created.occurred_offset_minutes).toBe(-firstOccurrence.getTimezoneOffset());

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
    expect(edited.occurred_offset_minutes).toBe(-editedOccurrence.getTimezoneOffset());
  });
});

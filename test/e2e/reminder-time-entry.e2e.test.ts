import { expect, test } from "./fixtures";

import { createServiceClient } from "./helpers";

/**
 * The typed `HH : MM` time control, end to end (#1299).
 *
 * The reminders row is the only place this is observable: it is the one compact
 * call site and the only one of the five that WRITES on commit, so blur-with-a-
 * complete-value reaching Postgres can be asserted here and nowhere else.
 *
 * 360dp because that is the app's supported width floor (docs/accessibility.md)
 * and the default Desktop Chrome viewport hides every phone branch of this row.
 */

const HOUR_FIELD = "Check-in reminder time, hour";
const MINUTE_FIELD = "Check-in reminder time, minute";

async function readMoodReminder(userId: string) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select("mood_reminder_hour, mood_reminder_minute")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data as { mood_reminder_hour: number; mood_reminder_minute: number };
}

test.describe("reminder time entry", () => {
  test.beforeEach(async ({ page, user }) => {
    const admin = createServiceClient();
    const { error } = await admin
      .from("user_preferences")
      .update({
        language: "en",
        theme: "light",
        notifications_enabled_global: true,
        mood_reminder_hour: 9,
        mood_reminder_minute: 0,
      })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);

    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    // The language column is read back on load and overwrites the local value,
    // so both are pinned - an unpinned locale silently changes 12-vs-24-hour.
    await page.evaluate(() => {
      localStorage.setItem("selftend:language", "en");
      localStorage.setItem("selftend:theme", "light");
    });
    await page.goto("/notifications");
    await expect(page.getByTestId("notification-row-mood")).toBeVisible({ timeout: 15_000 });
  });

  test.afterEach(async ({ user }) => {
    const admin = createServiceClient();
    const { error } = await admin
      .from("user_preferences")
      .update({ mood_reminder_hour: 9, mood_reminder_minute: 0 })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  });

  test("types a time into real inputs, holds focus, and writes it on blur", async ({
    page,
    user,
  }) => {
    // The whole point of the replacement: nothing in the app hands time entry to
    // the browser's own widget any more.
    await expect(page.locator('input[type="time"]')).toHaveCount(0);

    const hour = page.getByLabel(HOUR_FIELD);
    const minute = page.getByLabel(MINUTE_FIELD);
    // en is a 12-hour locale, so 09:00 reads as 09 + AM.
    await expect(hour).toHaveValue("09");
    await expect(page.getByRole("tab", { name: "AM" })).toHaveAttribute("aria-selected", "true");

    await hour.click();
    await hour.fill("11");

    // ☠️ Focus must NOT auto-advance on the second digit: moving focus out from
    // under a screen-reader user mid-entry is worse than one extra Tab.
    await expect(hour).toBeFocused();
    // ...and nothing is written until the field is left.
    expect(await readMoodReminder(user.id)).toMatchObject({ mood_reminder_hour: 9 });

    await minute.click();
    await minute.fill("45");
    await page.keyboard.press("Tab");

    await expect
      .poll(async () => await readMoodReminder(user.id))
      .toMatchObject({ mood_reminder_hour: 11, mood_reminder_minute: 45 });
  });

  test("an abandoned half-typed edit reverts visibly and says so, writing nothing", async ({
    page,
    user,
  }) => {
    const hour = page.getByLabel(HOUR_FIELD);

    await hour.click();
    await hour.fill("99");
    await expect(hour).toHaveValue("99");

    await page.keyboard.press("Tab");

    await expect(hour).toHaveValue("09");
    // A silent revert would be an unidentified change; this one is announced.
    await expect(page.getByText("Reverted to 9:00 AM")).toBeVisible();
    expect(await readMoodReminder(user.id)).toMatchObject({
      mood_reminder_hour: 9,
      mood_reminder_minute: 0,
    });
  });

  test("the whole control is reachable and operable by keyboard alone", async ({ page, user }) => {
    const hour = page.getByLabel(HOUR_FIELD);

    await hour.focus();
    await expect(hour).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(MINUTE_FIELD)).toBeFocused();
    await page.keyboard.press("Tab");
    // The AM/PM group is one tab stop (roving tabindex), and its arrows move
    // between the two halves of the day.
    await expect(page.getByRole("tab", { name: "AM" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await readMoodReminder(user.id)).mood_reminder_hour).toBe(21);
  });
});

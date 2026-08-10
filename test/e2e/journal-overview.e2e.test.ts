import { expect, test } from "./fixtures";

import { createServiceClient, deleteAllJournalEntriesForUser } from "./helpers";

test.describe("journal overview", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
    const admin = createServiceClient();
    const preferences = await admin
      .from("user_preferences")
      .update({ language: "en", theme: "light" })
      .eq("user_id", user.id);
    if (preferences.error) throw new Error(preferences.error.message);
    const rows = Array.from({ length: 6 }, (_, index) => {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - index);
      return {
        user_id: user.id,
        title:
          index === 0
            ? "A deliberately long journal title for the phone row"
            : `Entry ${index + 1}`,
        body:
          index === 0
            ? "A longer first line that must truncate before the fixed timestamp and word-count column."
            : `A short entry written on day ${index + 1}.`,
        occurred_at: day.toISOString(),
        occurred_offset_minutes: 0,
      };
    });
    const insert = await admin.from("journal_entries").insert(rows);
    if (insert.error) throw new Error(insert.error.message);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllJournalEntriesForUser(user.id);
    const admin = createServiceClient();
    const preferences = await admin
      .from("user_preferences")
      .update({ language: "en", theme: "light" })
      .eq("user_id", user.id);
    if (preferences.error) throw new Error(preferences.error.message);
  });

  test("fits the fourteen-day chart and recent rows at 360dp in both locales and themes", async ({
    page,
    user,
  }) => {
    const admin = createServiceClient();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("selftend:language", "en");
      localStorage.setItem("selftend:theme", "light");
    });
    await page.goto("/tools/journal");

    await expect(page.getByRole("heading", { name: "Journal", exact: true })).toBeVisible();
    await expect(page.getByText("Words written per day.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("bar-chart-bar")).toHaveCount(14);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/journal-overview-en-light.png", fullPage: true });

    const darkPreferences = await admin
      .from("user_preferences")
      .update({ theme: "dark" })
      .eq("user_id", user.id);
    if (darkPreferences.error) throw new Error(darkPreferences.error.message);
    await page.evaluate(() => localStorage.setItem("selftend:theme", "dark"));
    await page.reload();
    await expect(page.locator("html.dark")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/journal-overview-en-dark.png", fullPage: true });

    const bulgarianPreferences = await admin
      .from("user_preferences")
      .update({ language: "bg" })
      .eq("user_id", user.id);
    if (bulgarianPreferences.error) throw new Error(bulgarianPreferences.error.message);
    await page.evaluate(() => localStorage.setItem("selftend:language", "bg"));
    await page.reload();
    await expect(page.getByRole("heading", { name: "Дневник", exact: true })).toBeVisible();
    await expect(page.getByText("Думи, написани на ден.", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/journal-overview-bg-dark.png", fullPage: true });

    const lightPreferences = await admin
      .from("user_preferences")
      .update({ theme: "light" })
      .eq("user_id", user.id);
    if (lightPreferences.error) throw new Error(lightPreferences.error.message);
    await page.evaluate(() => localStorage.setItem("selftend:theme", "light"));
    await page.reload();
    await expect(page.locator("html.dark")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/journal-overview-bg-light.png", fullPage: true });
  });
});

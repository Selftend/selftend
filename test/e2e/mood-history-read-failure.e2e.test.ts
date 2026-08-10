import { expect, test } from "./fixtures";

test.describe("mood history read failure", () => {
  test("settles into its error state after the configured single retry", async ({ page }) => {
    const attemptsAt: number[] = [];
    const startedAt = Date.now();

    await page.route("**/rest/v1/mood_logs?*", async (route) => {
      attemptsAt.push(Date.now() - startedAt);
      await route.abort("failed");
    });

    await page.goto("/tools/check-in/history");
    await expect(page.getByText("Couldn't load your history", { exact: true })).toBeVisible({
      timeout: 8_000,
    });

    expect(attemptsAt).toEqual([expect.any(Number), expect.any(Number)]);
    expect(Date.now() - startedAt).toBeLessThan(8_000);
  });
});

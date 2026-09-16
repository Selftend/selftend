import { expect, test } from "./fixtures";

import { createServiceClient } from "./helpers";

async function deleteAllMeditationSessionsForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("meditation_sessions").delete().eq("user_id", userId);
}

test.describe("meditation sit", () => {
  test.beforeEach(async ({ user }) => {
    await deleteAllMeditationSessionsForUser(user.id);
  });

  test.afterEach(async ({ user }) => {
    await deleteAllMeditationSessionsForUser(user.id);
  });

  test("finishing early records the sit; Skip leaves it intact (#786)", async ({ page, user }) => {
    // The sit route takes its setup as query params, which is exactly how the
    // overview's Begin hands them over - going to it directly skips the wait.
    await page.goto("/tools/meditation/session?duration=1&bell=0");

    // The sit starts on focus; finishing early records the elapsed time
    // (floored to one minute) BEFORE the reflection is offered.
    await page.getByRole("button", { name: "Finish early", exact: true }).click();

    // The reflection opens over an already-saved row - its copy says so.
    await expect(page.getByText("Saved already — the rest is only if it's useful.")).toBeVisible();

    // Skip writes nothing further and returns to the overview.
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/meditation$/, { timeout: 15_000 });

    const admin = createServiceClient();
    const result = await admin
      .from("meditation_sessions")
      .select("duration_minutes, obstacle_tags, reflection")
      .eq("user_id", user.id);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].duration_minutes).toBe(1);
    expect(result.data?.[0].obstacle_tags).toEqual([]);
    expect(result.data?.[0].reflection).toBe("");
  });

  test("saving the reflection updates the recorded row rather than creating one", async ({
    page,
    user,
  }) => {
    await page.goto("/tools/meditation/session?duration=1&bell=0");
    await page.getByRole("button", { name: "Finish early", exact: true }).click();
    await expect(page.getByText("Saved already — the rest is only if it's useful.")).toBeVisible();

    await page.getByTestId("sit-pull-resistance").click();
    await page.getByPlaceholder("Anything worth noting?").fill("Noisy street, sat anyway.");
    await page.getByRole("button", { name: "Save reflection", exact: true }).click();
    await expect(page).toHaveURL(/\/tools\/meditation$/, { timeout: 15_000 });

    const admin = createServiceClient();
    const result = await admin
      .from("meditation_sessions")
      .select("duration_minutes, obstacle_tags, reflection")
      .eq("user_id", user.id);
    expect(result.error).toBeNull();
    // One row: the reflection is an UPDATE of the sit the timer saved.
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].obstacle_tags).toEqual(["resistance"]);
    expect(result.data?.[0].reflection).toBe("Noisy street, sat anyway.");
  });

  // The one half of `docs/sound.md` §1.4 that jest cannot reach: jest runs as
  // iOS, and the dialog role, the Tab trap, Escape and focus returning to the
  // door are all react-native-web's `Modal`. Inherited behaviour is still
  // behaviour this panel promises, so it is measured here rather than asserted
  // in a comment.
  test("the sound panel is a dialog that traps focus and hands it back to the door (#2507)", async ({
    page,
  }) => {
    await page.goto("/tools/meditation/session?duration=5&bell=0");

    const door = page.getByTestId("sit-sound-door");
    await expect(door).toBeVisible();
    // Nothing icon-only: the word is rendered beside the glyph. `toContainText`
    // rather than `toHaveText` because the MaterialIcons glyph IS a character in
    // this node's text content, so an exact match would compare against it too.
    await expect(door).toContainText("Sound");
    await expect(door).toHaveAttribute("aria-label", "Background sound");

    // Opened from the keyboard, not a mouse click, so the focus story below is
    // the one a keyboard user actually gets.
    await door.focus();
    await expect(door).toBeFocused();
    await door.press("Enter");

    const panel = page.getByTestId("sound-panel-sheet");
    await expect(panel).toBeVisible();
    const dialog = page.getByRole("dialog").filter({ has: panel });
    await expect(dialog).toHaveCount(1);

    // Focus went into the panel and stays there: five Tabs from inside a panel
    // holding ten radios, Done and the rail must not reach the page behind it.
    await expect(door).not.toBeFocused();
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press("Tab");
      const trapped = await page.evaluate(() => {
        const node = document.querySelector('[role="dialog"]');
        return (
          node !== null && document.activeElement !== null && node.contains(document.activeElement)
        );
      });
      expect(trapped).toBe(true);
    }

    // Tap-outside dismissal is OFF (§1.4): a stray tap during a sit must not
    // close the panel, so the backdrop is a plain View and this click lands on
    // nothing. The sheet is bottom-anchored, so the top of the window is
    // backdrop.
    const viewport = page.viewportSize();
    await page.mouse.click(Math.round((viewport?.width ?? 800) / 2), 24);
    await expect(panel).toBeVisible();

    // Escape closes it, and focus comes back to the door it was opened from.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(door).toBeFocused();

    // The clock never paused behind any of it - the sit is still running, and
    // `Pause` still reads `Pause`.
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

    // And Done is the other way out.
    await door.press("Enter");
    await expect(panel).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(panel).toBeHidden();
  });
});

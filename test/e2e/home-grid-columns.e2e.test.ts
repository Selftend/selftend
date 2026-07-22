/**
 * Dashboard grid column-count regression test.
 *
 * The dashboard once wrapped a 3-column row down to 2 columns at plenty of
 * viewport widths: cells were styled to exactly fill the row while
 * react-native-sortables computes wrapping from its OWN item measurements and
 * silently drops re-measurements that differ by <= 1px. Slow (1px-per-step)
 * window resizes accumulated stale widths until the internal row total
 * overflowed the container and the last card wrapped - persistently, because
 * the stale width never got re-accepted. A fresh load at the same width looked
 * fine, which made the bug appear random.
 *
 * This test walks the viewport in 1px steps (the trigger) across the 3-column
 * range in both directions, plus coarse jumps through the 2-column range, and
 * asserts the rendered column count always matches the computed layout.
 */

import { expect, test } from "./fixtures";

import { createServiceClient, dismissPostSignInModals } from "./helpers";

// Titles must be unique on the page (must NOT clash with sidebar nav labels).
const WIDGETS = ["self-care", "cbt-open-record", "cbt-distortion-guide"];
const CARD_TITLES = ["Self-care log", "Thought record", "Thinking patterns"];

const GAP = 12;
const PADDING = 24;
const MIN_WIDGET_WIDTH = 280;
const MAX_COLUMNS = 3;

function expectedColumns(gridWidth: number) {
  if (gridWidth <= 0) return 1;
  return Math.max(
    1,
    Math.min(MAX_COLUMNS, Math.floor((gridWidth + GAP) / (MIN_WIDGET_WIDTH + GAP))),
  );
}

test.describe("home dashboard grid columns", () => {
  test.beforeEach(async ({ user }) => {
    const admin = createServiceClient();
    await admin.from("widget_preferences").delete().eq("user_id", user.id);
    const { error } = await admin.from("widget_preferences").upsert(
      WIDGETS.map((widgetId, index) => ({
        user_id: user.id,
        widget_id: widgetId,
        position: index,
      })),
      { onConflict: "user_id,widget_id" },
    );
    if (error) throw new Error(`Seeding widgets failed: ${error.message}`);
  });

  test.afterEach(async ({ user }) => {
    const admin = createServiceClient();
    await admin.from("widget_preferences").delete().eq("user_id", user.id);
  });

  test("renders the computed column count at every viewport width, including 1px-step resizes", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/(app)");
    await dismissPostSignInModals(page);
    await expect(page.getByText("Self-care log")).toBeVisible({ timeout: 20_000 });

    // 1px steps are the regression trigger (stale-measurement deadband);
    // coarse jumps cover the 2-column and boundary widths.
    const widths: number[] = [];
    for (let w = 1000; w <= 1900; w += 50) widths.push(w);
    for (let w = 1900; w >= 1820; w -= 1) widths.push(w);
    for (let w = 1820; w <= 1880; w += 1) widths.push(w);

    const failures: string[] = [];

    // The bug this test guards against is a PERSISTENT mis-wrap (a stale
    // measurement that never gets re-accepted), so each width polls until the
    // rendered count settles on the expected one. A single fixed-delay probe
    // flakes under CI load: the grid re-wraps asynchronously and the rendered
    // count briefly lags the resize by one step.
    const SETTLE_MS = 3_000;
    const POLL_INTERVAL_MS = 100;

    const probeOnce = async () =>
      page.evaluate((titles: string[]) => {
        const home = document.querySelector('[data-testid="home-layout"]') as HTMLElement | null;
        if (!home) return { error: "no home-layout" };
        const byText = (needle: string): HTMLElement | null => {
          const walker = document.createTreeWalker(home, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.textContent?.trim() === needle) return node.parentElement;
          }
          return null;
        };
        const anchors = titles.map(byText);
        if (anchors.some((a) => !a)) return { error: "missing card title" };
        let container = anchors[0]!;
        const containsAll = (el: HTMLElement) => anchors.every((a) => a && el.contains(a));
        while (container.parentElement && !containsAll(container)) {
          container = container.parentElement;
        }
        const cells = Array.from(container.children).filter((child) =>
          anchors.some((a) => a && child.contains(a)),
        ) as HTMLElement[];
        return {
          homeWidth: home.getBoundingClientRect().width,
          rowYs: cells.map((c) => Math.round(c.getBoundingClientRect().y)),
        };
      }, CARD_TITLES);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });

      const deadline = Date.now() + SETTLE_MS;
      let lastMismatch: string | null = null;
      do {
        await page.waitForTimeout(POLL_INTERVAL_MS);
        const probe = await probeOnce();

        if ("error" in probe) {
          lastMismatch = `w=${width}: ${probe.error}`;
          continue;
        }

        const gridWidth = probe.homeWidth - PADDING * 2;
        const expCols = Math.min(expectedColumns(gridWidth), probe.rowYs.length);
        const firstRowY = Math.min(...probe.rowYs);
        const obsCols = probe.rowYs.filter((y) => y === firstRowY).length;
        if (obsCols === expCols) {
          lastMismatch = null;
          break;
        }
        lastMismatch = `w=${width}: expected ${expCols} columns, rendered ${obsCols}`;
      } while (Date.now() < deadline);

      if (lastMismatch !== null) {
        failures.push(lastMismatch);
      }
    }

    expect(failures, `Column-count mismatches:\n${failures.join("\n")}`).toEqual([]);
  });
});

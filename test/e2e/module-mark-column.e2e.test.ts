import { expect, test } from "./fixtures";

import { dismissPostSignInModals } from "./helpers";

/**
 * The mark column on the one card (#2059).
 *
 * ☠️ **THIS HAS TO BE AN E2E, AND THE UNIT SUITE CANNOT REPLACE IT.** The defect was a
 * WRAP: every module card rendered its abbreviation on two lines — `CB/T`, `AC/T`,
 * `DB/T` — because the mark column was sized `w-6` (24px), the width of a glyph rather
 * than of three bold, tracked characters. Nothing in the repo could fail on it:
 *
 * - **The accessibility tree cannot see a wrap.** The text content is `CBT` on one line
 *   or two, so the modules hub's own `getByText("CBT")` passed throughout (that screen
 *   has since gone with #2114), and so did every card-list assertion in
 *   `today-screen.test.tsx`.
 * - **NativeWind resolves no width into `props.style` under jest** — measured while
 *   fixing this: a module mark's flattened style is `{"fontFamily":"NotoSans_700Bold"}`
 *   and a tool mark's is `undefined`. A `props.style` width assertion, which is how this
 *   repo catches a wrong font face, would have been **vacuously green here.**
 *
 * So the only honest guard is a measurement in a real engine, which is this file. It
 * asserts the two things the fix is made of, and it fails on the old code: the mark
 * occupies ONE line, and both branches occupy the SAME column.
 *
 * ⚠️ The second assertion is the load-bearing one long-term. Widening only the module
 * branch would un-wrap the text and silently misalign every row — the marks alternate
 * down one list, so the name and stat line would jog left and right between neighbours.
 * A test that only checked the wrap would call that fix correct.
 *
 * The viewport is pinned to the size the defect was reported at (390×844). `shrink-0`
 * pinned the width, so the wrap happened at every viewport rather than only narrow ones
 * — the pin documents the report, it is not what makes the test work.
 *
 * The subject moved to Home on #2114, which deleted `/modules` and `/tools`. It is a
 * better subject than the two it replaces: both kinds render on ONE page through the
 * same `ItemCardRow`, so the column relation is measured across a single layout pass
 * instead of across two navigations.
 *
 * ☠️ Both marks are SECTION-SCOPED. Home renders a favourited item twice — once under
 * Favourites, again in its catalogue position — under the same `testID`, so an unscoped
 * `card-mark-module-cbt` is a strict-mode violation for any pool user who happens to
 * carry a leftover star. This spec stars nothing, which is exactly why it must not
 * depend on nothing being starred.
 */
test.describe("the one card's mark column (#2059)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a module abbreviation renders on one line, in the same column as a tool's glyph", async ({
    page,
  }) => {
    await page.goto("/");
    const modules = page.getByTestId("home-modules");
    await expect(modules).toBeVisible({ timeout: 15_000 });
    await dismissPostSignInModals(page);

    const abbreviation = modules.getByTestId("card-mark-module-cbt");
    await expect(abbreviation).toBeVisible({ timeout: 15_000 });

    const mark = await abbreviation.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        lines: box.height / parseFloat(window.getComputedStyle(element).lineHeight),
        width: box.width,
      };
    });

    // Stated as a ratio rather than "height is 20px" so a legitimate type-scale change
    // does not fail it. Before the fix this read 2 (40px tall over a 20px line-height).
    expect(mark.lines).toBeLessThan(1.5);

    // No second navigation: the tool row is further down the SAME page, so the two
    // measurements share one layout rather than being compared across two loads.
    const glyph = page.getByTestId("home-tools").getByTestId("card-mark-tool-grounding");
    await expect(glyph).toBeVisible({ timeout: 15_000 });
    const glyphWidth = await glyph.evaluate((element) => element.getBoundingClientRect().width);

    // The relation, not either number: whatever the column is, both kinds take it.
    expect(mark.width).toBeCloseTo(glyphWidth, 1);
  });
});

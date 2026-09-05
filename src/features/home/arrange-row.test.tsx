import { screen } from "@testing-library/react-native";

import { ArrangeRow } from "@/src/features/home/arrange-row";
import { WIDGET_META } from "@/src/features/widgets/widget-meta";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The REAL registry and the REAL bundles, deliberately unmocked - which is the whole reason
 * this row has its own module and its own suite.
 *
 * `arrange-screen.test.tsx` stubs `widget-registry` with the id as its own title key, so no
 * shipped string ever reaches a row there. A truncation assertion written in that suite
 * would be measuring a fixture the test itself wrote, and would stay green however the
 * shipped Bulgarian copy changed (#1592).
 *
 * ⚠️ No width is mocked anywhere below, and that is not an omission copied from a sibling
 * that does. `tool-row.test.tsx` sets one per test because `ToolRow` READS
 * `useWindowDimensions` and branches on it; this row reads no width at all - its box is the
 * screen's, and its line count is the same number at every width. A width-parameterised
 * test here would establish nothing and assert nothing, which is the vacuous green this
 * repo has been bitten by before.
 */
/**
 * Pinned explicitly, not inherited: the Bulgarian block below switches the language for the
 * whole i18n instance, so the English assertions must not depend on declaration order.
 */
beforeAll(async () => {
  await setLanguage("en");
});

describe("ArrangeRow", () => {
  it("renders the widget's shipped name and its registry glyph", () => {
    const { root } = renderWithProviders(<ArrangeRow id="gratitude-latest" />);

    expect(screen.getByText("Gratitude log")).toBeTruthy();
    // The glyph the registry names, carrying the neutral chrome mark rather than a hue.
    const glyph = root.findByProps({ name: WIDGET_META["gratitude-latest"].icon });
    expect(glyph.props.className).toContain("text-muted-foreground");
  });

  it("falls back to the raw id for a widget the registry does not know", () => {
    renderWithProviders(<ArrangeRow id="not-a-widget" />);

    expect(screen.getByText("not-a-widget")).toBeTruthy();
  });
});

/**
 * The two Bulgarian names that overrun this row's 192px box at the 360dp floor - and unlike
 * #1590 they overrun it at fontScale 1.0, with no font-scaling argument needed.
 *
 * `arrange-row.tsx` states the measurement once, in full: the box arithmetic, the widths,
 * and why two lines are enough. It is deliberately NOT restated here - a re-measure should
 * have one place to land, not two that can drift apart (#1592).
 */
describe("ArrangeRow - the longest Bulgarian name (#1592)", () => {
  const LONGEST_BG_NAME = "Дневник на благодарността";

  beforeAll(async () => {
    // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy, and without them
    // these assertions would run against English and go vacuous.
    await setLanguage("bg");
  });

  afterAll(async () => {
    await setLanguage("en");
  });

  it("renders the whole string rather than a prefix, on a second line", () => {
    renderWithProviders(<ArrangeRow id="gratitude-latest" />);

    // The whole string, not a prefix: an ellipsized name is the bug.
    expect(screen.getByText(LONGEST_BG_NAME).props.numberOfLines).toBe(2);
  });

  it("gives the second-widest overrunning name the same second line", () => {
    renderWithProviders(<ArrangeRow id="cbt-activities" />);

    // 202.2px against the same 192px box - the only other bg name that overruns it.
    expect(screen.getByText("Поведенческо активиране").props.numberOfLines).toBe(2);
  });
});

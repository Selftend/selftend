import { screen } from "@testing-library/react-native";
import { useTranslation } from "react-i18next";

import { ArrangeRow } from "@/src/features/home/arrange-row";
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
 */
function Row({ id }: { id: string }) {
  const { t } = useTranslation("navigation");
  return <ArrangeRow id={id} t={t} />;
}

/**
 * Pinned explicitly, not inherited: the Bulgarian block below switches the language for the
 * whole i18n instance, so the English assertions must not depend on declaration order.
 */
beforeAll(async () => {
  await setLanguage("en");
});

describe("ArrangeRow", () => {
  it("renders the widget's shipped name and its glyph", () => {
    renderWithProviders(<Row id="gratitude-latest" />);

    expect(screen.getByText("Gratitude log")).toBeTruthy();
  });

  it("falls back to the raw id for a widget the registry does not know", () => {
    renderWithProviders(<Row id="not-a-widget" />);

    expect(screen.getByText("not-a-widget")).toBeTruthy();
  });
});

/**
 * Measured, not estimated: at 15px `NotoSans_600SemiBold` the longest Bulgarian tool name,
 * "Дневник на благодарността", is **213.1px**. Its box here is the screen less 168px of
 * chrome - 48 (`AnimatedScrollView` PADDING 24x2), 36 (`DragHandle`, size-9), 8+8 (`gap-2`
 * x2), 36 (`RemoveButton`, size-9), 20+12 for the leading mark and its `gap-3` - so **192px**
 * at the 360dp floor #1231 set, and 152px at 320.
 *
 * ☠️ So unlike #1590 this one truncates AT the supported floor, at fontScale 1.0, with no
 * font-scaling argument needed. Two of the 25 bg names overrun 192px; the widest English
 * name is 154.9px and clears it, so this is bg-only as both predecessors were.
 *
 * Wrapped it takes two lines whose widest is its longest word at 120.2px, and the widest
 * unbreakable word across all bg tool names is "Наблюдаващото" at 126.2px, so two lines are
 * enough even in the 152px box at 320 and nothing breaks mid-word (#1592).
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
    renderWithProviders(<Row id="gratitude-latest" />);

    // The whole string, not a prefix: an ellipsized name is the bug.
    expect(screen.getByText(LONGEST_BG_NAME).props.numberOfLines).toBe(2);
  });

  it("gives the second-widest overrunning name the same second line", () => {
    renderWithProviders(<Row id="cbt-activities" />);

    // 202.2px against the same 192px box - the only other bg name that overruns it.
    expect(screen.getByText("Поведенческо активиране").props.numberOfLines).toBe(2);
  });

  it("keeps the second line at desktop width too, where it simply never fills", () => {
    // There is no breakpoint to key off and none is wanted: the name owns its whole box at
    // every width, so `numberOfLines` is a ceiling the wide layout just never reaches. The
    // sibling rows' `wide ? 1 : 2` exists because their wide branch seats the name beside a
    // stat or a time; nothing sits beside this one.
    renderWithProviders(<Row id="gratitude-latest" />);

    expect(screen.getByText(LONGEST_BG_NAME).props.numberOfLines).toBe(2);
  });
});

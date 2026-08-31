import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { useWindowDimensions } from "react-native";

import { ToolRow } from "@/src/features/home/tool-row";
import { WIDGET_META } from "@/src/features/home/widget-registry";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/",
}));

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockDimensions = useWindowDimensions as unknown as jest.Mock;
/** The row reads its own breakpoint, so width is set per test rather than passed in. */
const atWidth = (width: number) => mockDimensions.mockReturnValue({ width, height: 800 });

const mockRouter = jest.mocked(router);

/**
 * Pinned explicitly, not inherited: the Bulgarian block below switches the language for the
 * whole i18n instance, so the English assertions must not depend on it being declared last
 * and restoring itself.
 */
beforeAll(async () => {
  await setLanguage("en");
});

describe("ToolRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    atWidth(390);
  });

  it("renders the tool's name and its stat", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="7-day average 7.2h" />);

    expect(screen.getByText("Sleep")).toBeTruthy();
    expect(screen.getByText("7-day average 7.2h")).toBeTruthy();
  });

  it("names itself to a screen reader as the tool plus its stat", () => {
    // One press acts on the whole row, so the row is one accessible thing.
    renderWithProviders(<ToolRow id="sleep-latest" stat="7-day average 7.2h" />);

    expect(screen.getByLabelText("Sleep, 7-day average 7.2h")).toBeTruthy();
  });

  it("falls back to the bare name when there is no stat", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat={null} />);

    expect(screen.getByLabelText("Sleep")).toBeTruthy();
  });

  it("renders no stat node at all when the slot is empty", () => {
    // Never a dash and never a skeleton: a loading surface must not claim emptiness,
    // and this same null covers the deliberate cbt-distortion-guide exception.
    renderWithProviders(<ToolRow id="sleep-latest" stat={null} />);

    expect(screen.queryByText("-")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("navigates to the id's registered route when pressed", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="anything" />);

    fireEvent.press(screen.getByTestId("tool-row-sleep-latest"));

    expect(mockRouter.push).toHaveBeenCalledWith(WIDGET_META["sleep-latest"].route);
  });

  it("routes the two ids whose spec'd paths do not exist to their real ones", () => {
    // The decided spec's table says `/tools/gratitude` and `/tools/routines`; neither is
    // served. The row reads the registry rather than restating a route, so it cannot
    // inherit that error - but pin the outcome, because the table is what gets re-read.
    renderWithProviders(<ToolRow id="gratitude-latest" stat={null} />);
    fireEvent.press(screen.getByTestId("tool-row-gratitude-latest"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/gratitude-log");

    renderWithProviders(<ToolRow id="routines-today" stat={null} />);
    fireEvent.press(screen.getByTestId("tool-row-routines-today"));
    expect(mockRouter.push).toHaveBeenCalledWith("/routines");
  });

  it("hides the chevron from assistive tech", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="x" />);

    // The row already announces itself; a second focus stop that says "chevron right"
    // adds a node and no information.
    const row = screen.getByTestId("tool-row-sleep-latest");
    const chevron = row.findByProps({ name: "chevron-right" });
    expect(chevron.props.accessibilityElementsHidden).toBe(true);
    expect(chevron.props.importantForAccessibility).toBe("no");
  });

  it("gives the desktop name column a minimum width, never a fixed one", () => {
    // A fixed 150px column - which is what the design draws - overruns in Bulgarian.
    atWidth(1000);
    renderWithProviders(<ToolRow id="sleep-latest" stat="x" />);

    const name = screen.getByText("Sleep");
    expect(name.props.className).toContain("min-w-[150px]");
    // Anchored on a class boundary, not `\b` - a word boundary matches inside
    // `min-w-[150px]`, so the naive pattern passes against the very string it bans.
    expect(name.props.className).not.toMatch(/(^|\s)w-\[150px\]/);
  });

  it("lets the name grow past its minimum and the stat give way", () => {
    // This is the mechanism that keeps a long Bulgarian name from overrunning, so it is
    // what gets asserted - rather than a measured width, which would be a claim about a
    // render this test never performs. The name is `shrink-0` over a MINIMUM width, so
    // it grows to fit; the stat is `min-w-0 flex-1`, so it is what yields the space.
    // Either half alone is not enough: a shrinkable name truncates, and a stat without
    // `min-w-0` refuses to shrink below its content and pushes the row wide.
    atWidth(1000);
    renderWithProviders(<ToolRow id="gratitude-latest" stat="29 entries · 3 this week" />);

    const name = screen.getByText("Gratitude log");
    expect(name.props.className).toContain("shrink-0");
    expect(name.props.className).toContain("min-w-[150px]");

    const stat = screen.getByTestId("tool-row-stat-gratitude-latest");
    expect(stat.props.className).toContain("min-w-0");
    expect(stat.props.className).toContain("flex-1");
  });

  it("carries the neutral chrome mark, never a per-tool hue", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="x" />);

    const row = screen.getByTestId("tool-row-sleep-latest");
    const glyph = row.findByProps({ name: WIDGET_META["sleep-latest"].icon });
    expect(glyph.props.className).toContain("text-muted-foreground");
  });

  it("renders nothing for an id the catalogue does not know", () => {
    renderWithProviders(<ToolRow id="not-a-widget" stat="x" />);

    expect(screen.queryByTestId("tool-row-not-a-widget")).toBeNull();
  });
});

/**
 * Measured, not estimated: at 15px `NotoSans_600SemiBold` the longest Bulgarian tool name,
 * "Дневник на благодарността", is **212.8px** wide. Its box on home is the screen less the
 * 124px of chrome around it - 48 (`AnimatedScrollView` PADDING 24x2), 8 (`px-1`), 20+14 for
 * the leading mark and its gap, 20+14 for the chevron and its gap - so 236px at the 360dp
 * floor #1231 set, and 196px at 320.
 *
 * On one line that fits at 360 with 23.2px spare, so this is NOT the floor violation #1248
 * was. What makes it real is font scaling: nothing in the repo sets `allowFontScaling` or
 * `maxFontSizeMultiplier`, so the name grows with the OS text-size setting while the 124px
 * around it does not, and 236/212.8 puts the ellipsis at **fontScale 1.11** - the first
 * accessibility step - on a supported device. English clears every width to 1.52.
 *
 * Wrapped it takes two lines whose widest is its longest word at 120.2px, and the widest
 * unbreakable word across all bg tool names is "Наблюдаващото" at 126.2px, so two lines are
 * enough even in the 196px box at 320 and nothing breaks mid-word (#1590).
 */
describe("ToolRow - the name is not locked to one line at phone width (#1590)", () => {
  // `atWidth` is sticky and the reset to 390 lives in the first describe's `beforeEach`, so
  // a block that ends wide would hand 1280 to whatever gets appended below it.
  afterAll(() => atWidth(390));

  it.each([
    [360, 2],
    [1280, 1],
  ])("at %ipx the name may run to %i line(s)", (width, lines) => {
    atWidth(width);
    renderWithProviders(<ToolRow id="sleep-latest" stat="7-day average 7.2h" />);

    expect(screen.getByText("Sleep").props.numberOfLines).toBe(lines);
  });
});

describe("ToolRow - the longest Bulgarian name (#1590)", () => {
  const LONGEST_BG_NAME = "Дневник на благодарността";

  beforeAll(async () => {
    // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy, and without them
    // these assertions would run against English and go vacuous.
    await setLanguage("bg");
  });

  afterAll(async () => {
    await setLanguage("en");
    // Same reason as the block above: this one ends in the wide branch.
    atWidth(390);
  });

  it("gets a second line at the 360dp floor, so a scaled-up name still reads whole", () => {
    atWidth(360);
    renderWithProviders(<ToolRow id="gratitude-latest" stat={null} />);

    // The whole string, not a prefix: an ellipsized name is the bug.
    expect(screen.getByText(LONGEST_BG_NAME).props.numberOfLines).toBe(2);
  });

  it("stays on one line in the wide branch, where nothing truncates", () => {
    atWidth(1280);
    renderWithProviders(<ToolRow id="gratitude-latest" stat="29 записа" />);

    const name = screen.getByText(LONGEST_BG_NAME);
    expect(name.props.numberOfLines).toBe(1);
    // `min-w-[150px]` is a MINIMUM on the desktop name column and has nothing to do with the
    // phone truncation - widening it would fix nothing here and squeeze the stat.
    expect(name.props.className).toContain("min-w-[150px]");
  });
});

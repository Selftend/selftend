import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { ToolRow } from "@/src/features/home/tool-row";
import { WIDGET_META } from "@/src/features/home/widget-registry";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockRouter = jest.mocked(router);

describe("ToolRow", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the tool's name and its stat", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="7-day average 7.2h" wide={false} />);

    expect(screen.getByText("Sleep")).toBeTruthy();
    expect(screen.getByText("7-day average 7.2h")).toBeTruthy();
  });

  it("names itself to a screen reader as the tool plus its stat", () => {
    // One press acts on the whole row, so the row is one accessible thing.
    renderWithProviders(<ToolRow id="sleep-latest" stat="7-day average 7.2h" wide={false} />);

    expect(screen.getByLabelText("Sleep, 7-day average 7.2h")).toBeTruthy();
  });

  it("falls back to the bare name when there is no stat", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat={null} wide={false} />);

    expect(screen.getByLabelText("Sleep")).toBeTruthy();
  });

  it("renders no stat node at all when the slot is empty", () => {
    // Never a dash and never a skeleton: a loading surface must not claim emptiness,
    // and this same null covers the deliberate cbt-distortion-guide exception.
    renderWithProviders(<ToolRow id="sleep-latest" stat={null} wide={false} />);

    expect(screen.queryByText("-")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("navigates to the id's registered route when pressed", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="anything" wide={false} />);

    fireEvent.press(screen.getByTestId("tool-row-sleep-latest"));

    expect(mockRouter.push).toHaveBeenCalledWith(WIDGET_META["sleep-latest"].route);
  });

  it("routes the two ids whose spec'd paths do not exist to their real ones", () => {
    // The decided spec's table says `/tools/gratitude` and `/tools/routines`; neither is
    // served. The row reads the registry rather than restating a route, so it cannot
    // inherit that error - but pin the outcome, because the table is what gets re-read.
    renderWithProviders(<ToolRow id="gratitude-latest" stat={null} wide={false} />);
    fireEvent.press(screen.getByTestId("tool-row-gratitude-latest"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/gratitude-log");

    renderWithProviders(<ToolRow id="routines-today" stat={null} wide={false} />);
    fireEvent.press(screen.getByTestId("tool-row-routines-today"));
    expect(mockRouter.push).toHaveBeenCalledWith("/routines");
  });

  it("hides the chevron from assistive tech", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="x" wide={false} />);

    // The row already announces itself; a second focus stop that says "chevron right"
    // adds a node and no information.
    const row = screen.getByTestId("tool-row-sleep-latest");
    const chevron = row.findByProps({ name: "chevron-right" });
    expect(chevron.props.accessibilityElementsHidden).toBe(true);
    expect(chevron.props.importantForAccessibility).toBe("no");
  });

  it("gives the desktop name column a minimum width, never a fixed one", () => {
    // A fixed 150px column - which is what the design draws - overruns in Bulgarian.
    renderWithProviders(<ToolRow id="sleep-latest" stat="x" wide />);

    const name = screen.getByText("Sleep");
    expect(name.props.className).toContain("min-w-[150px]");
    // Anchored on a class boundary, not `\b` - a word boundary matches inside
    // `min-w-[150px]`, so the naive pattern passes against the very string it bans.
    expect(name.props.className).not.toMatch(/(^|\s)w-\[150px\]/);
  });

  it("carries the neutral chrome mark, never a per-tool hue", () => {
    renderWithProviders(<ToolRow id="sleep-latest" stat="x" wide={false} />);

    const row = screen.getByTestId("tool-row-sleep-latest");
    const glyph = row.findByProps({ name: WIDGET_META["sleep-latest"].icon });
    expect(glyph.props.className).toContain("text-muted-foreground");
  });

  it("renders nothing for an id the catalogue does not know", () => {
    renderWithProviders(<ToolRow id="not-a-widget" stat="x" wide={false} />);

    expect(screen.queryByTestId("tool-row-not-a-widget")).toBeNull();
  });
});

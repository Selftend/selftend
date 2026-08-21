import { fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { ModuleHomeHeader } from "./module-home-header";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/cbt";

jest.mock("expo-router", () => {
  const React = require("react") as typeof import("react");

  return {
    router: {
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      push: jest.fn(),
      replace: jest.fn(),
    },
    usePathname: () => mockPathname,
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, [callback]);
    },
  };
});

function renderHeader({ includeProgram = false }: { includeProgram?: boolean } = {}) {
  const onPressTune = jest.fn();
  const onPressInfo = jest.fn();
  const onPressProgram = jest.fn();

  renderWithProviders(
    <ModuleHomeHeader
      title="CBT"
      tourScope="cbt"
      actions={[
        { type: "tune", onPress: onPressTune },
        { type: "notifications", targetKey: "cbt" },
        ...(includeProgram ? [{ type: "program" as const, onPress: onPressProgram }] : []),
        { type: "info", onPress: onPressInfo },
      ]}
    />,
  );

  return { onPressTune, onPressInfo, onPressProgram };
}

describe("ModuleHomeHeader action buttons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders every provided action button", () => {
    renderHeader({ includeProgram: true });

    expect(screen.getByLabelText("Customise")).toBeTruthy();
    expect(screen.getByLabelText("Reminders")).toBeTruthy();
    expect(screen.getByLabelText("CBT program")).toBeTruthy();
    expect(screen.getByLabelText("About this module")).toBeTruthy();
  });

  it("navigates the bell to the Reminders screen with this module's target (#1071)", () => {
    // The bell is a door, not a surface of its own (#967): no modal mounts here any
    // more, the press hands the module's key to the central Reminders screen.
    renderHeader();

    fireEvent.press(screen.getByLabelText("Reminders"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/notifications",
      params: { target: "cbt" },
    });
  });

  it("fires onPress for a plain action button (tune)", () => {
    const { onPressTune } = renderHeader();

    fireEvent.press(screen.getByLabelText("Customise"));

    expect(onPressTune).toHaveBeenCalledTimes(1);
  });

  it("fires onPress for the info action button", () => {
    const { onPressInfo } = renderHeader();

    fireEvent.press(screen.getByLabelText("About this module"));

    expect(onPressInfo).toHaveBeenCalledTimes(1);
  });

  it("fires onPress for the program action button", () => {
    const { onPressProgram } = renderHeader({ includeProgram: true });

    fireEvent.press(screen.getByLabelText("CBT program"));

    expect(onPressProgram).toHaveBeenCalledTimes(1);
  });

  it("renders no first-run coach-mark overlay for any action", () => {
    renderHeader({ includeProgram: true });

    expect(screen.queryByText("Got it")).toBeNull();
    expect(screen.queryByText("Skip all tips")).toBeNull();
  });

  it("renders no tour even when actions were never dismissed", () => {
    // No shownButtonTours mechanism remains - the module header never shows tips,
    // regardless of any "dismissed" state (there's no dismissal to track).
    renderHeader();

    expect(screen.queryByText(/Tap here/i)).toBeNull();
  });
});

describe("ModuleHomeHeader shell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/modules/cbt";
  });

  // G1 (#1250): exactly one Escape, rendered unconditionally.
  it("renders exactly one Escape", () => {
    renderWithProviders(<ModuleHomeHeader title="CBT" />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
  });

  it("still renders the Escape on a one-crumb screen, where the trail hides", () => {
    // A module home reached directly - and the eight one-crumb routes generally.
    mockPathname = "/notifications";
    renderWithProviders(<ModuleHomeHeader title="Reminders" />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    // The trail is still hidden at one crumb - only the Escape was decoupled.
    // A rendered lone crumb would put "Reminders" on screen twice, above a title
    // that already says it.
    expect(screen.getAllByText("Reminders")).toHaveLength(1);
  });

  it("renders breadcrumb, h1 and tagline", () => {
    renderWithProviders(
      <ModuleHomeHeader title="Check-in" description="Log how you're feeling." tourScope="mood" />,
    );

    // The breadcrumb eyebrow, which the field header used to render in white ink.
    expect(screen.getByLabelText("Back to Modules")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
    expect(screen.getByText("Log how you're feeling.")).toBeTruthy();
  });

  it("renders no module chip - the title occurs exactly once", () => {
    // The design's header composition is breadcrumb -> h1 -> tagline -> stats,
    // with no chip. The chip used to repeat the module's name directly above it.
    renderWithProviders(<ModuleHomeHeader title="Check-in" description="..." />);

    expect(screen.getAllByText("Check-in")).toHaveLength(1);
  });

  it("renders no hue field gradient", () => {
    renderWithProviders(<ModuleHomeHeader title="Check-in" description="..." />);

    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
  });

  it("renders without a tourScope prop (now unused, kept only for call-site compatibility)", () => {
    renderWithProviders(<ModuleHomeHeader title="Check-in" description="..." />);

    expect(screen.getByRole("heading", { name: "Check-in" })).toBeTruthy();
  });
});

describe("ModuleHomeHeader stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderStats(stats: { value: string; label: string }[]) {
    renderWithProviders(<ModuleHomeHeader title="Check-in" stats={stats} />);
  }

  it("renders each value with its label", () => {
    renderStats([
      { value: "3", label: "check-ins" },
      { value: "3.0", label: "7-day average" },
    ]);

    // The value is its own nested Text (it carries the foreground ink), so the
    // item reads as one composed string with the muted label after it.
    expect(screen.getByText("3 check-ins")).toBeTruthy();
    expect(screen.getByText("3.0 7-day average")).toBeTruthy();
  });

  it("colours the values with the foreground ink, not an accent", () => {
    // The whole reason accentClassName could be deleted: the design puts stat
    // values on --foreground, so the text-<hue>-on-background pattern that fails
    // AA on four of the seven hues (#403) leaves this component entirely.
    renderStats([{ value: "3", label: "check-ins" }]);

    const value = String(screen.getByText("3").props.className);

    expect(value).toContain("text-foreground");
    expect(value).not.toContain("-ink");
  });

  it("renders a label-only entry when value is empty", () => {
    // This is what the deleted ToolStats.subline becomes: "last logged 4:50 pm"
    // folds into the stats row as a value-less item rather than a separate line.
    renderStats([
      { value: "3", label: "check-ins" },
      { value: "", label: "last logged 4:50 pm" },
    ]);

    expect(screen.getByText("last logged 4:50 pm")).toBeTruthy();
  });

  it("renders one separator fewer than there are stats", () => {
    renderStats([
      { value: "1", label: "a" },
      { value: "2", label: "b" },
      { value: "3", label: "c" },
    ]);

    // Scoped to the stats row: the breadcrumb trail above it also uses "·".
    expect(within(screen.getByTestId("module-header-stats")).getAllByText("·")).toHaveLength(2);
  });

  it("groups each separator with the stat BEFORE it, so a wrapped line never starts with one", () => {
    // The wrap unit is (item + trailing separator). Grouping the separator with
    // the FOLLOWING item instead would strand a "·" at the start of line two.
    renderStats([
      { value: "1", label: "a" },
      { value: "2", label: "b" },
    ]);

    const [first, last] = within(screen.getByTestId("module-header-stats")).getAllByTestId(
      "module-header-stat",
    );

    expect(within(first).getByText("1")).toBeTruthy();
    expect(within(first).getByText("·")).toBeTruthy();
    expect(within(last).getByText("2")).toBeTruthy();
    expect(within(last).queryByText("·")).toBeNull();
  });

  it("renders nothing for an empty stats array", () => {
    // ACT and CBT pass no stats at all, and a brand-new user should not be met
    // with a row of noughts.
    renderStats([]);

    expect(screen.queryByTestId("module-header-stats")).toBeNull();
  });
});

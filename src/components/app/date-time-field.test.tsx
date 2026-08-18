import { fireEvent, screen } from "@testing-library/react-native";

import { DateTimeField } from "./date-time-field";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

// Marker Modal: the stock jest Modal cannot distinguish "not rendered" (the
// web unmount gate, #1054) from "mounted but closed" (native). See the
// helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

// The calendar itself is third-party (react-native-ui-datepicker); mock it to
// a marker so opening the picker is observable without walking month grids.
jest.mock("react-native-ui-datepicker", () => {
  const { createElement: h } = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: () => h(Text, null, "mock picker"),
    useDefaultStyles: () => ({}),
  };
});

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

const props = {
  value: "2026-08-01T10:30:00.000Z",
  onChange: jest.fn(),
  accessibilityLabel: "Entry time",
};

afterEach(() => {
  setPlatformOS("ios");
  jest.clearAllMocks();
});

describe("DateTimeField", () => {
  /**
   * The #1054 web unmount gate, in its inline form: the Modal here is a
   * sibling of the always-rendered trigger, so the gate is a ternary around
   * the Modal element rather than an early return. Behaviorally identical —
   * a dismissed react-native-web Modal lingers for its 250ms fade-out as a
   * non-inert focus trap, so on web a closed picker must leave NO Modal in
   * the tree at all, while the trigger stays.
   */
  it("leaves no Modal mounted while closed on web (#1054)", () => {
    setPlatformOS("web");
    renderWithProviders(<DateTimeField {...props} />);

    expect(screen.getByLabelText("Entry time")).toBeTruthy();
    expect(screen.queryByTestId("modal-root")).toBeNull();
  });

  it("keeps the closed Modal mounted on native, preserving the exit animation", () => {
    renderWithProviders(<DateTimeField {...props} />);

    expect(screen.queryByTestId("modal-root")).not.toBeNull();
    // Mounted is not showing: the calendar only renders once opened.
    expect(screen.queryByText("mock picker")).toBeNull();
  });

  it("opens the picker from the trigger on web", () => {
    setPlatformOS("web");
    renderWithProviders(<DateTimeField {...props} />);

    fireEvent.press(screen.getByLabelText("Entry time"));

    expect(screen.queryByTestId("modal-root")).not.toBeNull();
    expect(screen.getByText("mock picker")).toBeTruthy();
  });
});

import { fireEvent, screen } from "@testing-library/react-native";

import { DateTimeField } from "./date-time-field";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

// Marker Modal: the stock jest Modal cannot distinguish "not rendered" (the
// web unmount gate, #1054) from "mounted but closed" (native). See the
// helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

/** What the probe below reports the user picked. Reset per test. */
let mockNextPick = "2026-03-03T08:15:00.000Z";

// The calendar itself is third-party (react-native-ui-datepicker); mock it to a
// probe that both surfaces the props it was handed and lets a test drive a
// selection, so commit semantics are observable without walking month grids.
jest.mock("react-native-ui-datepicker", () => {
  const { createElement: h } = require("react");
  const { Pressable, Text } = require("react-native");
  const MockPicker = (props: Record<string, unknown>) => {
    return h(
      Pressable,
      {
        testID: "mock-picker-select",
        // ⚠️ `mockP`, not `p`: jest's module-factory guard reads even an erased
        // TS parameter name as an out-of-scope reference unless it is prefixed.
        onPress: () =>
          (props.onChange as (mockP: { date: string }) => void)({ date: mockNextPick }),
      },
      h(Text, null, "mock picker"),
    );
  };
  return { __esModule: true, default: MockPicker, useDefaultStyles: () => ({}) };
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

beforeEach(() => {
  mockNextPick = "2026-03-03T08:15:00.000Z";
});

afterEach(() => {
  setPlatformOS("ios");
  jest.clearAllMocks();
});

/** Render the field and open its picker, the starting point of every commit test. */
function openPicker(overrides: Partial<React.ComponentProps<typeof DateTimeField>> = {}) {
  renderWithProviders(<DateTimeField {...props} {...overrides} />);
  fireEvent.press(screen.getByLabelText("Entry time"));
}

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

  /**
   * ⚠️ THIS BLOCK PINS SHIPPED BEHAVIOUR IN ORDER TO CHANGE IT, and every
   * assertion in it is inverted by the very next commit (#1298). It is here
   * so that inversion reads as the deliberate, specified behaviour change it
   * is rather than as assertions quietly rewritten to match new code.
   *
   * As shipped, the field commits every change the moment the user touches
   * the calendar, and Done only closes the sheet. So there is no way to back
   * out: tapping the backdrop keeps whatever was last touched, and someone
   * who opens the calendar merely to LOOK at a date leaves having edited
   * their entry. Nothing in this file covered that before — the three tests
   * above are the two platform gates and "opens the picker" — so inverting
   * commit semantics across all six call sites would have shipped with the
   * suite fully green.
   */
  describe("commit semantics as shipped today, pinned before inverting them", () => {
    it("commits a selection live, before Done is ever pressed", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));

      expect(props.onChange).toHaveBeenCalledWith("2026-03-03T08:15:00.000Z");
    });

    it("uses Done only to close the sheet: it commits nothing of its own", () => {
      openPicker();

      fireEvent.press(screen.getByText("Done"));

      expect(props.onChange).not.toHaveBeenCalled();
    });

    it("keeps a selection the user backs out of, a live commit being unundoable", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByLabelText("Close"));

      // The hole this ticket closes: dismissing the sheet leaves the entry
      // edited anyway.
      expect(props.onChange).toHaveBeenCalledWith("2026-03-03T08:15:00.000Z");
    });
  });
});

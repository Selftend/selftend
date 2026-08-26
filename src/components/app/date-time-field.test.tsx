import { act, fireEvent, screen } from "@testing-library/react-native";
import { Modal } from "react-native";
import dayjs from "dayjs";

import { DateTimeField } from "./date-time-field";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

// Marker Modal: the stock jest Modal cannot distinguish "not rendered" (the
// web unmount gate, #1054) from "mounted but closed" (native). See the
// helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

/** What the probe below reports the user picked. Reset per test. */
let mockNextPick = "2026-03-03T08:15:00.000Z";
/** The props the calendar was handed on its last render. */
let mockPickerProps: Record<string, unknown> = {};

// The calendar itself is third-party (react-native-ui-datepicker); mock it to a
// probe that both surfaces the props it was handed and lets a test drive a
// selection, so commit semantics are observable without walking month grids.
// The rendered-output assertions (Bulgarian, Monday) deliberately live in the
// sibling .rendered file against the real library — a prop can read correctly
// here and still not reach the grid.
jest.mock("react-native-ui-datepicker", () => {
  const { createElement: h } = require("react");
  const { Pressable, Text } = require("react-native");
  const MockPicker = (props: Record<string, unknown>) => {
    mockPickerProps = props;
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
  mockPickerProps = {};
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

/** The single ISO string the field committed. */
function committedIso() {
  expect(props.onChange).toHaveBeenCalledTimes(1);
  return props.onChange.mock.calls[0][0] as string;
}

describe("DateTimeField", () => {
  /**
   * The #1054 web unmount gate. The gate itself now lives in
   * `PressShieldModal`, which `PickerSheet` renders through — this field
   * carries no copy of it. The behaviour it guards is unchanged: a dismissed
   * react-native-web Modal lingers for its 250ms fade-out as a non-inert focus
   * trap, so on web a closed picker must leave NO Modal in the tree at all,
   * while the trigger stays.
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
   * ⚠️ THE INVERSION (#1298). Every assertion below is the deliberate opposite
   * of what the previous commit pinned, and that commit exists so this reads
   * as the specified behaviour change it is rather than as assertions quietly
   * rewritten to match new code.
   *
   * Before: the field committed live on every touch and Done merely closed, so
   * a user who opened the calendar to look at a date left having edited their
   * entry, with no way to back out. After: a selection is a draft, Done is the
   * only commit, and dismissing discards.
   *
   * The discard path is where a green test is easiest to fake — "onChange was
   * not called" also passes if the picker never rendered, or if the tap missed
   * — so each discard test first proves the draft was actually made.
   */
  describe("commit semantics: draft until Done", () => {
    it("commits nothing while the user is still picking", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));

      expect(props.onChange).not.toHaveBeenCalled();
    });

    it("commits the drafted instant exactly once on Done", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByText("Done"));

      expect(props.onChange).toHaveBeenCalledTimes(1);
      expect(props.onChange).toHaveBeenCalledWith("2026-03-03T08:15:00.000Z");
    });

    it("leaves the entry untouched when the backdrop is tapped", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      // The draft really was made: the sheet re-rendered the calendar with the
      // picked date. Without this the assertion below would pass against a
      // picker that never received the tap at all.
      expect(dayjs(mockPickerProps.date as string).toISOString()).toBe("2026-03-03T08:15:00.000Z");

      fireEvent.press(screen.getByLabelText("Close"));

      // Both halves, because either alone is satisfied by a dismissal that
      // does nothing at all: the sheet really closed, and closing committed
      // nothing.
      expect(screen.queryByText("mock picker")).toBeNull();
      expect(props.onChange).not.toHaveBeenCalled();
    });

    it("leaves the entry untouched when the sheet is dismissed without Done", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      expect(dayjs(mockPickerProps.date as string).toISOString()).toBe("2026-03-03T08:15:00.000Z");

      // The one dismissal handler both platforms reach: react-native-web routes
      // the Esc key here, native the hardware back button. (Jest runs as `ios`,
      // so this exercises it by the native route.) Wrapped in act because,
      // unlike the sheet's own tests, onClose here really does close the field.
      act(() => {
        screen.UNSAFE_getByType(Modal).props.onRequestClose();
      });

      expect(screen.queryByText("mock picker")).toBeNull();
      expect(props.onChange).not.toHaveBeenCalled();
    });

    /**
     * The draft is seeded from the current value, so "Done on an untouched
     * calendar" is the one path where the commit point could fire with nothing
     * to commit. It must not: four of the six call sites read any commit as the
     * user restating WHEN, and stamp this device's offset onto an entry that
     * never captured one — which is exactly what #250 forbids. Before this
     * ticket the old Done could not do this, because it committed nothing.
     */
    it("commits nothing when Done follows a look, with no selection made", () => {
      openPicker();

      fireEvent.press(screen.getByText("Done"));

      expect(props.onChange).not.toHaveBeenCalled();
    });

    it("still commits a real edit that lands back on the same instant's day", () => {
      // Guards the guard: it compares INSTANTS, so a genuine move must still
      // get through rather than being swallowed as "unchanged".
      mockNextPick = "2026-08-01T10:31:00.000Z";
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByText("Done"));

      expect(committedIso()).toBe("2026-08-01T10:31:00.000Z");
    });

    it("reopens on the saved value, so a discarded draft cannot come back", () => {
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByLabelText("Close"));
      fireEvent.press(screen.getByLabelText("Entry time"));

      expect(dayjs(mockPickerProps.date as string).toISOString()).toBe(props.value);
    });
  });

  describe("the clamp to now", () => {
    it("hands the calendar a maximum of now, so future days cannot be selected", () => {
      openPicker();

      // Within a minute of now rather than a fixed day key: this asserts the
      // invariant ("the maximum is now") without anchoring the test to the
      // calendar it happens to run on.
      expect(
        Math.abs(dayjs(mockPickerProps.maxDate as string).valueOf() - Date.now()),
      ).toBeLessThan(60_000);
    });

    it("clamps a draft that walks past now, which the time view still allows", () => {
      mockNextPick = "2099-01-01T00:00:00.000Z";
      openPicker();

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByText("Done"));

      expect(Math.abs(new Date(committedIso()).getTime() - Date.now())).toBeLessThan(60_000);
    });
  });

  /**
   * #250: an entry carries the UTC offset it was logged at, and editing it
   * happens in THAT frame — reading a Tokyo entry from Kolkata (the suite's
   * timezone) shows the 19:30 it was logged at, and a correction moves the
   * instant without dragging the entry into another civil day.
   *
   * The shifting stays inside this field; `PickerSheet` and `ThemedCalendar`
   * speak the device frame only.
   */
  describe("the captured offset frame", () => {
    const tokyo = { offsetMinutes: 540 };

    it("shows the calendar the instant as read in its captured frame", () => {
      openPicker(tokyo);

      // 10:30Z is 19:30 in Tokyo; the picker is handed a device-frame instant
      // that READS 19:30, because that is all the library understands.
      expect(dayjs(mockPickerProps.date as string).format("YYYY-MM-DD HH:mm")).toBe(
        "2026-08-01 19:30",
      );
    });

    it("commits a correction back out of that frame, keeping the entry's civil day", () => {
      // The user nudges the Tokyo wall clock from 19:30 to 20:00.
      mockNextPick = "2026-08-01T20:00:00";
      openPicker(tokyo);

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByText("Done"));

      // 20:00 in Tokyo is 11:00Z — an hour later than the original 10:30Z, and
      // still 1 August in Tokyo.
      expect(committedIso()).toBe("2026-08-01T11:00:00.000Z");
    });
  });

  it("keeps the library's own date/time toggle and wheel on native, with no typed row beside it", () => {
    openPicker();

    // `datetime` mode, unchanged (#1302 only touches web).
    expect(mockPickerProps.timePicker).toBe(true);
    expect(screen.queryByLabelText("Entry time, hour")).toBeNull();
  });

  /**
   * #1302: on web the check-in picker pairs the calendar with its own typed
   * `HH:MM` row instead of the library's `datetime` mode — that mode's web time
   * view is a bare drag surface with no keyboard path (#1191), and toggling to
   * it is also where the card used to halve in height (300px -> 150px).
   * Removing the toggle removes both: there is exactly one view.
   */
  describe("web: calendar and time in one view (#1302)", () => {
    function openWeb(overrides: Partial<React.ComponentProps<typeof DateTimeField>> = {}) {
      setPlatformOS("web");
      openPicker(overrides);
    }

    it("shows the calendar and the typed time row together, with no switcher between them", () => {
      openWeb();

      // Both present from the moment the sheet opens - nothing has to be
      // toggled to reach the other half.
      expect(screen.getByText("mock picker")).toBeTruthy();
      expect(screen.getByLabelText("Entry time, hour")).toBeTruthy();
      expect(screen.getByLabelText("Entry time, minute")).toBeTruthy();
      // The library's own time view never mounts on web: `timePicker` stays off.
      expect(mockPickerProps.timePicker).toBe(false);
    });

    it("commits a typed time together with the date, once, on Done", () => {
      openWeb();

      fireEvent.changeText(screen.getByLabelText("Entry time, minute"), "45");
      fireEvent(screen.getByLabelText("Entry time, minute"), "blur");
      expect(props.onChange).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText("Done"));

      // 4:45 PM local (the suite's Asia/Kolkata frame) is 11:15Z; the day is
      // the original 1 August, untouched.
      expect(committedIso()).toBe("2026-08-01T11:15:00.000Z");
    });

    it("keeps the drafted time when a day is picked, instead of the library zeroing it", () => {
      // `react-native-ui-datepicker` resets to start-of-day on a plain day tap
      // (`mode: "date"`, `timePicker` off) — this wrapper must carry the
      // already-drafted time forward rather than let the day tap erase it.
      openWeb();

      fireEvent.changeText(screen.getByLabelText("Entry time, minute"), "45");
      fireEvent(screen.getByLabelText("Entry time, minute"), "blur");

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      fireEvent.press(screen.getByText("Done"));

      // The new day (3 March) at the same 4:45 PM local -> 11:15Z. NOT
      // "2026-03-03T08:15:00.000Z", which is what the mock's own embedded time
      // would give if the day tap had been left to overwrite the draft.
      expect(committedIso()).toBe("2026-03-03T11:15:00.000Z");
    });

    it("discards a typed time along with the date when the sheet is dismissed", () => {
      openWeb();

      fireEvent.changeText(screen.getByLabelText("Entry time, minute"), "45");
      fireEvent(screen.getByLabelText("Entry time, minute"), "blur");

      fireEvent.press(screen.getByLabelText("Close"));

      expect(props.onChange).not.toHaveBeenCalled();
    });
  });
});

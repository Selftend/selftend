import { act, fireEvent, screen } from "@testing-library/react-native";
import { Modal } from "react-native";

import { DateField } from "./date-field";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";
import { addDaysToKey, localDateKey, parseLocalNoon } from "@/src/utils/date";

// Marker Modal: the stock jest Modal cannot distinguish "not rendered" (the
// web unmount gate, #1054) from "mounted but closed" (native). See the
// helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

/** The day key the probe reports the user tapped. Reset per test. */
let mockNextPick = "2026-09-01";
/** The props the calendar was handed on its last render. */
let mockPickerProps: Record<string, unknown> = {};

// The calendar is third-party; mock it to a probe that surfaces the props it was
// handed and lets a test drive a selection, so the commit cycle is observable
// without walking a month grid. Whether those props reach the rendered grid is
// the sibling .rendered file's job — a predicate can be correct here and never
// be called there.
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
          (props.onChange as (mockP: { date: Date }) => void)({
            date: require("@/src/utils/date").parseLocalNoon(mockNextPick),
          }),
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

const LABEL = "Target date (optional)";
const TODAY = localDateKey(new Date());

beforeEach(() => {
  mockNextPick = "2026-09-01";
  mockPickerProps = {};
});

afterEach(() => {
  setPlatformOS("ios");
  jest.clearAllMocks();
});

/** Render the field. The trigger's name carries the value, so callers rebuild it. */
function renderField(value: string | null) {
  const onChange = jest.fn();
  renderWithProviders(<DateField value={value} onChange={onChange} accessibilityLabel={LABEL} />);
  return { onChange };
}

/** The trigger, whose accessible name is the label composed with the value. */
function trigger() {
  return screen.getByRole("button", {
    name: new RegExp(`^${LABEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: `),
  });
}

function openPicker(value: string | null) {
  const rendered = renderField(value);
  fireEvent.press(trigger());
  return rendered;
}

/** The `disabledDates` predicate the sheet handed the calendar, applied to a key. */
function isDayDisabled(dayKey: string): boolean {
  const predicate = mockPickerProps.disabledDates as (date: Date) => boolean;
  return predicate(parseLocalNoon(dayKey));
}

describe("DateField", () => {
  describe("the trigger", () => {
    it("reads 'No date set' when there is no date, from the shared key", () => {
      renderField(null);

      expect(screen.getByText("No date set")).toBeTruthy();
    });

    it("reads the chosen day, with its weekday", () => {
      renderField("2026-09-01");

      expect(screen.getByText("Tue, Sep 1, 2026")).toBeTruthy();
    });

    it("carries the value in its accessible name, not only on screen", () => {
      renderField("2026-09-01");

      expect(screen.getByLabelText(`${LABEL}: Tue, Sep 1, 2026`)).toBeTruthy();
    });

    it("is the same single control set or unset, so the field cannot change width", () => {
      // The defect #1184 named: a clear affordance that appears with the value
      // makes the field resize as the form is filled. Clearing lives in the
      // sheet footer instead, so the closed field is one button either way.
      renderField(null);
      expect(screen.getAllByRole("button")).toHaveLength(1);

      screen.rerender(
        <DateField value="2026-09-01" onChange={jest.fn()} accessibilityLabel={LABEL} />,
      );
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });
  });

  describe("the commit cycle", () => {
    it("commits the picked day as a day key on Done", () => {
      const { onChange } = openPicker(null);

      fireEvent.press(screen.getByTestId("mock-picker-select"));
      // Picking is a draft move: nothing reaches the form until Done.
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText("Done"));

      expect(onChange).toHaveBeenCalledWith("2026-09-01");
    });

    it("discards the draft when the sheet is dismissed", () => {
      const { onChange } = openPicker("2026-09-01");

      mockNextPick = "2026-09-08";
      fireEvent.press(screen.getByTestId("mock-picker-select"));
      // react-native-web routes Escape here; native routes the hardware back
      // button to the same place. Wrapped, because unlike the sheet's own tests
      // this `onClose` really does close the field.
      act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

      expect(onChange).not.toHaveBeenCalled();
      // ⚠️ "onChange was not called" alone is vacuous — a dismissal that did
      // nothing at all would pass it too. The sheet has to have closed.
      expect(screen.queryByTestId("mock-picker-select")).toBeNull();
      expect(screen.getByText("Tue, Sep 1, 2026")).toBeTruthy();
    });

    it("commits nothing when Done follows a calendar the user only looked at", () => {
      const { onChange } = openPicker("2026-09-01");

      fireEvent.press(screen.getByText("Done"));

      // The draft is seeded from the stored value, so an untouched Done would
      // otherwise re-commit an identical day and dirty a form nobody edited.
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears the date and closes when Clear is pressed", () => {
      const { onChange } = openPicker("2026-09-01");

      fireEvent.press(screen.getByText("Clear"));

      expect(onChange).toHaveBeenCalledWith(null);
      expect(screen.queryByTestId("mock-picker-select")).toBeNull();
    });

    it("keeps Clear in the footer while there is no date, so the footer holds one shape", () => {
      openPicker(null);

      expect(screen.getByText("Clear")).toBeTruthy();
      expect(screen.getByText("Done")).toBeTruthy();
    });
  });

  describe("the clamp to today and the edit-path exemption", () => {
    it("disables yesterday and leaves today and the future open", () => {
      openPicker(null);

      expect(isDayDisabled(addDaysToKey(TODAY, -1))).toBe(true);
      expect(isDayDisabled(TODAY)).toBe(false);
      expect(isDayDisabled(addDaysToKey(TODAY, 1))).toBe(false);
      expect(isDayDisabled(addDaysToKey(TODAY, 400))).toBe(false);
    });

    it("exempts a stored past target date, and only that one day", () => {
      const stored = addDaysToKey(TODAY, -30);
      openPicker(stored);

      // This screen doubles as an edit screen, so it can open on a goal whose
      // target date has already passed. Presenting the user's own saved value
      // as invalid is the failure this avoids.
      expect(isDayDisabled(stored)).toBe(false);
      // ...while the days around it stay shut. A `minDate` of min(today, stored)
      // would have unlocked every day in between.
      expect(isDayDisabled(addDaysToKey(stored, 1))).toBe(true);
      expect(isDayDisabled(addDaysToKey(stored, -1))).toBe(true);
      expect(isDayDisabled(addDaysToKey(TODAY, -1))).toBe(true);
    });

    it("passes no minDate, which is what makes the exemption reachable at all", () => {
      openPicker(addDaysToKey(TODAY, -30));

      // ⚠️ The library checks `minDate` FIRST and returns early
      // (`utils.isDateDisabled`), so a `minDate` of today would disable the
      // stored past day before `disabledDates` ever ran. The predicate has to
      // own the whole clamp.
      expect(mockPickerProps.minDate).toBeUndefined();
    });
  });

  it("leaves no Modal mounted while closed on web (#1054)", () => {
    setPlatformOS("web");
    renderField("2026-09-01");

    expect(screen.queryByTestId("modal-root")).toBeNull();
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { TimeField } from "@/src/components/app/time-field";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

// Marker Modal: the stock jest Modal renders null whenever `visible` is false, so
// "the web unmount gate returned null" and "a mounted Modal rendered nothing" look
// identical without it. PickerSheet's own suite covers the gate; this file needs the
// marker only so the two platforms share one react-native mock.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

// The shipped datetimepicker mock (test/setup.js) renders the props onto a View, so the
// spinner's `onChange` can be driven directly - which is the only way to reproduce "the
// iOS spinner fires continuously while scrolling".
const mockAndroidOpen = jest.mocked(DateTimePickerAndroid.open);

const LABEL = "Sleep reminder time";

function at(hour: number, minute: number) {
  return new Date(2026, 0, 1, hour, minute, 0, 0);
}

afterEach(async () => {
  setPlatformOS("ios");
  await setLanguage("en");
  jest.clearAllMocks();
});

function renderField(overrides: Partial<React.ComponentProps<typeof TimeField>> = {}) {
  const onChange = jest.fn();
  renderWithProviders(
    <TimeField
      value={{ hour: 19, minute: 0 }}
      onChange={onChange}
      accessibilityLabel={LABEL}
      {...overrides}
    />,
  );
  return { onChange };
}

/* ------------------------------------------------------------------ web --- */

describe("TimeField on web: the typed HH:MM pair", () => {
  beforeEach(() => setPlatformOS("web"));

  it("renders hours and minutes as two separately named inputs, not one browser widget", () => {
    renderField();

    // Composed names: three sub-controls sharing one name are three controls a
    // screen-reader user cannot tell apart.
    expect(screen.getByLabelText(`${LABEL}, hour`)).toBeTruthy();
    expect(screen.getByLabelText(`${LABEL}, minute`)).toBeTruthy();
    // The thing this replaces is gone: no trigger opening any picker.
    expect(screen.queryByLabelText(LABEL)).toBeNull();
  });

  it("commits a complete hour once, on blur and not before", () => {
    const { onChange } = renderField();
    const hour = screen.getByLabelText(`${LABEL}, hour`);

    // 19:00 reads as 7 PM here, so 08 + the unchanged PM is 20:00.
    fireEvent.changeText(hour, "0");
    fireEvent.changeText(hour, "08");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent(hour, "blur");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hour: 20, minute: 0 });
  });

  it("commits a complete minute once, on blur", () => {
    const { onChange } = renderField();
    const minute = screen.getByLabelText(`${LABEL}, minute`);

    fireEvent.changeText(minute, "45");
    fireEvent(minute, "blur");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hour: 19, minute: 45 });
  });

  it("never auto-advances: a full two-digit hour does nothing until the field is left", () => {
    // Moving focus out from under a screen-reader user mid-entry is worse than one
    // extra Tab. The visible half of that promise - no commit, no state change on the
    // second digit - is what jest can see; the e2e watches focus itself.
    const { onChange } = renderField();
    const hour = screen.getByLabelText(`${LABEL}, hour`);

    fireEvent.changeText(hour, "08");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`${LABEL}, hour`).props.value).toBe("08");
    expect(screen.getByLabelText(`${LABEL}, minute`).props.value).toBe("00");
  });

  it("leaving a field the user only tabbed through commits nothing", () => {
    const { onChange } = renderField();

    fireEvent(screen.getByLabelText(`${LABEL}, hour`), "blur");
    fireEvent(screen.getByLabelText(`${LABEL}, minute`), "blur");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("visibly reverts an incomplete value on blur and says so in a polite live region", () => {
    const { onChange } = renderField();
    const hour = screen.getByLabelText(`${LABEL}, hour`);

    fireEvent.changeText(hour, "99");
    // The typed text is held, so the field shows what the user typed...
    expect(screen.getByLabelText(`${LABEL}, hour`).props.value).toBe("99");

    fireEvent(hour, "blur");

    // ...and leaving with nothing valid reverts rather than committing or stranding it.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`${LABEL}, hour`).props.value).toBe("07");

    // A silent revert is an unidentified error, so it is announced.
    const notice = screen.getByText(/Reverted to 7:00/);
    expect(notice.props["aria-live"]).toBe("polite");
  });

  it("keeps the revert notice through a Tab to the next field, and drops it on the next keystroke", () => {
    // Clearing on FOCUS would erase the explanation in the same keystroke that
    // caused it: Tab out of a reverted hour lands on the minute input.
    renderField();
    const hour = screen.getByLabelText(`${LABEL}, hour`);

    fireEvent.changeText(hour, "99");
    fireEvent(hour, "blur");
    expect(screen.queryByText(/Reverted to 7:00/)).not.toBeNull();

    fireEvent(screen.getByLabelText(`${LABEL}, minute`), "focus", { target: {} });
    expect(screen.queryByText(/Reverted to 7:00/)).not.toBeNull();

    fireEvent.changeText(screen.getByLabelText(`${LABEL}, minute`), "3");
    expect(screen.queryByText(/Reverted to 7:00/)).toBeNull();
  });

  it("offers AM/PM in a 12-hour locale and commits the flipped hour", () => {
    const { onChange } = renderField();

    expect(screen.getByRole("tab", { name: "PM" })).toBeSelected();

    fireEvent.press(screen.getByRole("tab", { name: "AM" }));
    expect(onChange).toHaveBeenCalledWith({ hour: 7, minute: 0 });
  });

  it("offers no AM/PM in a 24-hour locale, and takes hours up to 23 there", async () => {
    await setLanguage("bg");
    const { onChange } = renderField();

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    // The same value the 12-hour locale shows as 07 + PM.
    const hour = screen.getByLabelText(`${LABEL}, час`);
    expect(hour.props.value).toBe("19");

    fireEvent.changeText(hour, "23");
    fireEvent(hour, "blur");
    expect(onChange).toHaveBeenCalledWith({ hour: 23, minute: 0 });
  });

  it("rejects an hour a 24-hour clock does not have", async () => {
    await setLanguage("bg");
    const { onChange } = renderField();
    const hour = screen.getByLabelText(`${LABEL}, час`);

    fireEvent.changeText(hour, "24");
    fireEvent(hour, "blur");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`${LABEL}, час`).props.value).toBe("19");
  });

  it("keeps its sub-controls operable-sized through real padding, never hitSlop", () => {
    // ⚠️ react-native-web targets the DOM box and ignores `hitSlop` outright, so the
    // 24x24 AA floor has to come from the box itself. These used to compose down to
    // 22 x 19 by not stretching to their container (#1231). Computed pixels are not
    // observable in jest; the class that produces them is.
    renderField();

    const hour = screen.getByLabelText(`${LABEL}, hour`);
    expect(hour.props.className).toContain("h-10");
    expect(hour.props.hitSlop).toBeUndefined();

    const tab = screen.getByRole("tab", { name: "AM" });
    expect(tab.props.className).toContain("py-1.5");
    expect(tab.props.hitSlop).toBeUndefined();
  });

  it("goes inert but stays legible while disabled", () => {
    const { onChange } = renderField({ disabled: true });

    expect(screen.getByLabelText(`${LABEL}, hour`).props.editable).toBe(false);
    fireEvent.press(screen.getByRole("tab", { name: "AM" }));
    expect(onChange).not.toHaveBeenCalled();
    // Still shows its real value - a dimmed row that reads "Off" is the failure
    // `inDimmedContainer` exists to prevent.
    expect(screen.getByLabelText(`${LABEL}, hour`).props.value).toBe("07");
  });
});

/* --------------------------------------------------------------- native --- */

describe("TimeField on iOS: the spinner inside the shared sheet", () => {
  function openSheet(overrides: Partial<React.ComponentProps<typeof TimeField>> = {}) {
    const result = renderField(overrides);
    fireEvent.press(screen.getByLabelText(LABEL));
    return result;
  }

  it("streams the spinner into the sheet's draft and commits once, on Done", () => {
    const { onChange } = openSheet();
    const spinner = screen.getByTestId("time-picker-spinner");

    fireEvent(spinner, "change", { type: "set" }, at(20, 0));
    fireEvent(spinner, "change", { type: "set" }, at(21, 0));
    fireEvent(spinner, "change", { type: "set" }, at(21, 30));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Done"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hour: 21, minute: 30 });
  });

  it("dismissing the sheet discards the scrolled value", () => {
    // Nothing asserted this in either direction before. `onChange` alone would be a
    // vacuous check - a dismissal that is a complete no-op passes it too - so the
    // sheet is also asserted to have closed, and reopening to show the stored time.
    const { onChange } = openSheet();
    const spinner = screen.getByTestId("time-picker-spinner");
    fireEvent(spinner, "change", { type: "set" }, at(21, 30));

    fireEvent.press(screen.getByLabelText("Close"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("time-picker-spinner")).toBeNull();

    fireEvent.press(screen.getByLabelText(LABEL));
    const reopened = screen.getByTestId("time-picker-spinner").props.value as Date;
    expect([reopened.getHours(), reopened.getMinutes()]).toEqual([19, 0]);
  });

  it("Done without touching the spinner commits nothing", () => {
    // ☠️ A PickerSheet seeded from the current value commits that value on Done unless
    // the field stops it - a commit the old live-change picker could not produce.
    const { onChange } = openSheet();

    fireEvent.press(screen.getByText("Done"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("derives 12-vs-24-hour from the locale instead of hardcoding it", async () => {
    openSheet();
    expect(screen.getByTestId("time-picker-spinner").props.is24Hour).toBe(false);
    screen.unmount();

    await setLanguage("bg");
    openSheet();
    expect(screen.getByTestId("time-picker-spinner").props.is24Hour).toBe(true);
  });

  it("shows the time the way the locale writes it, not the wire format", async () => {
    renderField();
    expect(screen.getByText("7:00 PM")).toBeTruthy();
    screen.unmount();

    await setLanguage("bg");
    renderField();
    expect(screen.getByText("19:00")).toBeTruthy();
  });

  it("does not open while disabled", () => {
    renderField({ disabled: true });

    fireEvent.press(screen.getByLabelText(LABEL));

    expect(screen.queryByTestId("time-picker-spinner")).toBeNull();
  });
});

describe("TimeField on Android: the OS dialog", () => {
  beforeEach(() => setPlatformOS("android"));

  it("OK commits once; cancel commits nothing", () => {
    const { onChange } = renderField();

    fireEvent.press(screen.getByLabelText(LABEL));
    const onPickerChange = mockAndroidOpen.mock.calls[0]?.[0]?.onChange;

    onPickerChange?.({ type: "dismissed" } as never, undefined);
    expect(onChange).not.toHaveBeenCalled();

    onPickerChange?.({ type: "set" } as never, at(8, 45));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hour: 8, minute: 45 });
  });

  it("derives the dialog's 12-vs-24-hour flag from the locale", async () => {
    renderField();
    fireEvent.press(screen.getByLabelText(LABEL));
    expect(mockAndroidOpen.mock.calls[0]?.[0]?.is24Hour).toBe(false);

    screen.unmount();
    await setLanguage("bg");
    renderField();
    fireEvent.press(screen.getByLabelText(LABEL));
    expect(mockAndroidOpen.mock.calls[1]?.[0]?.is24Hour).toBe(true);
  });
});

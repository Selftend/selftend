import { fireEvent, screen } from "@testing-library/react-native";
import dayjs from "dayjs";

import { DateRangeField } from "@/src/components/app/date-range-field";
import { renderWithProviders } from "@/test/render-with-providers";

// The calendar itself is third-party (react-native-ui-datepicker, already shipping via
// DateTimeField); mock it to a probe that surfaces the wrapper's props and lets tests
// drive onChange without walking real month grids.
type MockRangeParams = { startDate?: unknown; endDate?: unknown };
let mockPickerProps: Record<string, unknown> = {};
jest.mock("react-native-ui-datepicker", () => {
  const { createElement: h } = require("react");
  const { Pressable, Text } = require("react-native");
  const MockPicker = (props: Record<string, unknown>) => {
    mockPickerProps = props;
    const fire = () =>
      (props.onChange as (mockP: MockRangeParams) => void)({
        startDate: "2026-03-03",
        endDate: "2026-04-01",
      });
    return h(
      Pressable,
      { testID: "mock-picker-select", onPress: fire },
      h(Text, null, "mock picker"),
    );
  };
  return { __esModule: true, default: MockPicker, useDefaultStyles: () => ({}) };
});

/** Local-day key of a picker prop (dayjs/Date/string), for timezone-proof assertions. */
function asDateKey(value: unknown): string {
  return dayjs(value as string).format("YYYY-MM-DD");
}

describe("DateRangeField", () => {
  beforeEach(() => {
    mockPickerProps = {};
  });

  it("renders nothing while not visible", () => {
    renderWithProviders(
      <DateRangeField
        visible={false}
        onClose={jest.fn()}
        value={null}
        onChange={jest.fn()}
        maxDateKey="2026-07-25"
      />,
    );
    expect(screen.queryByText("mock picker")).toBeNull();
  });

  it("mounts the picker in range mode clamped between the first entry and today", () => {
    renderWithProviders(
      <DateRangeField
        visible
        onClose={jest.fn()}
        value={null}
        onChange={jest.fn()}
        minDateKey="2026-01-05"
        maxDateKey="2026-07-25"
      />,
    );
    expect(mockPickerProps.mode).toBe("range");
    expect(asDateKey(mockPickerProps.minDate)).toBe("2026-01-05");
    expect(asDateKey(mockPickerProps.maxDate)).toBe("2026-07-25");
  });

  it("applies a picked range as local date keys on Done", () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <DateRangeField
        visible
        onClose={onClose}
        value={null}
        onChange={onChange}
        maxDateKey="2026-07-25"
      />,
    );

    fireEvent.press(screen.getByTestId("mock-picker-select"));
    fireEvent.press(screen.getByText("Done"));

    expect(onChange).toHaveBeenCalledWith({ start: "2026-03-03", end: "2026-04-01" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without applying when nothing was picked", () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <DateRangeField
        visible
        onClose={onClose}
        value={null}
        onChange={onChange}
        maxDateKey="2026-07-25"
      />,
    );

    fireEvent.press(screen.getByText("Done"));

    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("seeds the picker with the active custom range so reopening allows adjustment", () => {
    renderWithProviders(
      <DateRangeField
        visible
        onClose={jest.fn()}
        value={{ start: "2026-03-03", end: "2026-04-01" }}
        onChange={jest.fn()}
        maxDateKey="2026-07-25"
      />,
    );
    expect(asDateKey(mockPickerProps.startDate)).toBe("2026-03-03");
    expect(asDateKey(mockPickerProps.endDate)).toBe("2026-04-01");
  });
});

import { fireEvent, screen } from "@testing-library/react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

import { TimeField } from "@/src/components/app/time-field";
import { TimeField as WebTimeField } from "@/src/components/app/time-field.web";
import { renderWithProviders } from "@/test/render-with-providers";

// The shipped datetimepicker mock (test/setup.js) renders the props onto a View, so the
// spinner's `onChange` can be driven directly - which is the only way to reproduce "the iOS
// spinner fires continuously while scrolling".
const mockAndroidOpen = jest.mocked(DateTimePickerAndroid.open);

function at(hour: number, minute: number) {
  const date = new Date(2026, 0, 1, hour, minute, 0, 0);
  return date;
}

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

afterEach(() => setPlatformOS("ios"));

describe("TimeField commit boundary", () => {
  it("iOS: the spinner streams changes and only closing commits, once", () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    renderWithProviders(
      <TimeField
        value={{ hour: 19, minute: 0 }}
        onChange={onChange}
        onCommit={onCommit}
        accessibilityLabel="Sleep reminder time"
      />,
    );

    fireEvent.press(screen.getByLabelText("Sleep reminder time"));
    const spinner = screen.getByTestId("time-picker-spinner");

    // Scrolling the spinner: three onChange events, no commit yet.
    fireEvent(spinner, "change", { type: "set" }, at(20, 0));
    fireEvent(spinner, "change", { type: "set" }, at(21, 0));
    fireEvent(spinner, "change", { type: "set" }, at(21, 30));
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Done"));

    // Exactly one commit, carrying the value the user settled on.
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ hour: 21, minute: 30 });
  });

  it("iOS: closing without touching the spinner commits nothing new", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <TimeField
        value={{ hour: 7, minute: 15 }}
        onChange={jest.fn()}
        onCommit={onCommit}
        accessibilityLabel="Sleep reminder time"
      />,
    );

    fireEvent.press(screen.getByLabelText("Sleep reminder time"));
    fireEvent.press(screen.getByText("Done"));

    // The current value, which a caller compares against the stored one and skips.
    expect(onCommit).toHaveBeenCalledWith({ hour: 7, minute: 15 });
  });

  it("Android: OK commits once; cancel commits nothing", () => {
    setPlatformOS("android");
    const onCommit = jest.fn();
    renderWithProviders(
      <TimeField
        value={{ hour: 19, minute: 0 }}
        onChange={jest.fn()}
        onCommit={onCommit}
        accessibilityLabel="Sleep reminder time"
      />,
    );

    fireEvent.press(screen.getByLabelText("Sleep reminder time"));
    const onPickerChange = mockAndroidOpen.mock.calls[0]?.[0]?.onChange;

    onPickerChange?.({ type: "dismissed" } as never, undefined);
    expect(onCommit).not.toHaveBeenCalled();

    onPickerChange?.({ type: "set" } as never, at(8, 45));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ hour: 8, minute: 45 });
  });

  it("web: every keystroke changes, only leaving the field commits", () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    renderWithProviders(
      <WebTimeField
        value={{ hour: 19, minute: 0 }}
        onChange={onChange}
        onCommit={onCommit}
        accessibilityLabel="Sleep reminder time"
      />,
    );

    const input = screen.getByLabelText("Sleep reminder time");
    // `<input type="time">` fires change per field edit: "19:0" is a real intermediate
    // state, and persisting it would write a wrong time and then correct it.
    fireEvent(input, "change", { target: { value: "07:0" } });
    fireEvent(input, "change", { target: { value: "07:05" } });
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent(input, "blur", { target: { value: "07:05" } });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ hour: 7, minute: 5 });
  });

  it("web: an abandoned half-typed edit visibly reverts instead of silently sticking", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <WebTimeField
        value={{ hour: 19, minute: 0 }}
        onChange={jest.fn()}
        onCommit={onCommit}
        accessibilityLabel="Sleep reminder time"
      />,
    );

    const input = screen.getByLabelText("Sleep reminder time");
    fireEvent(input, "change", { target: { value: "07:" } });
    // The intermediate text is held, so the field shows what the user typed...
    expect(screen.getByLabelText("Sleep reminder time").props.value).toBe("07:");

    fireEvent(input, "blur", { target: { value: "07:" } });
    // ...and leaving with nothing valid reverts to the stored time rather than committing
    // or stranding a half-typed one.
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Sleep reminder time").props.value).toBe("19:00");
  });
});

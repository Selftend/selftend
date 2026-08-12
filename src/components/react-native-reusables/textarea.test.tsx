import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";
import { Textarea } from "./textarea";

function contentSizeEvent(height: number) {
  return { nativeEvent: { contentSize: { width: 300, height } } };
}

function heightOf(input: ReactTestInstance) {
  return StyleSheet.flatten<ViewStyle>(input.props.style)?.height;
}

// jest-expo runs as iOS, so these exercise the native auto-grow path: height
// follows onContentSizeChange, clamped to the 64–208px band (min-h-16 to
// max-h-52). The iOS event carries the text height alone, so +18px of chrome
// is added back; on Android the event already includes padding and only the
// borders are added — same clamp, different constant. The web path is pure
// CSS (field-sizing: content) and has no JS behavior to test here.
describe("Textarea auto-grow (native)", () => {
  it("sets no explicit height before the first content measurement", () => {
    const { getByTestId } = render(<Textarea testID="notes" />);
    expect(heightOf(getByTestId("notes"))).toBeUndefined();
  });

  it("grows with the measured content height", () => {
    const { getByTestId } = render(<Textarea testID="notes" />);
    fireEvent(getByTestId("notes"), "contentSizeChange", contentSizeEvent(120));
    // 120px of text + 16px vertical padding + 2px border.
    expect(heightOf(getByTestId("notes"))).toBe(138);
  });

  it("never shrinks below the 64px floor", () => {
    const { getByTestId } = render(<Textarea testID="notes" />);
    fireEvent(getByTestId("notes"), "contentSizeChange", contentSizeEvent(24));
    expect(heightOf(getByTestId("notes"))).toBe(64);
  });

  it("caps at 208px and leaves longer notes to internal scroll", () => {
    const { getByTestId } = render(<Textarea testID="notes" />);
    fireEvent(getByTestId("notes"), "contentSizeChange", contentSizeEvent(500));
    expect(heightOf(getByTestId("notes"))).toBe(208);
  });

  it("shrinks back when lines are deleted", () => {
    const { getByTestId } = render(<Textarea testID="notes" />);
    fireEvent(getByTestId("notes"), "contentSizeChange", contentSizeEvent(500));
    fireEvent(getByTestId("notes"), "contentSizeChange", contentSizeEvent(120));
    expect(heightOf(getByTestId("notes"))).toBe(138);
  });

  it("still forwards onContentSizeChange to the consumer", () => {
    const onContentSizeChange = jest.fn();
    const { getByTestId } = render(
      <Textarea testID="notes" onContentSizeChange={onContentSizeChange} />,
    );
    fireEvent(getByTestId("notes"), "contentSizeChange", contentSizeEvent(120));
    expect(onContentSizeChange).toHaveBeenCalledTimes(1);
  });
});

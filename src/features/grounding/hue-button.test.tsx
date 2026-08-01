import { fireEvent } from "@testing-library/react-native";

import { HueButton } from "@/src/features/grounding/hue-button";
import { HueIconBadge, iconSizeClass } from "@/src/features/grounding/hue-icon-badge";
import { renderWithProviders } from "@/test/render-with-providers";

describe("HueButton", () => {
  it("renders its label and fires onPress", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithProviders(<HueButton label="Start" onPress={onPress} />);
    fireEvent.press(getByText("Start"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not fire onPress while loading", () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <HueButton label="Save" loading onPress={onPress} />,
    );
    fireEvent.press(getByLabelText("Save"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("HueIconBadge", () => {
  it("renders without throwing in both shapes", () => {
    const square = renderWithProviders(<HueIconBadge icon="spa" size={64} iconSize={32} />);
    const circle = renderWithProviders(
      <HueIconBadge icon="spa" size={96} iconSize={46} shape="circle" />,
    );
    expect(square.toJSON()).toBeTruthy();
    expect(circle.toJSON()).toBeTruthy();
  });

  // Guards the centering fix: every icon size used by call sites must map to a
  // size class that overrides the shared Icon's default `size-6` box. A missing
  // mapping silently reverts to size-6, making larger glyphs overflow top-left.
  it.each([
    [24, "size-6"],
    [32, "size-8"],
    [46, "size-[46px]"],
    [48, "size-12"],
  ])("maps icon size %i to its matching size class", (n, expected) => {
    expect(iconSizeClass(n as number)).toBe(expected);
  });
});

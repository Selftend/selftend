import { readFileSync } from "node:fs";

import { fireEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { THEME_HEXES } from "@/lib/theme";
import { DEFAULT_STYLE } from "@/src/lib/theme/styles";

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

  // The label paints the PALETTE's `--primary-foreground`, never a hardcoded
  // white/dark pair chosen by scheme. Deciding by scheme held while there was
  // one accent, but amber-noir's light accent is a gold on which white measures
  // 4.43:1 - below AA. Reading the token means this button inherits the pairing
  // test/theme-contrast.test.ts already audits for all eight styles, instead of
  // re-deciding it from a rule that only ever held for the default palette.
  it("paints its label in the active palette's primary foreground", () => {
    const { getByText } = renderWithProviders(<HueButton label="Start" onPress={jest.fn()} />);

    const colour = StyleSheet.flatten(getByText("Start").props.style)?.color;
    const expected = THEME_HEXES[DEFAULT_STYLE].light["--primary-foreground"];

    expect(colour?.toLowerCase()).toBe(expected.toLowerCase());
    // The hue version's two literals must not come back as a scheme ternary.
    expect(readFileSync("src/features/grounding/hue-button.tsx", "utf8")).not.toMatch(
      /#ffffff|#15121b/i,
    );
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

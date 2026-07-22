import { render } from "@testing-library/react-native";
import { KeyboardAvoidingView, Text, View } from "react-native";

import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";

describe("MobileFormScreen", () => {
  it("renders children and the footer slot", () => {
    const { getByText } = render(
      <MobileFormScreen footer={<Text>Save</Text>}>
        <Text>Body</Text>
      </MobileFormScreen>,
    );

    expect(getByText("Body")).toBeTruthy();
    expect(getByText("Save")).toBeTruthy();
  });

  // Regression lock: keyboard avoidance must be explicit "padding" on every
  // native platform. The old `Platform.OS === "ios" ? "padding" : undefined`
  // pattern left Android relying on window-level adjustResize, which
  // edge-to-edge (enforced since Expo SDK 54) turns into adjustNothing — the
  // keyboard then covers form content. See src/lib/keyboard-avoiding.ts.
  it("sets explicit padding behavior so Android avoids the keyboard under edge-to-edge", () => {
    const { UNSAFE_getByType } = render(
      <MobileFormScreen>
        <View />
      </MobileFormScreen>,
    );

    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
  });
});

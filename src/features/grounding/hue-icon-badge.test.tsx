import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { renderWithProviders } from "@/test/render-with-providers";

describe("HueIconBadge", () => {
  // 34 (the session's size since the shell adoption) was never a key in the
  // retired size lookup table — it fell through to the shared Icon's default
  // 24px box and the glyph anchored top-left. The box must be derived from
  // iconSize, not looked up, so any value centres. The badge's contract is the
  // inline style it hands Icon: className is invisible in jest, and NativeWind's
  // cssInterop folds the inline box into the host's size prop, so the Icon
  // element's own props are the only place the derivation can be observed.
  it.each([34, 32, 18])("hands Icon an inline box derived from iconSize=%d", (iconSize) => {
    const { UNSAFE_getByType } = renderWithProviders(
      <HueIconBadge icon="visibility" size={92} iconSize={iconSize} shape="circle" />,
    );
    const icon = UNSAFE_getByType(Icon);
    expect(icon.props.size).toBe(iconSize);
    expect(StyleSheet.flatten(icon.props.style)).toMatchObject({
      width: iconSize,
      height: iconSize,
    });
    expect(UNSAFE_getByType(MaterialIcons).props.size).toBe(iconSize);
  });

  it("draws the container at size, circular when shape is circle", () => {
    const { UNSAFE_getAllByType } = renderWithProviders(
      <HueIconBadge icon="spa" size={84} iconSize={32} shape="circle" />,
    );
    const container = UNSAFE_getAllByType(View)
      .map((view) => StyleSheet.flatten(view.props.style))
      .find((style) => style?.width === 84);
    expect(container).toMatchObject({ height: 84, borderRadius: 42 });
  });
});

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { renderWithProviders } from "@/test/render-with-providers";

describe("Icon", () => {
  // Arbitrary-value sizes (size-[18px]) once fell through the class-to-px
  // lookup table to the default size-6 prefix, so the glyph rendered 24px
  // inside a genuinely 18px CSS box and sat off-centre in outlined buttons.
  // The glyph's size must come from the same class the box does; className is
  // invisible in jest, so the MaterialIcons size prop is where the resolution
  // can be observed. 17/18 are the app's real call-site values; neither is a
  // key a resurrected lookup table would carry.
  it.each([
    ["size-[18px]", 18],
    ["size-[17px]", 17],
  ])("resolves the arbitrary class %s to a %dpx glyph", (className, expected) => {
    const { UNSAFE_getByType } = renderWithProviders(<Icon name="edit" className={className} />);
    const icon = UNSAFE_getByType(MaterialIcons);
    expect(icon.props.size).toBe(expected);
    expect(StyleSheet.flatten(icon.props.style)).toMatchObject({ lineHeight: expected });
  });

  it("still resolves mapped classes and the size-6 default", () => {
    const mapped = renderWithProviders(<Icon name="edit" className="size-4" />);
    expect(mapped.UNSAFE_getByType(MaterialIcons).props.size).toBe(16);

    const fallback = renderWithProviders(<Icon name="edit" />);
    expect(fallback.UNSAFE_getByType(MaterialIcons).props.size).toBe(24);
  });

  it("lets an explicit size prop win over classes", () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <Icon name="edit" className="size-[18px]" size={20} />,
    );
    expect(UNSAFE_getByType(MaterialIcons).props.size).toBe(20);
  });
});

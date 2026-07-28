import { render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Badge } from "./badge";
import { Icon } from "@/src/components/react-native-reusables/icon";

describe("Badge", () => {
  it("renders icon when icon prop is provided", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge variant="tint" tint="act" icon="psychology">
        <Text>CBT</Text>
      </Badge>,
    );
    // Behavioral assertion: Icon component must actually render
    const icons = UNSAFE_getAllByType(Icon);
    expect(icons).toHaveLength(1);
    expect(icons[0].props.name).toBe("psychology");
  });

  // The label and the glyph want different colours, and `Icon` reads the same
  // TextClassContext the label does - so a tinted badge darkens its glyph to the
  // label's ink unless the icon is given the accent explicitly. An enabled icon
  // rendered in ink reads as disabled (#421).
  it("keeps a tinted badge's glyph on the accent, not the label's ink", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge variant="tint" tint="think" icon="psychology">
        <Text>Gratitude</Text>
      </Badge>,
    );

    const icon = UNSAFE_getAllByType(Icon)[0];
    expect(icon.props.className).toContain("text-think");
    expect(icon.props.className).not.toContain("text-think-ink");
  });

  it("leaves an untinted badge's glyph to inherit, with no tint class of its own", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge icon="psychology">
        <Text>Beta</Text>
      </Badge>,
    );

    expect(UNSAFE_getAllByType(Icon)[0].props.className).toBeUndefined();
  });
});

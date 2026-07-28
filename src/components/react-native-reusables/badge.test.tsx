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
  // label's ink unless the icon is given a class explicitly. An enabled icon
  // rendered in ink reads as disabled (#421).
  //
  // This used to be asserted on `think`. It cannot be any more, and the reason is
  // the point of #433: `think`'s accent measures 1.80:1 as a rendered glyph, so
  // TINT_ACCENT.think IS `text-think-ink` now and the two colours coincide for
  // that one hue. Asserting the split there would have to be deleted or inverted;
  // asserting it on `act`, where accent and ink are genuinely different colours,
  // keeps testing the mechanism this test exists for.
  it("keeps a tinted badge's glyph on the accent, not the label's ink", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge variant="tint" tint="act" icon="psychology">
        <Text>Habits</Text>
      </Badge>,
    );

    const icon = UNSAFE_getAllByType(Icon)[0];
    expect(icon.props.className).toContain("text-act");
    expect(icon.props.className).not.toContain("text-act-ink");
  });

  // The other half of the same mechanism: `think`'s glyph still gets its class
  // from TINT_ACCENT rather than inheriting the label's, which is what stops the
  // context from deciding it. That the class it gets happens to equal the ink is
  // a measurement (test/theme-token-sync.test.ts derives it), not an inheritance.
  it("gives think's glyph its own class even though that class is the ink", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge variant="tint" tint="think" icon="psychology">
        <Text>Gratitude</Text>
      </Badge>,
    );

    expect(UNSAFE_getAllByType(Icon)[0].props.className).toBe("text-think-ink");
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

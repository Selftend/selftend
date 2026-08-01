import type { ComponentProps } from "react";
import { render } from "@testing-library/react-native";
import { Text } from "@/src/components/react-native-reusables/text";
import { Badge } from "./badge";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { HUE_NAMES } from "@/src/lib/design-tokens";

describe("Badge", () => {
  it("renders icon when icon prop is provided", () => {
    const { UNSAFE_getAllByType } = render(
      <Badge variant="secondary" icon="psychology">
        <Text>CBT</Text>
      </Badge>,
    );
    // Behavioral assertion: Icon component must actually render
    const icons = UNSAFE_getAllByType(Icon);
    expect(icons).toHaveLength(1);
    expect(icons[0].props.name).toBe("psychology");
  });

  // INVERTED by #587, replacing two tests that asserted the opposite.
  //
  // The Badge used to carry a `tint` variant: nine compound variants painting
  // `bg-<hue>/0.10` with that hue's ink on the label, and a glyph deliberately
  // held OFF that ink because an enabled icon rendered in ink reads as disabled
  // (#421). Two tests pinned that split - "keeps a tinted badge's glyph on the
  // accent, not the label's ink" on `act`, and its mirror on `think`, where
  // accent and ink coincide because `think` measures 1.80:1 as a glyph (#433).
  //
  // Module identity is icon and label now (#558), so there is no tint, no split
  // and nothing for the two tests to assert. The mechanism they protected has
  // not merely been switched off - it has no inputs left.
  //
  // The cast is what makes this fail on the OLD behaviour rather than merely
  // pass on the new. It hands the component exactly the props the removed API
  // took; before this change they rendered `bg-[hsl(var(--act)/0.10)]` on the
  // badge and `text-act` on the glyph. `cva` ignores a variant it does not
  // define, so now they fall through to the defaults and paint nothing.
  it("has no tint variant left to paint a module hue", () => {
    const retired = {
      variant: "tint",
      tint: "act",
    } as unknown as ComponentProps<typeof Badge>;

    const { UNSAFE_getAllByType, UNSAFE_root } = render(
      <Badge {...retired} icon="psychology">
        <Text>Habits</Text>
      </Badge>,
    );

    const hue = new RegExp(`(?<![\\w-])(text|bg|border)-(${HUE_NAMES.join("|")})(-ink)?(?![\\w-])`);
    const classNames = UNSAFE_root.findAll((node) => typeof node.props?.className === "string").map(
      (node) => node.props.className as string,
    );

    expect(classNames.filter((name) => hue.test(name))).toEqual([]);
    // The glyph inherits the label's colour through TextClassContext, which is
    // what every non-tint variant always did.
    expect(UNSAFE_getAllByType(Icon)[0].props.className).toBeUndefined();
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

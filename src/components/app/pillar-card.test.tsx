import { fireEvent, render } from "@testing-library/react-native";

import { tintStripeColors } from "@/src/features/mindfulness/exercise-hue";
import { PillarCard } from "./pillar-card";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

describe("PillarCard", () => {
  it("renders header with letter + title + kicker + description", () => {
    const { getByText } = render(
      <PillarCard
        letter="T"
        title="Think"
        kicker="Cognitive"
        description="Examine the thoughts and beliefs under your reactions."
      />,
    );
    expect(getByText("T", { includeHiddenElements: true })).toBeTruthy();
    expect(getByText("Think")).toBeTruthy();
    expect(getByText(/Cognitive/)).toBeTruthy();
    expect(getByText(/thoughts and beliefs/)).toBeTruthy();
  });

  it("invokes onToolPress with the toolKey", () => {
    const onToolPress = jest.fn();
    const { getByRole } = render(
      <PillarCard
        letter="T"
        title="Think"
        kicker="Cognitive"
        description="..."
        onToolPress={onToolPress}
      >
        <PillarCard.Tool toolKey="thoughts" icon="article" name="Thought Records" desc="d" />
      </PillarCard>,
    );
    fireEvent.press(getByRole("button"));
    expect(onToolPress).toHaveBeenCalledWith("thoughts");
  });

  // Still a stripe, no longer "for the pillar colour" (#587). The shape is
  // what this asserts and the shape is unchanged; the colours inside it are the
  // app accent's now rather than the pillar's hue.
  it("renders a top gradient stripe", () => {
    const { UNSAFE_root } = render(
      <PillarCard letter="A" title="Act" kicker="Action" description="..." />,
    );
    // The LinearGradient (mocked as View) should have an absolute style with top:0 and height:3
    const tree = UNSAFE_root.findAll((node: { props: { style?: unknown } }) => {
      const style = node.props.style;
      if (!style) return false;
      const styles = Array.isArray(style) ? style.flat(Infinity).filter(Boolean) : [style];
      return styles.some(
        (s: { position?: string; height?: number; top?: number } | null) =>
          s && s.position === "absolute" && s.height === 3 && s.top === 0,
      );
    });
    expect(tree.length).toBeGreaterThanOrEqual(1);
  });

  // The colour half, which the shape assertion above cannot reach and which the
  // static gate could not either. `tintStripeColors` takes a tint as a VALUE, so
  // a hue arriving here is neither a class name nor a CSS variable nor even an
  // inline argument - it is a module-level constant. Both regex passes in
  // test/module-identity-neutral.test.ts stayed green with `STRIPE_TINT` flipped
  // back to "act", which is how this test came to exist.
  //
  // Asserted against the helper rather than against literal HSL, so a palette
  // retune moves both sides together; the discrimination comes from the second
  // expectation, which pins that the accent's stripe and a hue's stripe are
  // genuinely different colours.
  it("draws the stripe in the app accent, not a module hue", () => {
    const { UNSAFE_root } = render(
      <PillarCard letter="A" title="Act" kicker="Action" description="..." />,
    );

    // LinearGradient is mocked as a plain View, so it cannot be found by type -
    // every View would match. The stripe's own geometry is the selector.
    const stripe = UNSAFE_root.findAll((node: { props: { style?: unknown } }) => {
      const style = node.props.style;
      if (!style) return false;
      const styles = Array.isArray(style) ? style.flat(Infinity).filter(Boolean) : [style];
      return styles.some(
        (s: { position?: string; height?: number; top?: number } | null) =>
          s && s.position === "absolute" && s.height === 3 && s.top === 0,
      );
    })[0] as unknown as { props: { colors?: unknown } };

    // Scheme-agnostic: the test does not pin which appearance the renderer chose,
    // only that the stripe is one of the accent's two and neither of a hue's.
    const accent = [tintStripeColors("primary", false), tintStripeColors("primary", true)];
    const hue = [tintStripeColors("act", false), tintStripeColors("act", true)];

    expect(accent).toContainEqual(stripe.props.colors);
    expect(hue).not.toContainEqual(stripe.props.colors);
  });
});

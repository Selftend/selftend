import { fireEvent, render } from "@testing-library/react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { tintStripeColors } from "@/src/features/mindfulness/exercise-hue";
import { PillarCard } from "./pillar-card";
import { DEFAULT_STYLE, STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";
import { useStyleStore } from "@/src/stores/style-store";

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

  /**
   * The tools are full-width hairline rows (#1386). As a two-up tile grid each
   * one had ~170dp at 360dp to carry a name AND an 11.5px description, and the
   * Act pillar has six of them.
   *
   * ☠️ The description used to reach assistive tech only as an
   * `accessibilityHint`, which react-native-web never implements, while an
   * explicit `accessibilityLabel` hid the rendered text from it. Both are gone:
   * the row's children are its accessible name.
   */
  it("renders the tool description as text, with no explicit accessible name", () => {
    const { getByRole, getByText } = render(
      <PillarCard letter="T" title="Think" kicker="Cognitive" description="...">
        <PillarCard.Tool
          toolKey="thoughts"
          icon="article"
          name="Thought Records"
          desc="Catch a thought and test it."
        />
      </PillarCard>,
    );

    expect(getByText("Catch a thought and test it.")).toBeTruthy();
    const row = getByRole("button");
    expect(row.props.accessibilityLabel).toBeUndefined();
    expect(row.props.accessibilityHint).toBeUndefined();
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
  // static gate could not either: the stripe is drawn from a VALUE, so a wrong
  // colour here is neither a class name nor a CSS variable.
  //
  // It used to assert the stripe equalled `tintStripeColors("primary", …)`.
  // That passed while being wrong: the helper resolves PRIMARY_TRIPLES, the
  // DEFAULT palette's violet, so the stripe stayed lilac under all eight styles
  // and the test agreed with the implementation because both read the same
  // constant. The owner reported exactly that on the CBT and ACT pillar cards.
  //
  // So the property asserted is the one that failed in the app: the stripe
  // follows the SELECTED palette.
  const stripeOf = (root: ReactTestInstance): string[] | undefined =>
    root.findAll((node) => {
      const style = node.props?.style;
      if (!style) return false;
      const styles = Array.isArray(style) ? style.flat(Infinity).filter(Boolean) : [style];
      return styles.some(
        (s: { position?: string; height?: number; top?: number } | null) =>
          s && s.position === "absolute" && s.height === 3 && s.top === 0,
      );
    })[0]?.props?.colors;

  it.each(STYLE_NAMES)("draws the stripe in %s's own accent", (style) => {
    useStyleStore.setState({ style, hydrated: true });
    const { UNSAFE_root } = render(
      <PillarCard letter="A" title="Act" kicker="Action" description="..." />,
    );

    // Scheme-agnostic, like the assertion it replaces: the test does not pin
    // which appearance the renderer chose, only that the stripe carries THIS
    // palette's accent hue in one of them.
    const degrees = (["light", "dark"] as const).map(
      (scheme) => THEME_TOKENS[style][scheme]["--primary"].split(" ")[0],
    );

    for (const stop of stripeOf(UNSAFE_root) ?? []) {
      expect(degrees.some((d) => stop.startsWith(`hsla(${d},`))).toBe(true);
    }
  });

  // Discrimination: two palettes with different accents must not paint the same
  // stripe. Without this the per-style assertion could pass on a constant that
  // merely happened to start with the right number.
  it("paints a different stripe for a different palette", () => {
    // Unmounted before the style changes: a store update with the card still
    // mounted is an un-acted React update, and this suite treats console.error
    // as a failure.
    useStyleStore.setState({ style: "quiet-lilac", hydrated: true });
    const first = render(<PillarCard letter="A" title="Act" kicker="Action" description="..." />);
    const lilac = stripeOf(first.UNSAFE_root);
    first.unmount();

    useStyleStore.setState({ style: "amber-noir", hydrated: true });
    const second = render(<PillarCard letter="A" title="Act" kicker="Action" description="..." />);
    const amber = stripeOf(second.UNSAFE_root);
    second.unmount();

    expect(amber).not.toEqual(lilac);
  });

  // And it must still not be a module hue - the original ruling.
  it("draws no module hue", () => {
    useStyleStore.setState({ style: DEFAULT_STYLE, hydrated: true });
    const stripe = stripeOf(
      render(<PillarCard letter="A" title="Act" kicker="Action" description="..." />).UNSAFE_root,
    );

    for (const hue of ["act", "think", "be"] as const) {
      expect([tintStripeColors(hue, false), tintStripeColors(hue, true)]).not.toContainEqual(
        stripe,
      );
    }
  });
});

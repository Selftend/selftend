import { fireEvent, render } from "@testing-library/react-native";

import { PillarCard } from "./pillar-card";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

describe("PillarCard", () => {
  it("renders header with letter + title + kicker + description", () => {
    const { getByText } = render(
      <PillarCard
        tint="think"
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
        tint="think"
        letter="T"
        title="Think"
        kicker="Cognitive"
        description="…"
        onToolPress={onToolPress}
      >
        <PillarCard.Tool toolKey="thoughts" icon="article" name="Thought Records" desc="d" />
      </PillarCard>,
    );
    fireEvent.press(getByRole("button"));
    expect(onToolPress).toHaveBeenCalledWith("thoughts");
  });

  it("renders a top gradient stripe for the pillar color", () => {
    const { UNSAFE_root } = render(
      <PillarCard tint="act" letter="A" title="Act" kicker="Action" description="…" />,
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
});

import { fireEvent, render } from "@testing-library/react-native";

import { PillarCard } from "./pillar-card";

describe("PillarCard", () => {
  it("renders header with letter + title + kicker + description", () => {
    const { getByText, toJSON } = render(
      <PillarCard
        tint="think"
        letter="T"
        title="Think"
        kicker="Cognitive"
        description="Examine the thoughts and beliefs under your reactions."
      />,
    );
    expect(getByText("T")).toBeTruthy();
    expect(getByText("Think")).toBeTruthy();
    expect(getByText(/Cognitive/)).toBeTruthy();
    expect(getByText(/thoughts and beliefs/)).toBeTruthy();
    expect(toJSON()).toMatchSnapshot("think-no-tools");
  });

  it("renders 4-tool grid", () => {
    const { toJSON } = render(
      <PillarCard tint="think" letter="T" title="Think" kicker="Cognitive" description="…">
        <PillarCard.Tool toolKey="t1" icon="article" name="Tool 1" desc="d1" />
        <PillarCard.Tool toolKey="t2" icon="anchor" name="Tool 2" desc="d2" />
        <PillarCard.Tool toolKey="t3" icon="psychology" name="Tool 3" desc="d3" />
        <PillarCard.Tool toolKey="t4" icon="menu-book" name="Tool 4" desc="d4" />
      </PillarCard>,
    );
    expect(toJSON()).toMatchSnapshot("think-4-tools");
  });

  it("renders 6-tool grid wrapping to 2 rows", () => {
    const { toJSON } = render(
      <PillarCard tint="act" letter="A" title="Act" kicker="Action" description="…">
        <PillarCard.Tool toolKey="a1" icon="gps-fixed" name="Goals" desc="d" />
        <PillarCard.Tool toolKey="a2" icon="explore" name="Values" desc="d" />
        <PillarCard.Tool toolKey="a3" icon="directions-run" name="Activities" desc="d" />
        <PillarCard.Tool toolKey="a4" icon="layers" name="Exposure" desc="d" />
        <PillarCard.Tool toolKey="a5" icon="hiking" name="Tasks" desc="d" />
        <PillarCard.Tool toolKey="a6" icon="local-fire-department" name="Anger" desc="d" />
      </PillarCard>,
    );
    expect(toJSON()).toMatchSnapshot("act-6-tools");
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
});

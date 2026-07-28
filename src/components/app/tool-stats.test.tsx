import { render } from "@testing-library/react-native";

import { ToolStats } from "@/src/components/app/tool-stats";

describe("ToolStats", () => {
  it("renders a value with its label", () => {
    const { getByText } = render(
      <ToolStats accentClassName="text-be" items={[{ value: "12", label: "entries" }]} />,
    );
    expect(getByText("12")).toBeTruthy();
    expect(getByText(/entries/)).toBeTruthy();
  });

  it("renders a value-only item (empty label) without throwing", () => {
    const { getByText } = render(
      <ToolStats accentClassName="text-be" items={[{ value: "6 practices", label: "" }]} />,
    );
    expect(getByText("6 practices")).toBeTruthy();
  });

  it("renders zeroed values in full (never hidden)", () => {
    const { getByText } = render(
      <ToolStats accentClassName="text-be" items={[{ value: "0", label: "entries" }]} />,
    );
    expect(getByText("0")).toBeTruthy();
  });

  it("renders the optional subline", () => {
    const { getByText } = render(
      <ToolStats
        accentClassName="text-be"
        items={[{ value: "1", label: "check-ins" }]}
        subline="LAST · 5/31/2026"
      />,
    );
    expect(getByText("LAST · 5/31/2026")).toBeTruthy();
  });

  it("renders the subline muted (calm) when sublineTone is 'muted'", () => {
    const { getByText } = render(
      <ToolStats
        accentClassName="text-be"
        items={[{ value: "0", label: "check-ins" }]}
        subline="No check-ins yet"
        sublineTone="muted"
      />,
    );
    const node = getByText("No check-ins yet");
    const className = node.props.className as string;
    expect(className).toContain("text-muted-foreground");
    expect(className).not.toContain("uppercase");
    expect(className).not.toContain("font-bold");
    expect(className).not.toContain("text-be");
  });

  it("renders the subline with the accent/uppercase treatment by default", () => {
    const { getByText } = render(
      <ToolStats
        accentClassName="text-be"
        items={[{ value: "1", label: "check-ins" }]}
        subline="LAST · 5/31/2026"
      />,
    );
    const node = getByText("LAST · 5/31/2026");
    const className = node.props.className as string;
    expect(className).toContain("uppercase");
    expect(className).toContain("font-bold");
    expect(className).toContain("text-be");
  });

  // The premise of the `inert` classification in test/accent-ink-call-sites.test.ts
  // (#412). Every ToolStats call site app-wide passes tone="onField", and that
  // branch paints white ink on the hue field without ever reading
  // accentClassName - so the raw `text-<hue>` those call sites pass is dead
  // string, and "fixing" it would be a silent no-op. If this branch is ever made
  // to honour the prop, this test fails and those call sites become real accent
  // text that has to be re-judged against the field gradient.
  it("ignores accentClassName entirely when tone is 'onField'", () => {
    const { getByText, queryAllByText, UNSAFE_root } = render(
      <ToolStats
        tone="onField"
        accentClassName="text-be"
        items={[{ value: "12", label: "entries" }]}
        subline="LAST · 5/31/2026"
      />,
    );

    expect(getByText("12")).toBeTruthy();
    expect(queryAllByText(/entries/).length).toBeGreaterThan(0);

    const withAccent = UNSAFE_root.findAll(
      (node) => typeof node.props?.className === "string",
    ).filter((node) => (node.props.className as string).includes("text-be"));
    expect(withAccent).toEqual([]);

    // ...and the value really is the white field treatment instead.
    expect(getByText("12").props.className as string).toContain("text-white");
  });

  it("renders the optional inspired-by credit", () => {
    const { getByText } = render(
      <ToolStats
        accentClassName="text-be"
        items={[{ value: "1", label: "check-ins" }]}
        credit="Inspired by Expressive Writing Research"
      />,
    );
    expect(getByText("Inspired by Expressive Writing Research")).toBeTruthy();
  });
});

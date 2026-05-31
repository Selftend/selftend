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

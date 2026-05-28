import { screen } from "@testing-library/react-native";

import { ToolHero } from "./tool-hero";
import { Text } from "@/src/components/react-native-reusables/text";
import { renderWithProviders } from "@/test/render-with-providers";

describe("ToolHero", () => {
  it("renders title as a visible heading (no longer opacity:0)", () => {
    renderWithProviders(<ToolHero hue="aqua" icon="air" title="Breathing exercises" />);
    const heading = screen.getByRole("heading", { name: "Breathing exercises" });
    expect(heading).toBeTruthy();
    // The title must NOT be visually-hidden. Old impl wrapped it with opacity:0.
    const styles = Array.isArray(heading.props.style)
      ? heading.props.style.flat(Infinity).filter(Boolean)
      : heading.props.style
        ? [heading.props.style]
        : [];
    for (const style of styles) {
      if (style && typeof style === "object") {
        expect(style.opacity).not.toBe(0);
      }
    }
  });

  it("renders module chip with the icon + module label", () => {
    renderWithProviders(
      <ToolHero
        hue="aqua"
        icon="air"
        title="Breathing exercises"
        moduleLabel="Breathing"
        tagline="Short guided patterns to calm your nervous system."
      />,
    );
    expect(screen.getByText("Breathing")).toBeTruthy();
    expect(screen.getByText(/Short guided patterns/)).toBeTruthy();
  });

  it("falls back to title for chip label when moduleLabel is not provided", () => {
    renderWithProviders(<ToolHero hue="aqua" icon="air" title="Breathing" />);
    // Two "Breathing" matches expected: the chip + the heading.
    expect(screen.getAllByText("Breathing").length).toBeGreaterThanOrEqual(2);
  });

  it("renders meta when provided", () => {
    renderWithProviders(
      <ToolHero hue="be" icon="mood" title="Check-in" meta={<Text>This week · 5 logs</Text>} />,
    );
    expect(screen.getByText("This week · 5 logs")).toBeTruthy();
  });
});

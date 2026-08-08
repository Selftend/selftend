import { screen } from "@testing-library/react-native";

import { Section } from "./section";
import { Text } from "@/src/components/react-native-reusables/text";
import { renderWithProviders } from "@/test/render-with-providers";

// `Section` ships with no consumer in the app (#733): the eight tool redesigns
// queued behind this slice are its callers. It is tested here so the shared
// shape is pinned before any of them leans on it.
describe("Section", () => {
  it("renders its children", () => {
    renderWithProviders(
      <Section>
        <Text>body</Text>
      </Section>,
    );

    expect(screen.getByText("body")).toBeTruthy();
  });

  it("renders the label as the design's uppercase eyebrow, not a heading scale", () => {
    renderWithProviders(
      <Section title="Mood trend">
        <Text>body</Text>
      </Section>,
    );

    const label = String(screen.getByText("Mood trend").props.className);

    expect(label).toContain("text-[11px]");
    expect(label).toContain("uppercase");
    expect(label).toContain("tracking-[0.1em]");
    expect(label).toContain("text-muted-foreground");
  });

  it("carries a top hairline by default", () => {
    renderWithProviders(
      <Section title="Mood trend">
        <Text>body</Text>
      </Section>,
    );

    expect(screen.getByTestId("section").props.className).toContain("border-t");
  });

  it("drops the hairline when ruled is false", () => {
    // For the first section under a header, where the rule would read as an
    // underline for the stats row rather than a divider.
    renderWithProviders(
      <Section title="Mood trend" ruled={false}>
        <Text>body</Text>
      </Section>,
    );

    expect(screen.getByTestId("section").props.className).not.toContain("border-t");
  });

  it("renders no label row at all when neither title nor action is given", () => {
    renderWithProviders(
      <Section>
        <Text>body</Text>
      </Section>,
    );

    expect(screen.queryByTestId("section-label-row")).toBeNull();
  });

  it("renders a trailing action beside the label", () => {
    renderWithProviders(
      <Section title="Mood trend" action={<Text>Show all</Text>}>
        <Text>body</Text>
      </Section>,
    );

    expect(screen.getByText("Show all")).toBeTruthy();
    expect(screen.getByText("Mood trend")).toBeTruthy();
  });

  it("renders an action with no title", () => {
    renderWithProviders(
      <Section action={<Text>Show all</Text>}>
        <Text>body</Text>
      </Section>,
    );

    expect(screen.getByTestId("section-label-row")).toBeTruthy();
    expect(screen.getByText("Show all")).toBeTruthy();
  });
});

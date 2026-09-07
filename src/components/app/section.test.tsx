import { screen } from "@testing-library/react-native";

import { Section } from "./section";
import { Text } from "@/src/components/react-native-reusables/text";
import { renderWithProviders } from "@/test/render-with-providers";

// `Section` shipped with no consumer (#733); the check-in overview is its first
// (#735), with the seven remaining tool redesigns behind it. The shared shape is
// pinned here so none of them has to rediscover it.
describe("Section", () => {
  it("renders its children", () => {
    renderWithProviders(
      <Section>
        <Text>body</Text>
      </Section>,
    );

    expect(screen.getByText("body")).toBeTruthy();
  });

  it("renders the label at the design's eyebrow scale, not a heading scale", () => {
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

  it("still exposes that label as a heading, quiet as it looks", () => {
    // The eyebrow is a visual decision, not a semantic one. The callers this
    // replaces were `variant="h3"`, and dropping the role would take every
    // section off the heading outline a screen-reader user navigates by (#735).
    renderWithProviders(
      <Section title="Mood trend">
        <Text>body</Text>
      </Section>,
    );

    const label = screen.getByRole("heading", { name: "Mood trend" });

    expect(label).toBeTruthy();
    expect(label.props["aria-level"]).toBe(3);
  });

  /**
   * The eyebrow's level is the caller's to pick, defaulting to 3 (#2142).
   *
   * `/faq` needs this same eyebrow at **level 2**: its group labels sit above
   * questions that are themselves level 3, and a level-3 label over level-3
   * questions is an outline running sideways rather than down.
   *
   * ⚠️ The DEFAULT is not re-asserted here. The case above already pins it, and
   * pins it harder - strict `toBe(3)`, no `Number()` coercion - so a second
   * default assertion would add nothing but a place for the two to disagree.
   * The default is what keeps every shipped call site still, so it is worth one
   * assertion, not two.
   *
   * ☠️ The level is read through `Number(...)` because `text.tsx`'s `ARIA_LEVEL`
   * map yields **strings** for its variants while `Section` passes a **number**.
   * On this component the number always wins - `text.tsx` spreads `{...props}`
   * last - which is why the default case above can be strict. The coercion here
   * is what keeps this case honest if `Section` ever renders its label through a
   * `variant` instead. Precedent: `act-home-screen.test.tsx`.
   */
  it("renders the label at the level the caller asks for", () => {
    renderWithProviders(
      <Section title="Your account" level={2}>
        <Text>body</Text>
      </Section>,
    );

    expect(Number(screen.getByRole("heading", { name: "Your account" }).props["aria-level"])).toBe(
      2,
    );
  });

  it("keeps the eyebrow styling at an overridden level", () => {
    // The level is semantic; the eyebrow is visual. Changing one must not move
    // the other, or `/faq`'s group labels would arrive as headings that look
    // like headings and stop reading as a quiet run of labels.
    renderWithProviders(
      <Section title="Your account" level={2}>
        <Text>body</Text>
      </Section>,
    );

    const label = String(screen.getByText("Your account").props.className);

    expect(label).toContain("text-[11px]");
    expect(label).toContain("font-semibold");
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

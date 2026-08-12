import { render, screen, fireEvent } from "@testing-library/react-native";

import { MeditationPracticesSection } from "./meditation-practices-section";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("MeditationPracticesSection", () => {
  it("lists every practice with its cards collapsed", () => {
    // The outer collapsible header is gone (#853): on its own screen the list
    // is the content, and the screen header names it once.
    render(<MeditationPracticesSection />);
    expect(screen.getByText("practices.breath-awareness.title")).toBeTruthy();
    expect(screen.queryByText("practices.sectionLabel")).toBeNull();
    // cards still collapsed: no instructions yet
    expect(screen.queryByText("practices.breath-awareness.shortDescription")).toBeNull();
  });

  it("expands a practice card on tap to show its info", () => {
    render(<MeditationPracticesSection />);
    fireEvent.press(screen.getByText("practices.loving-kindness.title"));
    expect(screen.getByText("practices.loving-kindness.shortDescription")).toBeTruthy();
  });

  it("pre-opens the card for a valid initialPractice", () => {
    render(<MeditationPracticesSection initialPractice="body-scan" />);
    expect(screen.getByText("practices.body-scan.shortDescription")).toBeTruthy();
  });

  it("ignores an unknown initialPractice and opens nothing", () => {
    render(<MeditationPracticesSection initialPractice="mindful-walking" />);
    expect(screen.queryByText("practices.body-scan.shortDescription")).toBeNull();
  });

  it("keeps its surfaces on theme tokens rather than hardcoding one", () => {
    render(<MeditationPracticesSection initialPractice="body-scan" />);

    // This used to render the section inside a fixture `iris` room and assert
    // it inherited the pour. Rooms are neutral now (#586), so there is no pour
    // to inherit and the wrapper would only be testing the fixture.
    //
    // What the assertion was really protecting survives and still matters, now
    // against the STYLE axis instead of the room: a surface hardcoded here
    // would silently opt out of every palette, not just every room.
    const card = screen
      .UNSAFE_getAllByProps({ "aria-expanded": true })
      .find((node) => String(node.props.className ?? "").includes("rounded-2xl"));

    expect(card).toBeTruthy();
    expect(card?.props.className).toContain("bg-card");
  });
});

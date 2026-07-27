import { render, screen, fireEvent } from "@testing-library/react-native";
import { View } from "react-native";

import { roomVariables } from "@/src/lib/module-room";

import { MeditationPracticesSection } from "./meditation-practices-section";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("MeditationPracticesSection", () => {
  it("is collapsed by default - header shown, no practice cards", () => {
    render(<MeditationPracticesSection />);
    expect(screen.getByText("practices.sectionLabel")).toBeTruthy();
    expect(screen.queryByText("practices.breath-awareness.title")).toBeNull();
  });

  it("reveals the practice cards when the section header is tapped", () => {
    render(<MeditationPracticesSection />);
    fireEvent.press(screen.getByText("practices.sectionLabel"));
    expect(screen.getByText("practices.breath-awareness.title")).toBeTruthy();
    // cards still collapsed: no instructions yet
    expect(screen.queryByText("practices.breath-awareness.shortDescription")).toBeNull();
  });

  it("expands a practice card on tap to show its info", () => {
    render(<MeditationPracticesSection />);
    fireEvent.press(screen.getByText("practices.sectionLabel"));
    fireEvent.press(screen.getByText("practices.loving-kindness.title"));
    expect(screen.getByText("practices.loving-kindness.shortDescription")).toBeTruthy();
  });

  it("pre-opens the section and card for a valid initialPractice", () => {
    render(<MeditationPracticesSection initialPractice="body-scan" />);
    expect(screen.getByText("practices.body-scan.shortDescription")).toBeTruthy();
  });

  it("ignores an unknown initialPractice and stays collapsed", () => {
    render(<MeditationPracticesSection initialPractice="mindful-walking" />);
    expect(screen.queryByText("practices.body-scan.title")).toBeNull();
  });

  it("joins the iris room it renders inside on the meditation home", () => {
    render(
      <View style={roomVariables("iris").light} testID="meditation-home-room">
        <MeditationPracticesSection initialPractice="body-scan" />
      </View>,
    );

    expect(screen.getByTestId("meditation-home-room").props.style).toEqual(
      roomVariables("iris").light,
    );
    // The practice cards are hand-rolled Pressables, deliberately left as they
    // are: they take the room only because they paint the `bg-card` token the
    // pour rewrites. A hardcoded surface here would sit out of the room.
    const cardClasses = screen
      .getAllByRole("button")
      .map((node) => (node.props.className as string | undefined) ?? "")
      .filter((className) => className.includes("rounded-2xl"));
    expect(cardClasses.length).toBeGreaterThan(0);
    for (const className of cardClasses) expect(className).toContain("bg-card");
  });
});

import { render, screen, fireEvent } from "@testing-library/react-native";
import { View } from "react-native";

import { expectRoomPour, roomPour } from "@/test/room-pour";

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

  it("re-pours with the iris room it renders inside on home", () => {
    render(
      <View testID="iris-room" style={roomPour("iris")}>
        <MeditationPracticesSection initialPractice="body-scan" />
      </View>,
    );

    // The section has no pour of its own - it inherits the room the meditation
    // home screen pours around it.
    expectRoomPour(screen.getByTestId("iris-room"), "iris");
    // And it re-pours for free only while its surfaces stay on the room's
    // tokens; a hardcoded surface here would silently opt out of every room.
    const card = screen
      .UNSAFE_getAllByProps({ "aria-expanded": true })
      .find((node) => String(node.props.className ?? "").includes("rounded-2xl"));
    expect(card).toBeTruthy();
    expect(card?.props.className).toContain("bg-card");
  });
});

import { render, screen, fireEvent } from "@testing-library/react-native";
import { View } from "react-native";

import { MeditationPracticesSection } from "./meditation-practices-section";
import { roomVariables } from "@/src/lib/module-room";

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

  it("re-pours with the iris room it renders inside", () => {
    render(
      <View testID="iris-room" style={roomVariables("iris").light}>
        <MeditationPracticesSection initialPractice="body-scan" />
      </View>,
    );

    // Positive room-pour assertion: the section owns no hue of its own, so the
    // pour on the meditation home root is what its cards paint against. They
    // reach iris only through room-owned surface tokens - a literal or a
    // hardcoded neutral here would leave grey boxes floating in the room.
    expect(screen.getByTestId("iris-room").props.style).toEqual(roomVariables("iris").light);
    const card = screen.getByRole("button", { name: /practices\.body-scan\.title/ });
    const className = card.props.className as string;
    expect(className).toContain("bg-card");
    expect(className).not.toMatch(/bg-(white|black|\[)/);
  });
});

import { screen } from "@testing-library/react-native";

import { GroundingOnboarding } from "./grounding-onboarding-modal";
import { renderWithProviders } from "@/test/render-with-providers";

// #1996: the cold-water caution rides the onboarding's technique line too, so
// the first place a person reads about the technique already carries it —
// inline under the description, no acknowledgement, nothing stored.
describe("GroundingOnboarding", () => {
  it("carries the cold-water caution under its technique line", () => {
    renderWithProviders(
      <GroundingOnboarding visible onComplete={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(screen.getByText("Cold water")).toBeTruthy();
    expect(
      screen.getByText(
        "Wrists or face in cold water for 30 seconds interrupts the stress response.",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("technique-caution")).toBeTruthy();
    expect(screen.getByText(/^Cool tap water, not ice on skin\./)).toBeTruthy();
    expect(screen.getByText(/check with a doctor first\.$/)).toBeTruthy();
  });

  it("keeps the caution to the cold-water line only", () => {
    renderWithProviders(
      <GroundingOnboarding visible onComplete={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(screen.getAllByTestId("technique-caution")).toHaveLength(1);
  });
});

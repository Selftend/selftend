import { screen } from "@testing-library/react-native";

import { HowItWorksSection } from "./how-it-works-section";
import { renderWithProviders } from "@/test/render-with-providers";

describe("HowItWorksSection", () => {
  it("renders the section heading", () => {
    renderWithProviders(<HowItWorksSection />);

    expect(screen.getByRole("heading", { name: "How it works" })).toBeTruthy();
  });

  it("renders the three steps in order", () => {
    renderWithProviders(<HowItWorksSection />);

    expect(screen.getByText("Start where you are")).toBeTruthy();
    expect(screen.getByText("Go at your own pace")).toBeTruthy();
    expect(screen.getByText("Review quietly")).toBeTruthy();
  });
});

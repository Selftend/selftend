import { screen } from "@testing-library/react-native";

import { HelpKindsSection } from "./help-kinds-section";
import { renderWithProviders } from "@/test/render-with-providers";

describe("HelpKindsSection", () => {
  it("renders the section heading", () => {
    renderWithProviders(<HelpKindsSection />);

    expect(screen.getByRole("heading", { name: "Two kinds of help, one place" })).toBeTruthy();
  });

  it("renders the guided modules card", () => {
    renderWithProviders(<HelpKindsSection />);

    expect(screen.getByRole("heading", { name: "Guided modules" })).toBeTruthy();
    expect(screen.getByText(/Structured programs based on established approaches/)).toBeTruthy();
  });

  it("renders the everyday tools card", () => {
    renderWithProviders(<HelpKindsSection />);

    expect(screen.getByRole("heading", { name: "Everyday tools" })).toBeTruthy();
    expect(screen.getByText(/Quick utilities you reach for day to day/)).toBeTruthy();
  });
});

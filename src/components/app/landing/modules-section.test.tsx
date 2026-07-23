import { screen } from "@testing-library/react-native";

import { ModulesSection } from "./modules-section";
import { renderWithProviders } from "@/test/render-with-providers";

describe("ModulesSection", () => {
  it("renders the CBT module card", () => {
    renderWithProviders(<ModulesSection />);

    expect(screen.getByText("CBT module")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Examine unhelpful thoughts" })).toBeTruthy();
  });

  it("renders the ACT module card", () => {
    renderWithProviders(<ModulesSection />);

    expect(screen.getByText("ACT module")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Act on your values" })).toBeTruthy();
  });
});

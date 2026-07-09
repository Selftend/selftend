import { screen } from "@testing-library/react-native";
import { Image } from "react-native";

import { PreviewSection } from "./preview-section";
import { renderWithProviders } from "@/test/render-with-providers";

describe("PreviewSection", () => {
  it("renders the section heading", () => {
    renderWithProviders(<PreviewSection />);

    expect(screen.getByRole("heading", { name: "A calm, uncluttered space" })).toBeTruthy();
  });

  it("renders each preview image with a non-empty accessibility label", () => {
    renderWithProviders(<PreviewSection />);

    const images = screen.UNSAFE_getAllByType(Image);
    expect(images.length).toBe(3);
    for (const image of images) {
      const label = image.props.accessibilityLabel;
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

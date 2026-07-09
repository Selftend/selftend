import { fireEvent, screen } from "@testing-library/react-native";
import { Image } from "react-native";

import { PreviewSection } from "./preview-section";
import { renderWithProviders } from "@/test/render-with-providers";

describe("PreviewSection", () => {
  it("renders the section heading", () => {
    renderWithProviders(<PreviewSection />);

    expect(screen.getByRole("heading", { name: "A calm, uncluttered space" })).toBeTruthy();
  });

  it("shows one screenshot at a time with a non-empty accessibility label", () => {
    renderWithProviders(<PreviewSection />);

    const images = screen.UNSAFE_getAllByType(Image);
    expect(images.length).toBe(1);
    const label = images[0].props.accessibilityLabel;
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("navigates with next/previous and disables the arrows at the ends", () => {
    renderWithProviders(<PreviewSection />);

    const prev = screen.getByLabelText("Previous screenshot");
    const next = screen.getByLabelText("Next screenshot");

    // At the first slide, previous is disabled.
    expect(prev.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(next);
    fireEvent.press(next);

    // At the last slide, next is disabled and the third screenshot shows.
    expect(screen.getByLabelText("Next screenshot").props.accessibilityState?.disabled).toBe(true);
    const image = screen.UNSAFE_getAllByType(Image)[0];
    expect(image.props.accessibilityLabel).toBe("Screenshot of the mood check-in screen.");
  });

  it("jumps directly to a slide via its dot", () => {
    renderWithProviders(<PreviewSection />);

    fireEvent.press(screen.getByLabelText("Show screenshot 2 of 3"));

    const image = screen.UNSAFE_getAllByType(Image)[0];
    expect(image.props.accessibilityLabel).toBe(
      "Screenshot of a thought record step, walking through examining a thought.",
    );
  });
});

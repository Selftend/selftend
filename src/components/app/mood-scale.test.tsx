import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render-with-providers";
import { MoodScale } from "./mood-scale";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

describe("MoodScale", () => {
  it("renders 5 emoji radios with a11y labels (no visible word labels)", () => {
    renderWithProviders(<MoodScale value={null} onChange={() => {}} />);
    expect(screen.getByLabelText("Awful")).toBeTruthy();
    expect(screen.getByLabelText("Great")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("exposes the scale as a labelled radiogroup", () => {
    renderWithProviders(<MoodScale value={null} onChange={() => {}} />);
    // byRole skips plain Views (not accessibility elements), so assert the
    // container's group semantics through its label instead.
    const group = screen.getByLabelText("How are you feeling?");
    expect(group.props.accessibilityRole).toBe("radiogroup");
  });

  it("invokes onChange with the step value when pressed", () => {
    const onChange = jest.fn();
    renderWithProviders(<MoodScale value={null} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Great"));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("marks the selected step as checked in the a11y tree", () => {
    renderWithProviders(<MoodScale value={4} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Good" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Great" })).not.toBeChecked();
  });
});

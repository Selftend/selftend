import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render-with-providers";
import { MoodScale } from "./mood-scale";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

describe("MoodScale", () => {
  it("renders 5 emoji buttons with scale labels", () => {
    renderWithProviders(<MoodScale value={null} onChange={() => {}} />);
    expect(screen.getByText("Awful")).toBeTruthy();
    expect(screen.getByText("Great")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("invokes onChange with the step value when pressed", () => {
    const onChange = jest.fn();
    renderWithProviders(<MoodScale value={null} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Great"));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("marks the selected step in the a11y tree", () => {
    renderWithProviders(<MoodScale value={4} onChange={() => {}} />);
    const selected = screen.getByLabelText("Good");
    expect(selected.props.accessibilityState).toMatchObject({ selected: true });
  });
});

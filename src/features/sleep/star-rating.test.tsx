import { fireEvent, screen } from "@testing-library/react-native";

import { StarRating } from "@/src/features/sleep/star-rating";
import { renderWithProviders } from "@/test/render-with-providers";

describe("StarRating", () => {
  it("renders one button per star", () => {
    renderWithProviders(<StarRating value={null} onChange={() => {}} />);
    expect(screen.getByLabelText("Rate 1 of 5")).toBeTruthy();
    expect(screen.getByLabelText("Rate 5 of 5")).toBeTruthy();
  });

  it("calls onChange with the tapped star value", () => {
    const onChange = jest.fn();
    renderWithProviders(<StarRating value={null} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Rate 3 of 5"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("echoes the selected value as n/max", () => {
    renderWithProviders(<StarRating value={3} onChange={() => {}} />);
    expect(screen.getByText("3/5")).toBeTruthy();
  });

  it("shows no value line before a selection", () => {
    renderWithProviders(<StarRating value={null} onChange={() => {}} />);
    expect(screen.queryByText(/\/5$/)).toBeNull();
  });

  it("exposes the stars as radios in a labelled radiogroup", () => {
    renderWithProviders(<StarRating value={3} onChange={() => {}} />);
    // byRole skips plain Views (not accessibility elements), so assert the
    // container's group semantics through its label instead.
    expect(screen.getByLabelText("Sleep quality").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Rate 3 of 5" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Rate 2 of 5" })).not.toBeChecked();
  });
});

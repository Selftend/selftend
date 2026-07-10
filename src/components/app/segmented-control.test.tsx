import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render-with-providers";
import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

describe("SegmentedControl", () => {
  it("renders the options as tabs in a tablist with the active one selected", () => {
    renderWithProviders(<SegmentedControl options={options} value="month" onChange={() => {}} />);

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Month" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Week" })).not.toBeSelected();
  });

  it("invokes onChange with the tapped option value", () => {
    const onChange = jest.fn();
    renderWithProviders(<SegmentedControl options={options} value="week" onChange={onChange} />);

    fireEvent.press(screen.getByRole("tab", { name: "Month" }));
    expect(onChange).toHaveBeenCalledWith("month");
  });
});

import { fireEvent, screen } from "@testing-library/react-native";

import { DurationStepper } from "@/src/features/sleep/duration-stepper";
import { renderWithProviders } from "@/test/render-with-providers";

describe("DurationStepper", () => {
  it("formats the current value", () => {
    renderWithProviders(<DurationStepper value={450} onChange={() => {}} />);
    expect(screen.getByText("7h 30m")).toBeTruthy();
  });

  it("adds 30 minutes on +", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationStepper value={450} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Add 30 minutes"));
    expect(onChange).toHaveBeenCalledWith(480);
  });

  it("subtracts 30 minutes on -", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationStepper value={450} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Subtract 30 minutes"));
    expect(onChange).toHaveBeenCalledWith(420);
  });

  it("disables - at the minimum and ignores presses", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationStepper value={30} min={30} onChange={onChange} />);
    const decrease = screen.getByLabelText("Subtract 30 minutes");
    expect(decrease).toBeDisabled();
    fireEvent.press(decrease);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables + at the maximum and ignores presses", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationStepper value={840} max={840} onChange={onChange} />);
    const increase = screen.getByLabelText("Add 30 minutes");
    expect(increase).toBeDisabled();
    fireEvent.press(increase);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps both buttons enabled between the bounds", () => {
    renderWithProviders(<DurationStepper value={450} onChange={() => {}} />);
    expect(screen.getByLabelText("Subtract 30 minutes")).not.toBeDisabled();
    expect(screen.getByLabelText("Add 30 minutes")).not.toBeDisabled();
  });
});

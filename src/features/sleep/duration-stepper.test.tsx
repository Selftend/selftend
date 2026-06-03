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

  it("clamps at the minimum", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationStepper value={30} min={30} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Subtract 30 minutes"));
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it("clamps at the maximum", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationStepper value={840} max={840} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText("Add 30 minutes"));
    expect(onChange).toHaveBeenCalledWith(840);
  });
});

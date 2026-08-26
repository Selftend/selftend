import { fireEvent, screen } from "@testing-library/react-native";

import {
  DurationSlider,
  MAX_SIT_MINUTES,
  MIN_SIT_MINUTES,
  fractionFromMinutes,
  minutesFromFraction,
} from "@/src/features/meditation/duration-slider";
import { renderWithProviders } from "@/test/render-with-providers";

describe("minute mapping", () => {
  it("round-trips every whole minute in range", () => {
    for (let m = MIN_SIT_MINUTES; m <= MAX_SIT_MINUTES; m++) {
      expect(minutesFromFraction(fractionFromMinutes(m))).toBe(m);
    }
  });

  it("clamps track positions outside the range to its ends", () => {
    // A drag can overshoot the track; the value must not follow it out.
    expect(minutesFromFraction(-0.2)).toBe(MIN_SIT_MINUTES);
    expect(minutesFromFraction(1.2)).toBe(MAX_SIT_MINUTES);
  });
});

describe("DurationSlider", () => {
  it("announces minutes, not percent, on the adjustable node", () => {
    renderWithProviders(<DurationSlider value={12} onChange={() => {}} />);

    // The default VolumeSlider announcement is 0-100 percent; a 12-minute sit
    // read as "10 percent" would be nonsense, so the minutes scale rides in.
    expect(screen.getByLabelText("Length").props.accessibilityValue).toEqual({
      min: MIN_SIT_MINUTES,
      max: MAX_SIT_MINUTES,
      now: 12,
      text: "12 min",
    });
    expect(screen.getByText("12 min")).toBeTruthy();
  });

  it("steps one whole minute per tap, either way", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationSlider value={12} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("One minute more"));
    expect(onChange).toHaveBeenLastCalledWith(13);

    fireEvent.press(screen.getByLabelText("One minute less"));
    expect(onChange).toHaveBeenLastCalledWith(11);
  });

  it("treats a stepper press as both the change and its settling", () => {
    // A drag emits once per whole minute it crosses, so the persisting caller
    // listens on commit rather than change (#1190). A tap has no travel - it
    // must commit on the spot, or a user who only ever steps never saves.
    const onChange = jest.fn();
    const onCommit = jest.fn();
    renderWithProviders(<DurationSlider value={12} onChange={onChange} onCommit={onCommit} />);

    fireEvent.press(screen.getByLabelText("One minute more"));

    expect(onChange).toHaveBeenLastCalledWith(13);
    expect(onCommit).toHaveBeenLastCalledWith(13);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("commits nothing from a stepper the range has disabled", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <DurationSlider value={MAX_SIT_MINUTES} onChange={() => {}} onCommit={onCommit} />,
    );

    fireEvent.press(screen.getByLabelText("One minute more"));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("disables the stepper that would leave the range", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationSlider value={MIN_SIT_MINUTES} onChange={onChange} />);

    const less = screen.getByLabelText("One minute less");
    expect(less.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(less);
    expect(onChange).not.toHaveBeenCalled();
    // The other direction stays live at the bound.
    expect(screen.getByLabelText("One minute more").props.accessibilityState?.disabled).toBeFalsy();
  });

  it("disables the plus stepper at the top of the range", () => {
    const onChange = jest.fn();
    renderWithProviders(<DurationSlider value={MAX_SIT_MINUTES} onChange={onChange} />);

    const more = screen.getByLabelText("One minute more");
    expect(more.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(more);
    expect(onChange).not.toHaveBeenCalled();
  });
});

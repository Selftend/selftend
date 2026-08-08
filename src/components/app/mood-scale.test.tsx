import { act, fireEvent, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { renderWithProviders } from "@/test/render-with-providers";
import { MoodScale } from "./mood-scale";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: jest.fn(() => false),
}));

const mockUseReduceMotionEnabled = useReduceMotionEnabled as jest.MockedFunction<
  typeof useReduceMotionEnabled
>;

/** The resolved scale on the `Animated.View` wrapping the glyph for `score` (1-5). */
function scaleOfStep(score: number) {
  const glyph = screen.getAllByTestId("mood-glyph")[score - 1];
  return glyph.props.style.transform[0].scale as number;
}

describe("MoodScale", () => {
  beforeEach(() => {
    mockUseReduceMotionEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

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

  /**
   * The one surviving animation (#740, decided on #716). It is decorative: selection is
   * already confirmed by border weight, border hue, gradient fill and `aria-checked`, so
   * reduced motion drops it outright rather than substituting something else.
   */
  describe("the selected glyph", () => {
    it("scales the glyph, not the pressable - the flex-1 row must not reflow", () => {
      renderWithProviders(<MoodScale value={5} onChange={() => {}} />);

      // The transform lives on the wrapper around the emoji, inside the Pressable.
      expect(scaleOfStep(5)).toBeGreaterThan(1);
      const pressable = screen.getByRole("radio", { name: "Great" });
      expect(pressable.props.style?.transform).toBeUndefined();
    });

    it("starts at its target rather than animating a hydrated score on mount", () => {
      const timing = jest.spyOn(Animated, "timing");
      renderWithProviders(<MoodScale value={5} onChange={() => {}} />);

      // 46/38 - the design's selected form size over its resting size.
      expect(scaleOfStep(5)).toBeCloseTo(46 / 38);
      expect(scaleOfStep(3)).toBe(1);
      expect(timing).not.toHaveBeenCalled();
    });

    it("uses the compact ratio in compact mode", () => {
      renderWithProviders(<MoodScale value={5} onChange={() => {}} compact />);

      expect(scaleOfStep(5)).toBeCloseTo(40 / 34);
    });

    it("animates to the target without overshooting it", () => {
      jest.useFakeTimers();
      const timing = jest.spyOn(Animated, "timing");
      const spring = jest.spyOn(Animated, "spring");
      const { rerender } = renderWithProviders(<MoodScale value={null} onChange={() => {}} />);

      rerender(<MoodScale value={5} onChange={() => {}} />);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // A timing curve, never a spring: `overflow-hidden` on the pressable would clip
      // any peak above the target.
      expect(timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ toValue: 46 / 38, duration: 150 }),
      );
      expect(spring).not.toHaveBeenCalled();
      expect(scaleOfStep(5)).toBeLessThanOrEqual(46 / 38);
    });

    it("jumps straight to the target under reduced motion, with no substitute", () => {
      mockUseReduceMotionEnabled.mockReturnValue(true);
      const timing = jest.spyOn(Animated, "timing");
      const { rerender } = renderWithProviders(<MoodScale value={null} onChange={() => {}} />);

      rerender(<MoodScale value={5} onChange={() => {}} />);

      expect(timing).not.toHaveBeenCalled();
      expect(scaleOfStep(5)).toBeCloseTo(46 / 38);
      // The three non-moving confirmations still carry the selection.
      expect(screen.getByRole("radio", { name: "Great" })).toBeChecked();
    });
  });
});

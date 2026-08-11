import { fireEvent } from "@testing-library/react-native";

import { GroundingSession } from "@/src/features/grounding/grounding-session";
import { groundingLookup } from "@/src/constants/grounding";
import { renderWithProviders } from "@/test/render-with-providers";

const baseProps = {
  technique: groundingLookup["54321"],
  techniqueTitle: "5-4-3-2-1",
  stepText: "Find five things you can see.",
  stepLabel: "Sight",
  stepHint: "Out loud or in your head — small things count.",
  stepIndex: 0,
  total: 5,
  isLast: false,
  onNext: jest.fn(),
  onBack: jest.fn(),
  onStepSelect: jest.fn(),
};

describe("GroundingSession", () => {
  it("renders the step counter, prompt, hint line, and advances", () => {
    const onNext = jest.fn();
    const { getByText } = renderWithProviders(<GroundingSession {...baseProps} onNext={onNext} />);
    expect(getByText("Sight · 1 of 5")).toBeTruthy();
    expect(getByText("Find five things you can see.")).toBeTruthy();
    // The hint line under the prompt (design 5b + #783's AC), missing in the
    // pre-shell build (#874).
    expect(getByText("Out loud or in your head — small things count.")).toBeTruthy();
    fireEvent.press(getByText("Next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  /**
   * #874: on the shell there is no close glyph — the OS/web back action is the
   * only uninvited exit, answered by the flow's beforeRemove dialog. The top
   * row reads `1 of 5`, the design's wording, not `1 / 5`.
   */
  it("renders the shell top row with the technique eyebrow and '1 of 5', no close glyph", () => {
    const { getByText, queryByLabelText } = renderWithProviders(
      <GroundingSession {...baseProps} />,
    );
    expect(getByText("5-4-3-2-1")).toBeTruthy();
    expect(getByText("1 of 5")).toBeTruthy();
    expect(queryByLabelText("Close")).toBeNull();
  });

  it("renders the focus wash — the shell surface breathing and meditation share", () => {
    const { getByTestId } = renderWithProviders(<GroundingSession {...baseProps} />);
    expect(getByTestId("focus-surface-wash", { includeHiddenElements: true })).toBeTruthy();
  });

  it("keeps the caption verbatim beside a normal Next button, not a full-bleed bar", () => {
    const { getByText } = renderWithProviders(<GroundingSession {...baseProps} />);
    expect(getByText("Take as long as you need.")).toBeTruthy();
    expect(getByText("Back")).toBeTruthy();
    expect(getByText("Next")).toBeTruthy();
  });

  it("shows Finish on the last step", () => {
    const { getByText } = renderWithProviders(
      <GroundingSession
        {...baseProps}
        stepText="Notice one thing you can taste."
        stepLabel="Taste"
        stepHint=""
        stepIndex={4}
        isLast
      />,
    );
    expect(getByText("Finish")).toBeTruthy();
  });
});

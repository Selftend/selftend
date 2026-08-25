import { fireEvent } from "@testing-library/react-native";

import { GroundingSession } from "@/src/features/grounding/grounding-session";
import { groundingLookup } from "@/src/constants/grounding";
import { renderWithProviders } from "@/test/render-with-providers";

// The shell now hosts the Escape (#1256), which reads the trail off the live
// pathname; the route-level announcement is asserted end to end in
// focus-session-shell.test.tsx, so a stub path is enough here.
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/tools/grounding/54321",
}));

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
  onFinishEarly: jest.fn(),
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
   * The shell's Escape (#1256) wears the arrow, never the close glyph - a
   * session is not a create/edit form - and the inline "Finish early" ghost
   * button (#928) stays as the invited way out beside it. The top row reads
   * `1 of 5`, the design's wording, not `1 / 5`.
   */
  it("renders the shell top row, the Escape, and the inline Finish early exit", () => {
    const onFinishEarly = jest.fn();
    const { getByText, getByTestId, queryByLabelText } = renderWithProviders(
      <GroundingSession {...baseProps} onFinishEarly={onFinishEarly} />,
    );
    expect(getByText("5-4-3-2-1")).toBeTruthy();
    expect(getByText("1 of 5")).toBeTruthy();
    expect(getByTestId("screen-escape")).toBeTruthy();
    expect(queryByLabelText("Close")).toBeNull();
    fireEvent.press(getByText("Finish early"));
    expect(onFinishEarly).toHaveBeenCalledTimes(1);
  });

  it("disables the Finish early exit while a save is in flight", () => {
    const onFinishEarly = jest.fn();
    const { getByText } = renderWithProviders(
      <GroundingSession {...baseProps} onFinishEarly={onFinishEarly} saving />,
    );
    fireEvent.press(getByText("Finish early"));
    expect(onFinishEarly).not.toHaveBeenCalled();
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

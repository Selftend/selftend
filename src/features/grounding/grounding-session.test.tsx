import { fireEvent } from "@testing-library/react-native";

import { GroundingSession } from "@/src/features/grounding/grounding-session";
import { groundingLookup } from "@/src/constants/grounding";
import { renderWithProviders } from "@/test/render-with-providers";

describe("GroundingSession", () => {
  it("renders the step counter, text, and advances", () => {
    const onNext = jest.fn();
    const onExit = jest.fn();
    const { getByText } = renderWithProviders(
      <GroundingSession
        technique={groundingLookup["54321"]}
        techniqueTitle="5-4-3-2-1"
        stepText="Find five things you can see."
        stepLabel="Sight"
        stepIndex={0}
        total={5}
        isLast={false}
        onNext={onNext}
        onBack={jest.fn()}
        onStepSelect={jest.fn()}
        onExit={onExit}
      />,
    );
    expect(getByText("Sight · 1 of 5")).toBeTruthy();
    expect(getByText("Find five things you can see.")).toBeTruthy();
    fireEvent.press(getByText("Next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("fires onExit when the close button is pressed", () => {
    const onExit = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <GroundingSession
        technique={groundingLookup["54321"]}
        techniqueTitle="5-4-3-2-1"
        stepText="Find five things you can see."
        stepLabel="Sight"
        stepIndex={0}
        total={5}
        isLast={false}
        onNext={jest.fn()}
        onBack={jest.fn()}
        onStepSelect={jest.fn()}
        onExit={onExit}
      />,
    );
    fireEvent.press(getByLabelText("Close"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("shows Finish on the last step", () => {
    const { getByText } = renderWithProviders(
      <GroundingSession
        technique={groundingLookup["54321"]}
        techniqueTitle="5-4-3-2-1"
        stepText="Notice one thing you can taste."
        stepLabel="Taste"
        stepIndex={4}
        total={5}
        isLast
        onNext={jest.fn()}
        onBack={jest.fn()}
        onStepSelect={jest.fn()}
        onExit={jest.fn()}
      />,
    );
    expect(getByText("Finish")).toBeTruthy();
  });
});

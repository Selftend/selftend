import { fireEvent, screen } from "@testing-library/react-native";

import { WizardScreen } from "@/src/components/app/wizard-screen";
import { Text } from "@/src/components/react-native-reusables/text";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUseWindowDimensions = jest.fn();

// Partial mock via Proxy (mirrors app-onboarding-wizard.test.tsx): spreading
// `{...actual}` would eagerly evaluate every lazy getter React Native's module
// defines and can blow up in the test environment, so only intercept the one
// export this suite needs to control.
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "useWindowDimensions") {
        return mockUseWindowDimensions;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

const NARROW_WIDTH = { width: 390, height: 844, scale: 3, fontScale: 1 };
const WIDE_WIDTH = { width: 1024, height: 768, scale: 1, fontScale: 1 };

const steps = [
  { title: "Situation" },
  { title: "Thoughts" },
  { title: "Emotions" },
  { title: "Outcome" },
];

function renderWizard(stepIndex = 1) {
  return renderWithProviders(
    <WizardScreen
      title="New thought record"
      steps={steps}
      stepIndex={stepIndex}
      numberedSteps
      onJumpToStep={jest.fn()}
      onBack={jest.fn()}
      onPrimary={jest.fn()}
      primaryLabel="Continue"
      pendingLabel="Saving..."
      backLabel="Back"
      isPending={false}
    >
      <Text>Form content</Text>
    </WizardScreen>,
  );
}

describe("WizardScreen step indicator", () => {
  beforeEach(() => {
    mockUseWindowDimensions.mockReturnValue(WIDE_WIDTH);
  });

  it("collapses to a single summary row on narrow screens", () => {
    mockUseWindowDimensions.mockReturnValue(NARROW_WIDTH);
    renderWizard(1);

    expect(screen.getByText("Step 2 of 4 · Thoughts")).toBeTruthy();

    // Step pills are not rendered while collapsed.
    expect(screen.queryByText("1. Situation")).toBeNull();
    expect(screen.queryByText("2. Thoughts")).toBeNull();
    expect(screen.queryByText("3. Emotions")).toBeNull();
    expect(screen.queryByText("4. Outcome")).toBeNull();
  });

  it("expands to the full step list on tap and keeps onJumpToStep working", () => {
    mockUseWindowDimensions.mockReturnValue(NARROW_WIDTH);
    const onJumpToStep = jest.fn();
    renderWithProviders(
      <WizardScreen
        title="New thought record"
        steps={steps}
        stepIndex={1}
        numberedSteps
        onJumpToStep={onJumpToStep}
        onBack={jest.fn()}
        onPrimary={jest.fn()}
        primaryLabel="Continue"
        pendingLabel="Saving..."
        backLabel="Back"
        isPending={false}
      >
        <Text>Form content</Text>
      </WizardScreen>,
    );

    fireEvent.press(screen.getByLabelText(/Show all steps/));

    expect(screen.getByText("1. Situation")).toBeTruthy();
    expect(screen.getByText("2. Thoughts")).toBeTruthy();
    expect(screen.getByText("3. Emotions")).toBeTruthy();
    expect(screen.getByText("4. Outcome")).toBeTruthy();

    fireEvent.press(screen.getByText("1. Situation"));
    expect(onJumpToStep).toHaveBeenCalledWith(0);

    // Toggle now offers to collapse again.
    expect(screen.getByLabelText(/Hide steps/)).toBeTruthy();
  });

  it("shows the full step list on wide screens with no toggle", () => {
    mockUseWindowDimensions.mockReturnValue(WIDE_WIDTH);
    renderWizard(1);

    expect(screen.getByText("1. Situation")).toBeTruthy();
    expect(screen.getByText("2. Thoughts")).toBeTruthy();
    expect(screen.getByText("3. Emotions")).toBeTruthy();
    expect(screen.getByText("4. Outcome")).toBeTruthy();

    expect(screen.queryByText("Step 2 of 4 · Thoughts")).toBeNull();
    expect(screen.queryByLabelText(/Show all steps/)).toBeNull();
  });

  it("offers an explicit draft discard action when the flow provides one", () => {
    const onDiscard = jest.fn();
    renderWithProviders(
      <WizardScreen
        title="New thought record"
        steps={steps}
        stepIndex={0}
        onJumpToStep={jest.fn()}
        onBack={jest.fn()}
        onPrimary={jest.fn()}
        primaryLabel="Continue"
        pendingLabel="Saving..."
        backLabel="Back"
        discardLabel="Discard draft"
        onDiscard={onDiscard}
        isPending={false}
      >
        <Text>Form content</Text>
      </WizardScreen>,
    );

    fireEvent.press(screen.getByText("Discard draft"));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});

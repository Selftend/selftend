import { fireEvent, screen } from "@testing-library/react-native";

import { AppOnboardingWizard } from "@/src/components/app/app-onboarding-wizard";
import { renderWithProviders } from "@/test/render-with-providers";

// RichOnboardingShell wraps content in a Modal. Replace Modal with a pass-through
// View so the wizard's children are always in the tree regardless of `visible`.
jest.mock("react-native", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  function MockModal({ children, visible }: { children?: React.ReactNode; visible?: boolean }) {
    return visible === false ? null : React.createElement(actual.View, null, children);
  }
  MockModal.displayName = "MockModal";

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "Modal") return MockModal;
      return Reflect.get(target, prop, receiver);
    },
  });
});

function renderWizard(overrides: Partial<React.ComponentProps<typeof AppOnboardingWizard>> = {}) {
  const onFinish = jest.fn();
  const onSkip = jest.fn();
  renderWithProviders(
    <AppOnboardingWizard
      visible
      initialConcerns={[]}
      isPending={false}
      onFinish={onFinish}
      onSkip={onSkip}
      {...overrides}
    />,
  );
  return { onFinish, onSkip };
}

it("shows the welcome panel without a step counter on first login", () => {
  renderWizard();
  expect(screen.getByText("Welcome to Selftend")).toBeTruthy();
  expect(screen.getByText(/not a diagnosis tool/i)).toBeTruthy();
  expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
});

it("advances through concerns and module choices and supports Back", () => {
  renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("What brings you here?")).toBeTruthy();
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("Would a self-help module be useful?")).toBeTruthy();
  fireEvent.press(screen.getByText("Back"));
  expect(screen.getByText("What brings you here?")).toBeTruthy();
});

it("defaults module structure to the guided programme", () => {
  renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("CBT - work with thoughts and behavior"));
  fireEvent.press(screen.getByText("Continue"));

  expect(
    screen.getByRole("checkbox", { name: "A guided programme" }).props.accessibilityState.checked,
  ).toBe(true);
  expect(
    screen.getByRole("checkbox", { name: "Explore at my own pace" }).props.accessibilityState
      .checked,
  ).toBe(false);
});

it("can replay only the welcome introduction without entering recommendations", () => {
  const onSkip = jest.fn();
  renderWithProviders(
    <AppOnboardingWizard
      visible
      introductionOnly
      initialConcerns={[]}
      isPending={false}
      onFinish={jest.fn()}
      onSkip={onSkip}
    />,
  );

  fireEvent.press(screen.getByText("Finish"));

  expect(onSkip).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("What brings you here?")).toBeNull();
});

it("skips guidance when no module is selected and applies tool suggestions", () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Continue"));

  expect(screen.getByText("Finish")).toBeTruthy();
  fireEvent.press(screen.getByText("Finish"));

  expect(screen.queryByText("How much structure would you like?")).toBeNull();
  expect(onFinish).toHaveBeenCalledWith({
    selectedConcerns: ["sleep"],
    widgetIds: ["mood-checkin", "sleep-latest", "meditation-pick", "breathing-suggested"],
  });
});

it("applies guided programme and tool recommendations without a review panel", () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Building habits"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("ACT - make room for feelings and act on values"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Finish"));

  expect(screen.queryByText("Your Home suggestions")).toBeNull();
  expect(onFinish).toHaveBeenCalledWith({
    selectedConcerns: ["sleep", "habits"],
    widgetIds: [
      "act-programme",
      "mood-checkin",
      "sleep-latest",
      "meditation-pick",
      "breathing-suggested",
      "habits-today",
      "journal-week",
    ],
  });
});

it("starts manual suggestions at the questions instead of the first-login welcome", () => {
  renderWizard({ includeWelcome: false });

  expect(screen.getByText("What brings you here?")).toBeTruthy();
  expect(screen.queryByText("Welcome to Selftend")).toBeNull();
  expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
});

it("prefills initial concerns and can skip from any panel", () => {
  const { onSkip, onFinish } = renderWizard({ initialConcerns: ["sleep"] });
  fireEvent.press(screen.getByText("Skip for now"));
  expect(onSkip).toHaveBeenCalled();
  expect(onFinish).not.toHaveBeenCalled();
});

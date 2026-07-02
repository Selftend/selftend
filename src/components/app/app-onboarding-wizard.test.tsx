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
      if (prop === "Modal") {
        return MockModal;
      }
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

it("shows the welcome panel with the disclaimer first", () => {
  renderWizard();
  expect(screen.getByText("Welcome to Selftend")).toBeTruthy();
  expect(screen.getByText(/not a diagnosis tool/i)).toBeTruthy();
});

it("advances to structure and concerns panels and supports Back", () => {
  renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("How Selftend is organized")).toBeTruthy();
  fireEvent.press(screen.getByText("Continue"));
  expect(screen.getByText("What brings you here?")).toBeTruthy();
  fireEvent.press(screen.getByText("Back"));
  expect(screen.getByText("How Selftend is organized")).toBeTruthy();
});

it("finishes with the picked concerns", () => {
  const { onFinish } = renderWizard();
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Continue"));
  fireEvent.press(screen.getByText("Sleep"));
  fireEvent.press(screen.getByText("Building habits"));
  fireEvent.press(screen.getByText("Finish"));
  expect(onFinish).toHaveBeenCalledWith(["sleep", "habits"]);
});

it("prefills initialConcerns and can skip from any panel", () => {
  const { onSkip, onFinish } = renderWizard({ initialConcerns: ["sleep"] });
  fireEvent.press(screen.getByText("Skip for now"));
  expect(onSkip).toHaveBeenCalled();
  expect(onFinish).not.toHaveBeenCalled();
});

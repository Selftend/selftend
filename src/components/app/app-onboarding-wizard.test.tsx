import { act, fireEvent, screen } from "@testing-library/react-native";
import { Modal } from "react-native";

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

let mockWizardUser: { id: string; is_anonymous?: boolean; email?: string } = {
  id: "user-1",
  email: "person@example.com",
};
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockWizardUser }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  // A registered user carries an email - that is what makes them registered,
  // and since #1896 it is what the invitation line reads.
  mockWizardUser = { id: "user-1", email: "person@example.com" };
});

function renderWizard(overrides: Partial<React.ComponentProps<typeof AppOnboardingWizard>> = {}) {
  const onFinish = jest.fn();
  const onSkip = jest.fn();
  renderWithProviders(
    <AppOnboardingWizard
      visible
      isPending={false}
      onFinish={onFinish}
      onSkip={onSkip}
      {...overrides}
    />,
  );
  return { onFinish, onSkip };
}

/**
 * #1958 (spec #1885 §5): the wizard is the welcome panel alone. The concerns,
 * modules, guidance and starter-routine panels are gone, so there is no
 * `Continue`, no `Back`, and no panel to step to - the one CTA finishes, the
 * pinned Escape skips, and both persist onboarding as done at the only call
 * site left (the protected-layout gate).
 */
it("renders the welcome panel as the whole wizard, with Finish as its only CTA", () => {
  const { onFinish } = renderWizard();

  expect(screen.getByText("Welcome to Selftend")).toBeTruthy();
  expect(screen.getByText(/not a diagnosis tool/i)).toBeTruthy();
  expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
  // Stated as a COUNT, not as the absence of "Continue"/"Back" - those strings
  // no longer exist in any locale, so a `queryByText(...).toBeNull()` on them
  // would pass forever, stepper or no stepper. Exactly two controls: the CTA
  // and the pinned Escape.
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Finish" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Skip for now" })).toBeTruthy();

  fireEvent.press(screen.getByText("Finish"));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

describe("the pinned Escape is the skip (#1258 M2, one call site since #1958)", () => {
  it("wears 'Skip for now' as its accessible name and skips, never finishes", () => {
    const { onSkip, onFinish } = renderWizard();

    const escape = screen.getByTestId("modal-escape");
    // The word is the accessible name too - announcing "Close" on a press
    // that persists a decision would disguise it one sense over.
    expect(escape.props.accessibilityLabel).toBe("Skip for now");
    fireEvent.press(escape);

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("carries the word once - the footer no longer duplicates it", () => {
    renderWizard();
    // Exactly one "Skip for now" - the pinned one. Two identical controls
    // would be two exits making the same promise (#1257's rule).
    expect(screen.getAllByText("Skip for now")).toHaveLength(1);
  });

  it("treats the system gesture as the same skip on the only panel (M4)", () => {
    const { onSkip } = renderWizard();

    // Hardware back / the web Escape key arrive as onRequestClose. With no
    // previous panel to step to, the dismiss falls through to the skip.
    const modal = screen.UNSAFE_getByType(Modal);
    act(() => {
      (modal.props as { onRequestClose: () => void }).onRequestClose();
    });

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("ignores both closes while the completion write is pending", () => {
    const { onSkip } = renderWizard({ isPending: true });

    fireEvent.press(screen.getByTestId("modal-escape"));
    const modal = screen.UNSAFE_getByType(Modal);
    act(() => {
      (modal.props as { onRequestClose: () => void }).onRequestClose();
    });

    expect(onSkip).not.toHaveBeenCalled();
  });
});

it("shows the save error the call site hands it", () => {
  renderWizard({ errorMessage: "Unable to save app onboarding." });
  expect(screen.getByText("Unable to save app onboarding.")).toBeTruthy();
});

// #1446: the wizard's half of the invitation to register - one calm
// informational line on the final panel, guests only. The other half is the
// settings card, and those two surfaces are the WHOLE invitation. With one
// panel, the final panel is the welcome.
describe("guest invitation line", () => {
  const LINE =
    "You're using Selftend as a guest - you can create an account any time from Settings to protect your data.";

  it("shows the line to a guest", () => {
    mockWizardUser = { id: "guest-1", is_anonymous: true };
    renderWizard();
    expect(screen.getByText(LINE)).toBeTruthy();
  });

  it("never shows the line to a registered user", () => {
    renderWizard();
    expect(screen.queryByText(LINE)).toBeNull();
  });
});

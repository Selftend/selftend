import { fireEvent, screen } from "@testing-library/react-native";
import { KeyboardAvoidingView, Modal } from "react-native";

import { MeditationInfo } from "@/src/components/app/meditation-info-modal";
import { renderWithProviders } from "@/test/render-with-providers";

function open(overrides: Partial<Parameters<typeof MeditationInfo>[0]> = {}) {
  const props = {
    visible: true,
    onComplete: jest.fn(),
    onDismiss: jest.fn(),
    ...overrides,
  };
  renderWithProviders(<MeditationInfo {...props} />);
  return props;
}

/**
 * The meditation Guide used to be a hand-rolled clone of `RichOnboardingShell`
 * — same wrapper, same scroll, same bottom button — minus the dialog's
 * accessible name and the keyboard avoidance. #1259 (W21/M6 on the escape
 * spec, #1167) folded it into the shell; these assertions pin exactly what the
 * fold bought, so a future "just inline it" cannot quietly lose either again.
 */
describe("MeditationInfo", () => {
  it("announces its title as the dialog's accessible name", () => {
    open();

    expect(screen.UNSAFE_getByType(Modal).props.accessibilityLabel).toBe(
      "The mind can be trained.",
    );
  });

  it("gets the shell's keyboard avoidance", () => {
    open();

    expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
  });

  it("hands the system close request the dismiss handler itself", () => {
    const props = open();

    // Identity, not just "a function": the old clone wrapped this in
    // `onDismiss ?? (() => undefined)` — dead defensive code that was once
    // misdiagnosed as swallowing Android hardware back. Asserting the handler
    // is the caller's own function keeps any such fallback from coming back.
    expect(screen.UNSAFE_getByType(Modal).props.onRequestClose).toBe(props.onDismiss);
  });

  it("closes on hardware back / the web Escape key", () => {
    const props = open();

    // react-native-web routes Escape to onRequestClose; native routes the
    // hardware back button to the same place.
    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses from the bottom CTA, as the clone always did", () => {
    const props = open();

    fireEvent.press(screen.getByText("Got it"));

    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it("dismisses from the pinned escape row", () => {
    const props = open();

    fireEvent.press(screen.getByTestId("modal-escape"));

    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("still renders the Guide's content", () => {
    open();

    expect(screen.getByText("The mind can be trained.")).toBeTruthy();
    expect(screen.getByText("Two modes of knowing")).toBeTruthy();
    expect(screen.getByText("Three things to know")).toBeTruthy();
  });
});

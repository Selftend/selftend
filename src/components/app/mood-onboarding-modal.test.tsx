import { fireEvent, screen } from "@testing-library/react-native";

import { MoodOnboarding } from "@/src/components/app/mood-onboarding-modal";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

function open(props: Partial<Parameters<typeof MoodOnboarding>[0]> = {}) {
  return renderWithProviders(
    <MoodOnboarding visible onComplete={props.onComplete ?? (() => {})} {...props} />,
  );
}

/**
 * The tour describes the overview, so it goes stale whenever the overview moves (#744).
 * These assertions exist so the next move fails CI rather than shipping a description of
 * a screen that no longer exists — the locale-parity tests only prove the strings are
 * present, not that anything renders them.
 */
describe("MoodOnboarding", () => {
  it("describes the three surfaces of the redesigned overview", () => {
    open();

    expect(screen.getByText("What you will see")).toBeTruthy();
    expect(screen.getByText("Your week")).toBeTruthy();
    expect(screen.getByText("Trend and spread")).toBeTruthy();
    expect(screen.getByText("All history")).toBeTruthy();
  });

  it("still explains how to log, because the form did not move", () => {
    open();

    expect(screen.getByText("How to log")).toBeTruthy();
    expect(screen.getByText("1-5 scale")).toBeTruthy();
    expect(screen.getByText("Emotion tags")).toBeTruthy();
    expect(screen.getByText("Notes")).toBeTruthy();
  });

  /**
   * The two retired panels described an inline history list and a fixed trailing week,
   * neither of which exists any more — and one of them claimed a physiological effect.
   */
  it("no longer claims a measurable effect on the stress response", () => {
    open();

    expect(screen.queryByText("Name it to tame it")).toBeNull();
    expect(screen.queryByText("Spot what moves the needle")).toBeNull();
    expect(screen.queryByText(/stress response/)).toBeNull();
  });

  it("makes no claim about what a blank day means", () => {
    open();

    expect(screen.queryByText(/drains you/)).toBeNull();
    expect(screen.queryByText(/nothing is broken/i)).toBeNull();
  });

  it("completes from the CTA", () => {
    const onComplete = jest.fn();
    open({ onComplete });

    fireEvent.press(screen.getByText("Got it"));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when it is not visible", () => {
    renderWithProviders(<MoodOnboarding visible={false} onComplete={() => {}} />);

    expect(screen.queryByText("What you will see")).toBeNull();
  });
});

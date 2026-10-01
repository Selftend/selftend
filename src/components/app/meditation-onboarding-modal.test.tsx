import { fireEvent, screen } from "@testing-library/react-native";

import { MeditationOnboarding } from "./meditation-onboarding-modal";
import { renderWithProviders } from "@/test/render-with-providers";

// W19/#1257: the wrapper's pinned Escape is this wizard's one close affordance
// on all five panels — the panel-1 ghost "Skip for now" it made redundant is
// gone, along with the gap it left on panels 2+ (which had no dismiss at all
// before the pinned row).
describe("MeditationOnboarding", () => {
  it("renders the pinned Escape as the only close control, and it dismisses", () => {
    const onDismiss = jest.fn();
    renderWithProviders(
      <MeditationOnboarding visible onComplete={jest.fn()} onDismiss={onDismiss} />,
    );

    const closes = screen.getAllByLabelText("Close");
    expect(closes).toHaveLength(1);
    expect(closes[0].props.testID).toBe("modal-escape");
    fireEvent.press(closes[0]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // #2879, completing #2860: the wizard teaches the framework - attention vs
  // awareness, the gardener's mindset, the stage self-assessment - so its
  // first panel names the framework's book, exactly as the habits wizard names
  // Atomic Habits beside its welcome cards (#2827). The same shared component
  // and key as the module's other surfaces, so the wording cannot drift.
  it("names The Mind Illuminated on the welcome panel", () => {
    renderWithProviders(
      <MeditationOnboarding visible onComplete={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(
      screen.getByText(
        "The stages, milestones, and practices taught here summarise ideas from The Mind Illuminated by Culadasa (John Yates).",
      ),
    ).toBeTruthy();
  });

  it("keeps the welcome CTA advancing the wizard, not closing it", () => {
    const onDismiss = jest.fn();
    renderWithProviders(
      <MeditationOnboarding visible onComplete={jest.fn()} onDismiss={onDismiss} />,
    );

    fireEvent.press(screen.getByText("Begin"));
    expect(screen.getByText("Attention and peripheral awareness")).toBeTruthy();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

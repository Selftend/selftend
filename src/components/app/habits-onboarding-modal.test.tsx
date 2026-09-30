import { screen } from "@testing-library/react-native";

import { HabitsOnboarding } from "./habits-onboarding-modal";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * #2807's fourth surface: the wizard teaches the same Atomic Habits framework
 * the learn cards do - it quotes the systems line verbatim - and
 * `docs/modules/habits.md` § 5 Step 1 has required attributing it to the book
 * since the spec was written. The line is the same shared component the learn
 * surfaces render, so the wording cannot drift between them.
 */
describe("HabitsOnboarding", () => {
  it("attributes the framework beside the welcome cards", () => {
    renderWithProviders(<HabitsOnboarding visible onComplete={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByText("Systems over goals")).toBeTruthy();
    expect(
      screen.getByText("These cards summarise ideas from James Clear's Atomic Habits."),
    ).toBeTruthy();
  });
});

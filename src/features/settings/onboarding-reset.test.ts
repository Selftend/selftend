import { RESET_ONBOARDING_PREFERENCES } from "@/src/features/settings/onboarding-reset";

describe("RESET_ONBOARDING_PREFERENCES", () => {
  it("clears every onboarding flag and the button tours", () => {
    expect(RESET_ONBOARDING_PREFERENCES).toEqual({
      appOnboardingCompleted: false,
      cbtOnboardingCompleted: false,
      gratitudeOnboardingCompleted: false,
      meditationInfoCompleted: false,
      habitsOnboardingCompleted: false,
      moodOnboardingCompleted: false,
      journalOnboardingCompleted: false,
      sleepOnboardingCompleted: false,
      mindfulnessOnboardingCompleted: false,
      groundingOnboardingCompleted: false,
      shownButtonTours: [],
      startHereDismissedAt: null,
    });
  });

  it("exposes exactly the twelve expected keys (guards against drift)", () => {
    expect(Object.keys(RESET_ONBOARDING_PREFERENCES).sort()).toEqual(
      [
        "appOnboardingCompleted",
        "cbtOnboardingCompleted",
        "gratitudeOnboardingCompleted",
        "groundingOnboardingCompleted",
        "habitsOnboardingCompleted",
        "journalOnboardingCompleted",
        "meditationInfoCompleted",
        "mindfulnessOnboardingCompleted",
        "moodOnboardingCompleted",
        "shownButtonTours",
        "sleepOnboardingCompleted",
        "startHereDismissedAt",
      ].sort(),
    );
  });

  it("resets every boolean onboarding flag to false", () => {
    for (const value of Object.values(RESET_ONBOARDING_PREFERENCES)) {
      if (typeof value === "boolean") {
        expect(value).toBe(false);
      }
    }
  });

  it("is frozen so callers cannot mutate the shared reset patch", () => {
    expect(Object.isFrozen(RESET_ONBOARDING_PREFERENCES)).toBe(true);
  });
});

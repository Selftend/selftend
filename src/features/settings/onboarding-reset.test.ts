import {
  REPLAY_INTRODUCTION_PREFERENCES,
  SHOW_TIPS_AGAIN_PREFERENCES,
} from "@/src/features/settings/onboarding-reset";

describe("Settings onboarding actions", () => {
  it("replays only the app introduction", () => {
    expect(REPLAY_INTRODUCTION_PREFERENCES).toEqual({
      appOnboardingCompleted: false,
    });
  });

  it("re-arms only optional contextual tips", () => {
    expect(SHOW_TIPS_AGAIN_PREFERENCES).toEqual({
      shownButtonTours: [],
      startHereDismissedAt: null,
    });
  });

  it("keeps both shared patches immutable", () => {
    expect(Object.isFrozen(REPLAY_INTRODUCTION_PREFERENCES)).toBe(true);
    expect(Object.isFrozen(SHOW_TIPS_AGAIN_PREFERENCES)).toBe(true);
  });
});

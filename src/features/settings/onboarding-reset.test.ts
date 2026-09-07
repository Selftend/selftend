import { REPLAY_INTRODUCTION_PREFERENCES } from "@/src/features/settings/onboarding-reset";

/**
 * One action, not two, since #2109. `SHOW_TIPS_AGAIN_PREFERENCES` and its two
 * cases went with the home tour: the tips it re-armed had no stops left to show.
 */
describe("Settings onboarding actions", () => {
  it("replays only the app introduction", () => {
    expect(REPLAY_INTRODUCTION_PREFERENCES).toEqual({
      appOnboardingCompleted: false,
    });
  });

  it("keeps the shared patch immutable", () => {
    expect(Object.isFrozen(REPLAY_INTRODUCTION_PREFERENCES)).toBe(true);
  });
});

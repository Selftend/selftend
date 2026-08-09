import { RESET_ONBOARDING_PREFERENCES } from "@/src/features/settings/onboarding-reset";
import { defaultUserPreferences } from "@/src/features/modules/types";

/**
 * Every `*OnboardingCompleted` flag the preferences model declares, read off
 * `UserPreferences` itself.
 *
 * This is the whole point of the guard (#822). The version this replaces compared
 * `Object.keys(RESET_ONBOARDING_PREFERENCES)` against a hardcoded copy of those same
 * keys, so it could only fail when the reset set was edited - the one case that is
 * always deliberate. The drift it claimed to catch is a flag added to
 * `UserPreferences` and *not* to the reset, and that comparison was never made. It
 * stayed green while two such flags shipped.
 */
const DECLARED_ONBOARDING_FLAGS = Object.keys(defaultUserPreferences).filter((key) =>
  key.endsWith("OnboardingCompleted"),
);

/**
 * Flags the reset deliberately does NOT clear.
 *
 * Empty today - every declared onboarding flag is cleared. This list is the place a
 * future decision gets recorded: a new flag must either join the reset set or be
 * named here with a reason, and until one of the two happens this file fails.
 */
const PRESERVED_BY_RESET: string[] = [];

/**
 * Keys the reset clears that are not `*OnboardingCompleted` flags: a separate
 * meditation column, the button-tour list, and the Start-here dismissal.
 */
const NON_FLAG_RESET_KEYS = ["meditationInfoCompleted", "shownButtonTours", "startHereDismissedAt"];

describe("RESET_ONBOARDING_PREFERENCES", () => {
  it("clears every onboarding flag UserPreferences declares", () => {
    const expected = DECLARED_ONBOARDING_FLAGS.filter(
      (key) => !PRESERVED_BY_RESET.includes(key),
    ).sort();
    const actual = Object.keys(RESET_ONBOARDING_PREFERENCES)
      .filter((key) => key.endsWith("OnboardingCompleted"))
      .sort();

    expect(actual).toEqual(expected);
  });

  it("names both flags that shipped while the old guard was blind", () => {
    // Written `true` by use-act-program.ts and meditation-home-screen.tsx, and
    // unclearable before #821 because the patch type could not name them.
    expect(RESET_ONBOARDING_PREFERENCES).toHaveProperty("actOnboardingCompleted", false);
    expect(RESET_ONBOARDING_PREFERENCES).toHaveProperty("meditationOnboardingCompleted", false);
  });

  it("clears nothing beyond the declared flags and the named extras", () => {
    const allowed = [...DECLARED_ONBOARDING_FLAGS, ...NON_FLAG_RESET_KEYS];
    const unexpected = Object.keys(RESET_ONBOARDING_PREFERENCES).filter(
      (key) => !allowed.includes(key),
    );

    expect(unexpected).toEqual([]);
  });

  it("every extra it clears is a real preference key", () => {
    // Catches a typo'd or removed extra, which the flag rule above cannot see.
    for (const key of NON_FLAG_RESET_KEYS) {
      expect(defaultUserPreferences).toHaveProperty(key);
    }
  });

  it("resets every boolean onboarding flag to false", () => {
    for (const value of Object.values(RESET_ONBOARDING_PREFERENCES)) {
      if (typeof value === "boolean") {
        expect(value).toBe(false);
      }
    }
  });

  it("clears the button tours and the Start-here dismissal", () => {
    expect(RESET_ONBOARDING_PREFERENCES.shownButtonTours).toEqual([]);
    expect(RESET_ONBOARDING_PREFERENCES.startHereDismissedAt).toBeNull();
  });

  it("is frozen so callers cannot mutate the shared reset patch", () => {
    expect(Object.isFrozen(RESET_ONBOARDING_PREFERENCES)).toBe(true);
  });
});

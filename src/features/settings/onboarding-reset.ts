import type { updateOnboardingPreferences } from "@/src/features/settings/repository";

type OnboardingPreferencesPatch = Parameters<typeof updateOnboardingPreferences>[1];

/**
 * The exact patch applied when a user resets onboarding from Settings.
 *
 * Named and frozen so a newly-added onboarding flag can't silently drift from
 * the reset set: `onboarding-reset.test.ts` derives the expected flag list from
 * `UserPreferences` and fails the day someone introduces a flag without deciding
 * whether the reset clears it.
 *
 * That guard used to compare these keys against a hardcoded copy of themselves,
 * so it could only fail when this constant was edited - which is exactly the
 * deliberate case. It stayed green while `actOnboardingCompleted` and
 * `meditationOnboardingCompleted` were added, written `true` in production code,
 * and left out of the reset (#821/#822).
 */
export const RESET_ONBOARDING_PREFERENCES = Object.freeze({
  appOnboardingCompleted: false,
  cbtOnboardingCompleted: false,
  actOnboardingCompleted: false,
  meditationOnboardingCompleted: false,
  gratitudeOnboardingCompleted: false,
  // A different column from `meditationOnboardingCompleted` above - the TMI info
  // screen's own flag, added by 20260516172952_meditation_info_onboarding.sql.
  meditationInfoCompleted: false,
  habitsOnboardingCompleted: false,
  moodOnboardingCompleted: false,
  journalOnboardingCompleted: false,
  sleepOnboardingCompleted: false,
  mindfulnessOnboardingCompleted: false,
  groundingOnboardingCompleted: false,
  shownButtonTours: [],
  startHereDismissedAt: null,
}) satisfies OnboardingPreferencesPatch;

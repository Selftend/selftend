import type { updateOnboardingPreferences } from "@/src/features/settings/repository";

type OnboardingPreferencesPatch = Parameters<typeof updateOnboardingPreferences>[1];

/**
 * The exact patch applied when a user resets onboarding from Settings.
 *
 * Named and frozen so a newly-added onboarding flag can't silently drift from
 * the reset set: `onboarding-reset.test.ts` snapshots these keys and fails the
 * day someone introduces a flag without deciding whether the reset clears it.
 */
export const RESET_ONBOARDING_PREFERENCES = Object.freeze({
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
}) satisfies OnboardingPreferencesPatch;

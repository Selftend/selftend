import type { updateOnboardingPreferences } from "@/src/features/settings/repository";

type OnboardingPreferencesPatch = Parameters<typeof updateOnboardingPreferences>[1];

/**
 * Settings exposes these as two separate, literal promises: replay the app's
 * introduction, or re-arm optional contextual tips. Module intro modals remain
 * available from their own info buttons and carry no persisted completion state.
 */
export const REPLAY_INTRODUCTION_PREFERENCES = Object.freeze({
  appOnboardingCompleted: false,
}) satisfies OnboardingPreferencesPatch;

export const SHOW_TIPS_AGAIN_PREFERENCES = Object.freeze({
  shownButtonTours: [],
  startHereDismissedAt: null,
}) satisfies OnboardingPreferencesPatch;

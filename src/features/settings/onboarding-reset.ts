import type { updateOnboardingPreferences } from "@/src/features/settings/repository";

type OnboardingPreferencesPatch = Parameters<typeof updateOnboardingPreferences>[1];

/**
 * Settings exposes this as one literal promise: replay the app's introduction.
 * Module intro modals remain available from their own info buttons and carry no
 * persisted completion state.
 *
 * `SHOW_TIPS_AGAIN_PREFERENCES` stood beside it, re-arming `shownButtonTours` and
 * `startHereDismissedAt`. It went with the home tour (#2109): the tours were the
 * only thing it re-armed that anything still read.
 */
export const REPLAY_INTRODUCTION_PREFERENCES = Object.freeze({
  appOnboardingCompleted: false,
}) satisfies OnboardingPreferencesPatch;

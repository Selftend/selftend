import { create } from "zustand";

interface ThoughtRecordSeedState {
  /** Emotion ids the check-in handoff wants the next new thought record to open with. */
  emotions: string[];
  seedThoughtRecord: (emotions: string[]) => void;
  /** Read the seed and clear it in one step, so it can never be applied twice. */
  consumeThoughtRecordSeed: () => string[];
}

/**
 * The check-in "Go deeper" handoff, carried in memory rather than in the URL (#739).
 *
 * The obvious implementation is a route param - `/modules/cbt/new?emotions=anxious` -
 * and it is the wrong one. Expo Router serializes params into the address bar on web,
 * so the user's selected emotions would land in browser history, in any URL the
 * platform logs. Sentry itself is covered since #996 - `scrubBreadcrumb` in
 * `src/lib/sentry.ts` strips the query string off navigation breadcrumbs - but that
 * backstop exists for the launcher paths shipped builds keep minting, and the address
 * bar is not covered by it. Health data on a route still leaves the form data path.
 *
 * Deliberately NOT persisted. This is a handoff that lives for one navigation; a
 * survivor of an app restart would prefill a thought record from a check-in the user
 * abandoned days ago. `consumeThoughtRecordSeed` clears on read for the same reason -
 * navigating back out of the wizard and in again should start empty.
 */
export const useThoughtRecordSeedStore = create<ThoughtRecordSeedState>((set, get) => ({
  emotions: [],
  seedThoughtRecord: (emotions) => set({ emotions }),
  consumeThoughtRecordSeed: () => {
    const { emotions } = get();
    if (emotions.length > 0) set({ emotions: [] });
    return emotions;
  },
}));

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedThoughtRecord(emotions: string[]) {
  useThoughtRecordSeedStore.getState().seedThoughtRecord(emotions);
}

export function consumeThoughtRecordSeed(): string[] {
  return useThoughtRecordSeedStore.getState().consumeThoughtRecordSeed();
}

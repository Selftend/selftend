import { create } from "zustand";

import { registerDraftStore } from "@/src/stores/draft-store-registry";

export interface ThoughtRecordSeed {
  /** Emotion ids the handoff wants the next new thought record to open with. */
  emotions: string[];
  /**
   * What happened, for the record's Situation. Empty from the check-in, which
   * has no such field; carried by the DBT emotion record, whose first part is
   * exactly that (#1980, spec §3.3.1).
   */
  situation: string;
}

interface ThoughtRecordSeedState extends ThoughtRecordSeed {
  seedThoughtRecord: (emotions: string[], situation?: string) => void;
  /** Read the seed and clear it in one step, so it can never be applied twice. */
  consumeThoughtRecordSeed: () => ThoughtRecordSeed;
  /** The draft registry's entry point: sign-out drops the queued hand-off too. */
  reset: () => void;
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
 *
 * The one case the seed outlives its navigation (#2206): the form found a live draft
 * on arrival, kept it, and LEFT the seed here so the next fresh open still receives
 * it. `hasThoughtRecordSeed` is the peek that decision reads, without taking it.
 */
export const useThoughtRecordSeedStore = create<ThoughtRecordSeedState>((set, get) => ({
  emotions: [],
  situation: "",
  seedThoughtRecord: (emotions, situation = "") => set({ emotions, situation }),
  consumeThoughtRecordSeed: () => {
    const { emotions, situation } = get();
    if (emotions.length > 0 || situation.length > 0) set({ emotions: [], situation: "" });
    return { emotions, situation };
  },
  reset: () => set({ emotions: [], situation: "" }),
}));

// Registered with the draft-store registry because the seed can now outlive its
// navigation - the form keeps a live draft and leaves the hand-off waiting
// (#2206) - and what waits is a paragraph the person wrote about an episode. It
// must not cross a sign-out on a device whose next session is someone else.
registerDraftStore(useThoughtRecordSeedStore);

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedThoughtRecord(emotions: string[], situation = "") {
  useThoughtRecordSeedStore.getState().seedThoughtRecord(emotions, situation);
}

export function consumeThoughtRecordSeed(): ThoughtRecordSeed {
  return useThoughtRecordSeedStore.getState().consumeThoughtRecordSeed();
}

/** Whether a hand-off is waiting, without taking it. */
export function hasThoughtRecordSeed(): boolean {
  const { emotions, situation } = useThoughtRecordSeedStore.getState();
  return emotions.length > 0 || situation.length > 0;
}

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
  consumeThoughtRecordSeed: () => ThoughtRecordSeed | null;
  /** The draft registry's entry point: sign-out drops an un-taken hand-off too. */
  reset: () => void;
}

const EMPTY = { emotions: [], situation: "" };

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
 * ☠️☠️ **A hand-off lives exactly as long as the navigation that carried it.** The
 * door mints, the form the door opens takes it, and there is no third state: not
 * persisted, and not stored across a navigation either. `consumeThoughtRecordSeed`
 * clears on read, and the arrival calls it whatever it then decides to do with what
 * it got - so leaving the wizard and coming back starts empty, and an open of this
 * form the door did not cause can never find anything here.
 *
 * ⚠️ That is a DESIGN, arrived at by deleting one (#2206, #2254 and two rounds after
 * them). The rule that a live draft wins is unchanged; what changed is what happens
 * to the hand-off it beat. Keeping it "for the next fresh open" needed a freshness
 * window to stop it landing on an unrelated visit hours later; the window then had to
 * be re-stamped at the deferral rather than the door tap; and a window still cannot
 * say whether THIS arrival is the tail of a hand-off or a fresh intention, because
 * that is not a fact about time. So the hand-off is dropped instead, and the person is
 * told it was and how to get it back - one honest sentence in place of a clock.
 */
export const useThoughtRecordSeedStore = create<ThoughtRecordSeedState>((set, get) => ({
  ...EMPTY,
  seedThoughtRecord: (emotions, situation = "") => set({ emotions, situation }),
  consumeThoughtRecordSeed: () => {
    const { emotions, situation } = get();
    if (emotions.length === 0 && situation.length === 0) return null;
    set(EMPTY);
    return { emotions, situation };
  },
  reset: () => set(EMPTY),
}));

// Registered with the draft-store registry so a hand-off minted but never arrived at -
// the door pressed, the app backgrounded before the form mounted - cannot cross a
// sign-out on a device whose next session is someone else. What waits there is a
// paragraph the person wrote about an episode.
registerDraftStore(useThoughtRecordSeedStore);

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedThoughtRecord(emotions: string[], situation = "") {
  useThoughtRecordSeedStore.getState().seedThoughtRecord(emotions, situation);
}

/**
 * Take the waiting hand-off, or `null` if there is none.
 *
 * ☠️ `null` rather than an empty seed, and the arrival branches on it: an empty
 * object is truthy, and the form's `defaultValues: seed ? … : storedDraftValues`
 * would take the seed branch over a held draft on the strength of nothing.
 */
export function consumeThoughtRecordSeed(): ThoughtRecordSeed | null {
  return useThoughtRecordSeedStore.getState().consumeThoughtRecordSeed();
}

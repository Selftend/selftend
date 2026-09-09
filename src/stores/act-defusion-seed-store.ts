import { create } from "zustand";

import type { ThoughtCategory } from "@/src/features/act/types";
import { registerDraftStore } from "@/src/stores/draft-store-registry";

/** What a door into the defusion form asks it to open with. */
export interface ActDefusionSeed {
  fusedThought: string;
  thoughtCategory: ThoughtCategory | null;
}

interface ActDefusionSeedState {
  seed: ActDefusionSeed | null;
  seedDefusionLog: (seed: ActDefusionSeed) => void;
  /** Read the seed and clear it in one step, so it can never be applied twice. */
  consumeDefusionLogSeed: () => ActDefusionSeed | null;
  /** The draft registry's entry point: sign-out drops an un-taken hand-off too. */
  reset: () => void;
}

const EMPTY = { seed: null };

/**
 * The DBT judgement's "Unhook from it" hand-off, carried in memory rather than in
 * the URL (#739) and SEPARATE from the defusion draft store (#2254).
 *
 * The door used to write straight into the draft store the form types into, and
 * that made a seed indistinguishable from work: an untouched seed left behind by
 * "Finish later" satisfied the live-draft guard on two fields, so the next
 * judgement's door found "held work" and the form opened on the previous
 * judgement's text. This store is the same shape as the CBT thought record's
 * `thought-record-seed-store`: a seed never becomes a draft unless the form
 * itself writes it, which it does on the person's first edit.
 *
 * ☠️☠️ **A hand-off lives exactly as long as the navigation that carried it.** The
 * door mints, the form the door opens takes it, and there is no third state: not
 * persisted, and not stored across a navigation either. See
 * `thought-record-seed-store.ts` for why the alternative - keeping it "for the next
 * fresh open" - was deleted rather than tuned: it needs a freshness window, and a
 * window cannot say whether an arrival is the tail of a hand-off or a fresh
 * intention, because that is not a fact about time.
 *
 * It IS registered with the draft-store registry: a judgement minted but never
 * arrived at is health data that must not cross a sign-out on a device whose next
 * session is a different person.
 */
export const useActDefusionSeedStore = create<ActDefusionSeedState>((set, get) => ({
  ...EMPTY,
  seedDefusionLog: (seed) => set({ seed }),
  consumeDefusionLogSeed: () => {
    const { seed } = get();
    if (seed === null) return null;
    set(EMPTY);
    return seed;
  },
  reset: () => set(EMPTY),
}));

registerDraftStore(useActDefusionSeedStore);

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedDefusionLog(seed: ActDefusionSeed): void {
  useActDefusionSeedStore.getState().seedDefusionLog(seed);
}

/** Take the waiting hand-off, or `null` if there is none. */
export function consumeDefusionLogSeed(): ActDefusionSeed | null {
  return useActDefusionSeedStore.getState().consumeDefusionLogSeed();
}

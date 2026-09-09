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
  /** The draft registry's entry point: sign-out drops the queued hand-off too. */
  reset: () => void;
}

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
 * Deliberately NOT persisted: a hand-off lives for one navigation, and a
 * survivor of an app restart would open the form on a judgement the person read
 * days ago. It IS registered with the draft-store registry, though, because it
 * can now outlive its navigation in one case - the form found a live draft, kept
 * it, and left the seed here for the next fresh open (#2206) - and a judgement
 * waiting in memory is health data that must not cross a sign-out on a device
 * whose next session is a different person.
 */
export const useActDefusionSeedStore = create<ActDefusionSeedState>((set, get) => ({
  seed: null,
  seedDefusionLog: (seed) => set({ seed }),
  consumeDefusionLogSeed: () => {
    const { seed } = get();
    if (seed) set({ seed: null });
    return seed;
  },
  reset: () => set({ seed: null }),
}));

registerDraftStore(useActDefusionSeedStore);

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedDefusionLog(seed: ActDefusionSeed): void {
  useActDefusionSeedStore.getState().seedDefusionLog(seed);
}

/** Whether a hand-off is waiting, without taking it. */
export function hasDefusionLogSeed(): boolean {
  return useActDefusionSeedStore.getState().seed !== null;
}

export function consumeDefusionLogSeed(): ActDefusionSeed | null {
  return useActDefusionSeedStore.getState().consumeDefusionLogSeed();
}

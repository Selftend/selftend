import { create } from "zustand";

import type { ThoughtCategory } from "@/src/features/act/types";
import { registerDraftStore } from "@/src/stores/draft-store-registry";
import { isHandoffSeedFresh } from "@/src/stores/handoff-seed";

/** What a door into the defusion form asks it to open with. */
export interface ActDefusionSeed {
  fusedThought: string;
  thoughtCategory: ThoughtCategory | null;
}

interface ActDefusionSeedState {
  seed: ActDefusionSeed | null;
  /** When the hand-off was minted, for {@link isHandoffSeedFresh}. */
  mintedAt: number | null;
  /** Whether an arrival has already kept a draft over this seed and said so. */
  deferred: boolean;
  seedDefusionLog: (seed: ActDefusionSeed) => void;
  /** Read the seed and clear it in one step, so it can never be applied twice. */
  consumeDefusionLogSeed: () => ActDefusionSeed | null;
  /** The draft registry's entry point: sign-out drops the queued hand-off too. */
  reset: () => void;
}

const EMPTY = { seed: null, mintedAt: null, deferred: false };

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
 *
 * ☠️ That waiting is BOUNDED. This is a module singleton, so on native nothing
 * ends the wait: an un-consumed seed would land on an open of this form hours
 * later that had nothing to do with the door, opening it on a judgement the
 * person did not choose now. See `handoff-seed.ts`.
 */
export const useActDefusionSeedStore = create<ActDefusionSeedState>((set, get) => ({
  ...EMPTY,
  seedDefusionLog: (seed) => set({ seed, mintedAt: Date.now(), deferred: false }),
  consumeDefusionLogSeed: () => {
    const { seed, mintedAt } = get();
    if (seed) set(EMPTY);
    // A seed past its window is dropped rather than applied - the arrival that
    // finds it is not the one it was minted for (`handoff-seed.ts`).
    return isHandoffSeedFresh(mintedAt) ? seed : null;
  },
  reset: () => set(EMPTY),
}));

registerDraftStore(useActDefusionSeedStore);

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedDefusionLog(seed: ActDefusionSeed): void {
  useActDefusionSeedStore.getState().seedDefusionLog(seed);
}

/**
 * Whether a hand-off is waiting AND still within its window, without taking it.
 *
 * ☠️ It DOES drop a seed that has outlived its window. That seed can never be
 * applied again, and what waits is a judgement the person read - health data
 * with no reason left to sit in memory for the rest of the app process.
 */
export function hasDefusionLogSeed(): boolean {
  const { seed, mintedAt } = useActDefusionSeedStore.getState();
  if (seed === null) return false;
  if (isHandoffSeedFresh(mintedAt)) return true;
  useActDefusionSeedStore.setState(EMPTY);
  return false;
}

/**
 * Records that an arrival kept its live entry and left the hand-off waiting.
 *
 * Returns true only the FIRST time: the notice is about a decision this arrival
 * caused, and `keptDraft` is recomputed at every mount from (seed present) AND
 * (draft has content) with neither side consumed - so without this, every later
 * open of the form re-announced a hand-off the person had forgotten.
 */
export function deferDefusionLogSeed(): boolean {
  const { deferred } = useActDefusionSeedStore.getState();
  if (deferred) return false;
  useActDefusionSeedStore.setState({ deferred: true });
  return true;
}

export function consumeDefusionLogSeed(): ActDefusionSeed | null {
  return useActDefusionSeedStore.getState().consumeDefusionLogSeed();
}

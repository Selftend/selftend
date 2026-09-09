import type { DefusionTechnique, ThoughtCategory } from "@/src/features/act/types";
import { createDraftStore } from "@/src/stores/create-draft-store";

/**
 * A defusion entry in progress.
 *
 * ☠️ The category and the technique are nullable HERE while their columns are
 * NOT NULL: the insert trigger coalesces a null category back to `other` and a
 * null technique back to `havingTheThoughtThat`. Holding them as null until the
 * user picks is what lets the rail tell an answer from a default - a defaulted
 * value in this draft would light two of five segments before anything is typed
 * (#1380).
 */
export interface ActDefusionLogDraft {
  fusedThought: string;
  thoughtCategory: ThoughtCategory | null;
  fusionLevelBefore: number | null;
  techniqueUsed: DefusionTechnique | null;
  defusedVersion: string;
  fusionLevelAfter: number | null;
  notes: string;
}

/**
 * The unsaved defusion entry, held for "Finish later".
 *
 * ⚠️ This is the NON-WIZARD draft primitive, replacing the wizard draft store
 * the stepped version used (#1380). The wizard store's envelope exists to carry
 * a step index across a page load; a one-column form has no step, and its only
 * consumer of that machinery - the state-wizard draft hook - died with the
 * conversion. What survives is the part that matters: `createDraftStore`
 * registers with the draft-store registry, so signing out clears the entry
 * along with every other resident draft. It is health data.
 *
 * The trade this makes deliberately: the draft lives in memory, so it survives
 * leaving the screen and coming back but not a hard reload. "Finish later" is a
 * labelled exit from the screen, not a promise about the browser.
 *
 * One draft, so it never needs an entity id: `hydrate()` targets the null draft.
 */
export const useActDefusionLogDraftStore = createDraftStore<ActDefusionLogDraft>();

/**
 * Whether the held draft has anything the person put there — the check the form
 * runs on arrival before it takes a hand-off's seed (#2197, #2206).
 *
 * ☠️ A live draft outranks a hand-off. Unsaved work the person typed here beats a
 * prefill the next fresh open still receives — the rule the CBT thought record
 * applies to its own doors (`use-thought-record-editor.ts`), and the one "Finish
 * later" promises: the entry is held. A seed that replaced it would be the only
 * writer to break that promise, with no undo, because this store is the form's
 * state and has no history. Since #2254 the seed waits in its own store
 * (`act-defusion-seed-store.ts`) and never touches this one until the person's
 * first edit, so "held" here always means typed.
 *
 * Content, not presence: the form writes the store on every keystroke, so a draft can
 * exist with every field back at empty, and that one is free to take a seed.
 */
export function hasDefusionDraftContent(draft: ActDefusionLogDraft | null): boolean {
  if (!draft) return false;
  return (
    draft.fusedThought.trim() !== "" ||
    draft.thoughtCategory !== null ||
    draft.fusionLevelBefore !== null ||
    draft.techniqueUsed !== null ||
    draft.defusedVersion.trim() !== "" ||
    draft.fusionLevelAfter !== null ||
    draft.notes.trim() !== ""
  );
}

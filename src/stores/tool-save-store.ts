import { create } from "zustand";

interface ToolSaveState {
  /**
   * How many tool saves have completed this session. A counter rather than a
   * payload: the one reader (`StarterOfferCard`) derives everything it needs
   * from the record itself (#952), so all this has to carry is "another save
   * just landed" - and a counter cannot collide the way two saves in the same
   * millisecond would.
   */
  saveCount: number;
  /** Called by tool save flows after a successful save; call sites stay one-liners. */
  noteToolSave: () => void;
}

/**
 * The post-save signal the once-ever starter-routine offer (#1677) listens on.
 *
 * It used to be the reminder prompt's store, and carried the saved tool's
 * notification target key so that card could ask about that tool. The offer at
 * the completion moment was removed outright (#2342, ADR-0008): nothing asks
 * anything after a save any more, so the key has no reader and the store is
 * back to the one fact it always published - a save happened.
 */
export const useToolSaveStore = create<ToolSaveState>((set) => ({
  saveCount: 0,
  noteToolSave: () => set((state) => ({ saveCount: state.saveCount + 1 })),
}));

/** Plain-function entry point for non-component code (mutation onSuccess handlers). */
export function noteToolSave() {
  useToolSaveStore.getState().noteToolSave();
}

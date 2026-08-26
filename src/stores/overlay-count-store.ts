import { useEffect } from "react";
import { create } from "zustand";

/**
 * How many modal overlays are on screen right now (#1473, spec §2 on #1142).
 *
 * The update offer must never appear over another modal, so its `check()` asks
 * "is anything already up?" with a single read. Every overlay — each
 * `PressShieldModal` call site through the wrapper's own registration, plus
 * the raw-`<Modal>` components — raises this count while it is visible;
 * `test/modal-overlay-registration.test.ts` derives the renderer list from
 * source so a new modal cannot land unregistered.
 *
 * ☠️ Zustand, not an imperative module-scope counter, on purpose: the React
 * Compiler memoizes a plain module-variable read out of a component, and jest
 * (which never runs the compiler) would keep passing over the memoized-away
 * read — the exact blind spot recorded in the spec. A store read is a
 * subscription the compiler must respect, and `getState()` stays available
 * for the consumer's imperative arming-time check.
 */
interface OverlayCountState {
  count: number;
  /**
   * Raise the count; the returned release lowers it. Idempotent per handle,
   * so a release that runs twice (an effect cleanup racing a manual call)
   * cannot drive the count negative and swallow someone else's registration.
   */
  acquire: () => () => void;
}

export const useOverlayCountStore = create<OverlayCountState>((set) => ({
  count: 0,
  acquire: () => {
    set((state) => ({ count: state.count + 1 }));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      set((state) => ({ count: state.count - 1 }));
    };
  },
}));

/**
 * Report an overlay as visible for as long as `active` is true. One line in
 * each overlay component; the effect's cleanup guarantees the count drops on
 * close AND on unmount — the web path closes modals by unmounting them
 * outright (the #1054 gate), so a close-only release would leak there.
 */
export function useOverlayRegistration(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return useOverlayCountStore.getState().acquire();
  }, [active]);
}

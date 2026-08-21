import { create } from "zustand";

export type ToastTone = "success" | "error";

/** How long a success sits on screen before the host dismisses it (#1336). */
export const SUCCESS_TOAST_MS = 2500;

/** Visible + queued. A toast arriving over a full queue is dropped. */
export const MAX_TOASTS = 3;

export interface ToastInput {
  title: string;
  description?: string;
  /**
   * Required: an omitted tone used to fall back to `info`, a tone no call site
   * ever asked for and which now has no meaning in a per-tone policy. Making it
   * required means no future call can inherit a dead default.
   */
  tone: ToastTone;
}

/**
 * A toast that has entered the store. By extension rather than restatement, so a
 * field added to the input cannot quietly fail to reach the shown toast.
 */
export interface Toast extends ToastInput {
  id: number;
}

interface ToastState {
  /** The toast occupying the slot; null when nothing is showing. */
  visible: Toast | null;
  /**
   * Successes waiting their turn, oldest first.
   *
   * INVARIANT: empty whenever `visible.tone === "error"` - an error owns the
   * slot, so nothing queues behind it and nothing sits in front of it.
   */
  queue: Toast[];
  showToast: (toast: ToastInput) => void;
  /** Dismiss the visible toast and promote `queue[0]`. */
  dismissToast: () => void;
  /** Drop the visible toast AND the whole queue. */
  clearToasts: () => void;
}

let nextToastId = 1;

/**
 * The app's toast slot: one visible toast, a short FIFO queue behind it, and a
 * per-tone policy (#1336).
 *
 * - A **success** clears itself after `SUCCESS_TOAST_MS`.
 * - An **error** never auto-dismisses; the user closes it.
 *
 * The store owns **no timer**. It is a pure state machine and the dismiss timeout
 * lives in `AppToast`, keyed on `visible.id` and started only for a success. That
 * split is deliberate: "no timeout is ever scheduled for an error" is a claim the
 * store structurally cannot make, and the host can prove.
 *
 * There is no content de-duplication. Duplicate errors already collapse by policy
 * (error replaces error), and duplicate successes are prevented at the action
 * layer by `useSingleFlight`, which is the right layer - store-level content
 * equality would make the state machine depend on translated strings.
 */
export const useToastStore = create<ToastState>((set) => ({
  visible: null,
  queue: [],

  showToast: (input) => {
    const incoming: Toast = { id: nextToastId++, ...input };

    set((state) => {
      const { visible, queue } = state;

      if (!visible) {
        // `queue: []` is not redundant. It holds unconditionally rather than
        // leaning on "a non-empty queue implies something is visible" - an
        // invariant true of every path here, but one a `setState` in a test can
        // break, and a toast shown in front of a stale queue would be the kind
        // of state nothing else in this machine could explain.
        return { visible: incoming, queue: [] };
      }

      if (incoming.tone === "error") {
        // An error preempts whatever is showing, and takes the queue with it.
        // Requeueing the displaced successes would announce that writes landed
        // at the very moment the app is telling the user one did not - and an
        // error replacing an error keeps the queue empty for the same reason.
        return { visible: incoming, queue: [] };
      }

      if (visible.tone === "error") {
        // An unread error is never displaced by a success.
        return state;
      }

      if (1 + queue.length >= MAX_TOASTS) {
        // Overflow drops the INCOMING toast. Evicting the oldest instead would
        // delete the confirmation for the action the user took first.
        return state;
      }

      return { queue: [...queue, incoming] };
    });
  },

  dismissToast: () =>
    set((state) => {
      const [next, ...rest] = state.queue;
      return { visible: next ?? null, queue: rest };
    }),

  clearToasts: () => set({ visible: null, queue: [] }),
}));

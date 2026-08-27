import { useCallback, useMemo, useState } from "react";

/**
 * A failed write reported INLINE, because a toast would be raised where nobody can
 * see it (#1335, spec §10).
 *
 * ☠️ The rule, once, so it is not re-derived at each call site: a write fired from
 * inside an opaque native modal that STAYS OPEN cannot report itself with a toast.
 * On Android nothing can lift a toast over a native modal - `FullWindowOverlay` is
 * iOS-only, and giving the toast its own Android `Modal` would block every touch
 * below it, which the inert-body rule disqualifies. Such a write also sets
 * `meta.suppressGlobalErrorToast` so `query-client.ts`'s fallback stays quiet.
 *
 * A write whose surface CLOSES before the toast lands is not this case and should
 * keep toasting - the exposure sheet's success path is the worked example.
 *
 * `onError` takes no arguments, so it can be handed straight to `mutate`'s `onError`.
 * ⚠️ It is safe to do that from a component that unmounts on submit: MEASURED, a
 * mutate-level `onError` still runs after its caller unmounts. Hold this state on a
 * surface that OUTLIVES the write, and the failure lands somewhere still on screen.
 */
export interface InlineWriteError {
  /** The failure to render, or null when there is nothing to report. */
  message: string | null;
  /** Clears the previous failure. Call as a write starts, so a retry shows no stale one. */
  onStart: () => void;
  /** Raises this write's failure where the surface can actually show it. */
  onError: () => void;
}

/**
 * @param text The already-translated message to show. Never a hardcoded string -
 *   every call site resolves it through `t()` (AGENTS.md, i18n conventions).
 */
export function useInlineWriteError(text: string): InlineWriteError {
  const [message, setMessage] = useState<string | null>(null);

  const onStart = useCallback(() => setMessage(null), []);
  const onError = useCallback(() => setMessage(text), [text]);

  return useMemo(() => ({ message, onStart, onError }), [message, onStart, onError]);
}

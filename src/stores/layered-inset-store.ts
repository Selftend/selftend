import { useCallback, useEffect, useId, useState } from "react";
import { Dimensions, type View } from "react-native";
import { create } from "zustand";

/**
 * The bottom of the screen is the crowded end (#1339, spec §5.1): a soft
 * keyboard, the banner strips, the cookie banner, a form's sticky footer, the
 * RoutineFab, the reminder prompt card and the toast all want the same edge.
 *
 * ☠️ A single flat maximum self-destructs. If `RoutineFab` both publishes and
 * consumes one shared number it publishes its own top edge, the max includes
 * it, it moves up, it publishes higher — and it climbs forever. Layers make
 * that loop structurally unreachable rather than something a future reader has
 * to remember not to write: every consumer reads the max of the layers
 * STRICTLY BELOW its own, so nothing can ever see itself.
 */
export const INSET_LAYER = {
  /** The soft keyboard, on all three platforms. */
  keyboard: 0,
  /** In-flow strips: the banner strip, the cookie banner, a form's footer. */
  strip: 1,
  /** Floaters: `RoutineFab`, `ReminderPromptCard`. */
  floater: 2,
  /** The toast, one rung above all bottom furniture. */
  toast: 3,
} as const;

export type InsetLayer = (typeof INSET_LAYER)[keyof typeof INSET_LAYER];

/**
 * One publisher's contribution: how far its TOP edge sits above the bottom of
 * the window, in px.
 *
 * ☠️ Top edges maxed, never heights summed. The strips are in-flow and would
 * add up, but the floaters are `absolute` and already offset, and the cookie
 * banner is `fixed bottom-0` OVERLAPPING the strip — summing would count the
 * strip twice. A distance from the window bottom dissolves all of it, and it
 * is exactly the number an `absolute; bottom` consumer needs.
 */
export interface InsetEdge {
  edge: number;
  layer: InsetLayer;
}

export type InsetEdges = Readonly<Record<string, InsetEdge>>;

interface LayeredInsetState {
  edges: InsetEdges;
  publishInset: (id: string, layer: InsetLayer, edge: number) => void;
  clearInset: (id: string) => void;
}

export const useLayeredInsetStore = create<LayeredInsetState>((set) => ({
  edges: {},
  publishInset: (id, layer, edge) =>
    set((state) => {
      const current = state.edges[id];
      // measureInWindow fires on every layout pass, and most of them report the
      // same edge; re-creating `edges` each time would wake every consumer.
      if (current?.layer === layer && current.edge === edge) {
        return state;
      }
      return { edges: { ...state.edges, [id]: { edge, layer } } };
    }),
  clearInset: (id) =>
    set((state) => {
      if (!(id in state.edges)) {
        return state;
      }
      const { [id]: _removed, ...rest } = state.edges;
      return { edges: rest };
    }),
}));

/** The inset a consumer on `layer` must clear: the max of everything below it. */
export function insetBelowLayer(edges: InsetEdges, layer: InsetLayer): number {
  let highest = 0;
  for (const entry of Object.values(edges)) {
    if (entry.layer < layer && entry.edge > highest) {
      highest = entry.edge;
    }
  }
  return highest;
}

/**
 * Subscribe to the max top edge published by the layers strictly below `layer`.
 * Returns a primitive, so the selector is stable by construction.
 */
export function useInsetBelow(layer: InsetLayer): number {
  return useLayeredInsetStore((state) => insetBelowLayer(state.edges, layer));
}

/**
 * Publish a view's screen-relative top edge into `layer`. Put `attachHost` on
 * the occupying view's `ref` and `onLayout` on its `onLayout`.
 *
 * ☠️ Destructure at the call site (`const { attachHost, onLayout } = ...`). The
 * React Compiler's ref rule is on repo-wide and reads a member access on this
 * result as a ref access during render.
 *
 * ☠️ `onLayout` alone cannot yield a screen-relative edge — its `nativeEvent`
 * box is relative to the parent, and the publishers sit at wildly different
 * depths (an in-flow strip, an `absolute` floater, a `fixed` web overlay). The
 * layout pass is only the TRIGGER; `measureInWindow` supplies the number.
 *
 * ☠️ RNW's `onLayout` is a mount-time decision: a handler attached after mount
 * is never heard. Returning the handler from the hook keeps it unconditional at
 * every call site, so there is no branch that can attach it late.
 *
 * ☠️ On web, `onLayout` is a **ResizeObserver** and nothing else
 * (`react-native-web/src/modules/useElementLayout`), so it fires on SIZE
 * changes only. A host that MOVES without resizing — a floater whose `bottom`
 * changed, a sticky footer lifted by the keyboard — never re-fires it there,
 * and its published edge would silently go stale. Pass that moving value as
 * `revision` and the hook re-measures when it changes. Native `onLayout` does
 * report position, so `revision` is redundant there and harmless.
 */
export function useInsetPublisher(
  layer: InsetLayer,
  revision?: unknown,
): {
  attachHost: (node: View | null) => void;
  onLayout: () => void;
} {
  // Per-instance, so two mounted `MobileFormScreen`s (expo-router keeps the
  // screen below a pushed one mounted) do not clobber each other's entry.
  const id = useId();
  // The host node lives in STATE, not a ref: the React Compiler's ref rule is
  // on repo-wide and forbids reading a ref during render, which is exactly what
  // handing `ref` and `onLayout` to JSX would be.
  const [node, setNode] = useState<View | null>(null);

  const measure = useCallback(
    // `isStale` defaults to never-stale: only the effect has a generation that
    // can be superseded, and it is the only caller that passes one. A layout
    // pass has no such generation, so `onLayout` reads as `measure(node)`.
    (target: View, isStale: () => boolean = () => false) => {
      target.measureInWindow((_x, top, _width, height) => {
        // ☠️☠️ RNW's `measureInWindow` defers its callback through
        // `setTimeout(..., 0)` and - unlike its own `measureLayout` right above
        // it in the same file - never checks `node.isConnected` first. A host
        // that detaches inside that tick still gets measured, and
        // `getBoundingClientRect()` on a detached node answers all zeros. Top 0
        // is the TOP OF THE WINDOW here, so the publish lands as
        // `height - 0` - the largest edge expressible - and it lands AFTER the
        // detach already cleared the entry. Nothing re-measures a node that no
        // longer exists, so the phantom is permanent and every consumer above
        // this layer anchors a full screen off the bottom.
        //
        // Not hypothetical: `CookieConsentBanner` renders on the first frame
        // (its `accepted` flag hydrates in an effect), unmounts as soon as the
        // stored consent arrives, and left `RoutineFab` floating off the top of
        // the screen on web (#1340; the model shipped in #1339).
        //
        // Two guards, because they cover different paths, and each is killed on
        // its own by a test. `isStale` closes the effect path - the cookie
        // banner's, and the one RoutineFab and ReminderPromptCard take every
        // time they render null between appearances - where our cleanup has
        // already run and a late callback would resurrect the entry that detach
        // just cleared. The zero-box check below closes the `onLayout` path,
        // where no cleanup has run and only the measurement itself says the node
        // is gone.
        if (isStale()) {
          return;
        }

        const { height: windowHeight } = Dimensions.get("window");
        const edge = windowHeight - top;
        if (!Number.isFinite(edge)) {
          return;
        }
        // `getBoundingClientRect()` on a node that has left the document answers
        // all zeros, and top 0 here means the TOP OF THE WINDOW - so taking it at
        // face value publishes the largest edge expressible. Publishers do
        // legitimately collapse to height 0 (the banner strip with no banner in
        // it), but they do it AT the bottom of the window, which reads as an edge
        // of 0. The PAIR is what tells the two apart; neither half would.
        if (height === 0 && top === 0) {
          return;
        }
        useLayeredInsetStore.getState().publishInset(id, layer, Math.max(0, edge));
      });
    },
    [id, layer],
  );

  useEffect(() => {
    if (!node) {
      // The host view can detach while the owner stays mounted — RoutineFab and
      // ReminderPromptCard both render null between appearances. An
      // unmount-only cleanup would leave their last edge published forever.
      useLayeredInsetStore.getState().clearInset(id);
      return;
    }

    // ☠️ The first layout pass fires with the handler captured BEFORE the node
    // landed, so `onLayout` alone would never measure the first frame.
    let stale = false;
    measure(node, () => stale);
    return () => {
      stale = true;
    };
  }, [id, measure, node, revision]);

  // Separate from the measuring effect: folding the two together would clear
  // and republish the entry on every `revision` change, which is a visible
  // flicker for anything reading this layer.
  useEffect(() => () => useLayeredInsetStore.getState().clearInset(id), [id]);

  const onLayout = useCallback(() => {
    if (node) {
      measure(node);
    }
  }, [measure, node]);

  return { attachHost: setNode, onLayout };
}

/**
 * Tests for the layered bottom-inset store (#1339, spec §5.1/§5.2).
 *
 * The arithmetic:
 *   - a consumer reads the max of the layers STRICTLY BELOW its own
 *   - top edges are maxed, never summed, so overlapping publishers (the cookie
 *     banner sits over the banner strip) are not double-counted
 *   - a layer-2 publisher cannot influence a layer-2 consumer: the
 *     climbing-FAB loop is structurally unreachable, not merely avoided
 *
 * The publisher hook:
 *   - reports a SCREEN-RELATIVE top edge via measureInWindow, not onLayout's
 *     view-relative box
 *   - clears its entry when its host view detaches, not only when the owning
 *     component unmounts (RoutineFab renders null between hosts)
 */

import { act, renderHook } from "@testing-library/react-native";
import { Dimensions, type View } from "react-native";

import {
  INSET_LAYER,
  insetBelowLayer,
  useInsetBelow,
  useInsetPublisher,
  useLayeredInsetStore,
} from "@/src/stores/layered-inset-store";

const WINDOW_HEIGHT = 800;

beforeEach(() => {
  useLayeredInsetStore.setState({ edges: {} });
  jest
    .spyOn(Dimensions, "get")
    .mockReturnValue({ fontScale: 1, height: WINDOW_HEIGHT, scale: 2, width: 400 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** The only published edge, whatever auto-generated id it landed under. */
function onlyEdge() {
  return Object.values(useLayeredInsetStore.getState().edges)[0];
}

describe("insetBelowLayer", () => {
  it("is 0 when nothing has published", () => {
    expect(insetBelowLayer({}, INSET_LAYER.floater)).toBe(0);
  });

  it("takes the max of the layers strictly below, ignoring its own layer and above", () => {
    const edges = {
      fab: { edge: 400, layer: INSET_LAYER.floater },
      keyboard: { edge: 300, layer: INSET_LAYER.keyboard },
      strip: { edge: 74, layer: INSET_LAYER.strip },
      toast: { edge: 900, layer: INSET_LAYER.toast },
    };

    expect(insetBelowLayer(edges, INSET_LAYER.keyboard)).toBe(0);
    expect(insetBelowLayer(edges, INSET_LAYER.strip)).toBe(300);
    expect(insetBelowLayer(edges, INSET_LAYER.floater)).toBe(300);
    expect(insetBelowLayer(edges, INSET_LAYER.toast)).toBe(400);
  });

  it("maxes overlapping layer-1 publishers instead of summing their heights", () => {
    // The cookie banner is `fixed bottom-0`, so it sits OVER the banner strip
    // rather than on top of it. Summing heights (74 + 140) would push every
    // consumer 74px too high; top edges already dissolve the overlap.
    const edges = {
      cookies: { edge: 140, layer: INSET_LAYER.strip },
      strip: { edge: 74, layer: INSET_LAYER.strip },
    };

    expect(insetBelowLayer(edges, INSET_LAYER.floater)).toBe(140);
  });
});

describe("useLayeredInsetStore", () => {
  it("replaces a publisher's own entry rather than accumulating one per report", () => {
    act(() => {
      useLayeredInsetStore.getState().publishInset("strip", INSET_LAYER.strip, 74);
      useLayeredInsetStore.getState().publishInset("strip", INSET_LAYER.strip, 120);
    });

    expect(useLayeredInsetStore.getState().edges).toEqual({
      strip: { edge: 120, layer: INSET_LAYER.strip },
    });
  });

  it("keeps the same state object when a republished edge is unchanged", () => {
    act(() => useLayeredInsetStore.getState().publishInset("strip", INSET_LAYER.strip, 74));
    const before = useLayeredInsetStore.getState().edges;

    act(() => useLayeredInsetStore.getState().publishInset("strip", INSET_LAYER.strip, 74));

    // measureInWindow fires on every layout pass; an identical report must not
    // churn every consumer's subscription.
    expect(useLayeredInsetStore.getState().edges).toBe(before);
  });
});

describe("useInsetBelow", () => {
  it("cannot see a publisher on its own layer — the climbing loop is unreachable", () => {
    const { result } = renderHook(() => useInsetBelow(INSET_LAYER.floater));

    act(() => useLayeredInsetStore.getState().publishInset("fab", INSET_LAYER.floater, 500));
    expect(result.current).toBe(0);

    act(() => useLayeredInsetStore.getState().publishInset("strip", INSET_LAYER.strip, 74));
    expect(result.current).toBe(74);
  });
});

/**
 * ☠️ jest's `View` is a class-component mock, so a ref never reaches a host
 * node and `createNodeMock` is bypassed — a rendered publisher can never
 * measure here. The hook is therefore driven through its own contract: hand
 * `attachHost` a node that measures, then fire `onLayout`. What jest cannot see
 * (that the handler is on the real host view at mount) is pinned in each
 * publisher's own suite, which asserts the host renders `onLayout` on its first
 * frame.
 */
describe("useInsetPublisher", () => {
  /** A node measuring `y` px from the window top, like a real host view. */
  function nodeAt(y: number) {
    return {
      measureInWindow: (cb: (x: number, top: number, width: number, height: number) => void) =>
        cb(0, y, 400, WINDOW_HEIGHT - y),
    } as unknown as View;
  }

  /**
   * The real RNW shape: `measureInWindow` schedules its callback on
   * `setTimeout(..., 0)` and never checks whether the node survived the tick.
   */
  function deferredNodeAt(y: number, height = WINDOW_HEIGHT - y) {
    let pending: (() => void) | null = null;
    const node = {
      measureInWindow: (cb: (x: number, top: number, width: number, h: number) => void) => {
        pending = () => cb(0, y, 400, height);
      },
    };
    return { node: node as unknown as View, flush: () => pending?.() };
  }

  /** A node that has left the document: every number comes back 0. */
  function nodeAtZero() {
    return {
      measureInWindow: (cb: (x: number, top: number, width: number, h: number) => void) =>
        cb(0, 0, 0, 0),
    } as unknown as View;
  }

  // ☠️ The #1339 defect this guard exists for. `CookieConsentBanner` renders on
  // the first frame and unmounts as soon as its stored consent hydrates, so its
  // measurement lands one tick after its own `clearInset`. A detached node
  // answers all zeros, top 0 is the top of the WINDOW, and the phantom edge is
  // therefore the largest one expressible - which parked `RoutineFab` off the
  // top of the screen on web.
  it("drops a measurement that lands after its host detached", () => {
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));
    // A perfectly ordinary measurement, geometrically - 726px down a 800px
    // window. Deliberately NOT the all-zeros shape a detached DOM node answers
    // with, and deliberately still `isConnected`, so the effect-cleanup guard is
    // the only thing that can reject it and the guards stay independently
    // tested. This is the RoutineFab/ReminderPromptCard path: they render null
    // between appearances, and a late callback would resurrect the entry their
    // own detach just cleared.
    const host = deferredNodeAt(726);

    act(() => result.current.attachHost(host.node));
    act(() => result.current.attachHost(null));
    act(() => host.flush());

    expect(useLayeredInsetStore.getState().edges).toEqual({});
  });

  it("drops an all-zero measurement instead of reading it as the top of the window", () => {
    // What `getBoundingClientRect()` answers for a node that has left the
    // document. Delivered through onLayout, where no cleanup has run, so the
    // stale-effect guard cannot be what rejects it - the zero box has to be.
    // Taken at face value this publishes 800, which is the whole window, and
    // every consumer above this layer leaves the screen.
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));

    act(() => result.current.attachHost(nodeAtZero()));
    act(() => result.current.onLayout());

    expect(useLayeredInsetStore.getState().edges).toEqual({});
  });

  it("still publishes a host that collapses to nothing AT the bottom of the window", () => {
    // The guard must not swallow this one: the banner strip legitimately has
    // height 0 when no banner is in it, and its honest edge is 0. What separates
    // it from a detached node is WHERE the empty box is - at the window's bottom
    // edge, not at its top.
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));

    act(() => result.current.attachHost(nodeAt(WINDOW_HEIGHT)));
    act(() => result.current.onLayout());

    expect(onlyEdge()).toEqual({ edge: 0, layer: INSET_LAYER.strip });
  });

  it("publishes a deferred measurement whose host is still attached", () => {
    // Guard the guards: if they rejected everything, the three tests above would
    // pass against a hook that never publishes at all.
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));
    const host = deferredNodeAt(726);

    act(() => result.current.attachHost(host.node));
    act(() => host.flush());

    expect(onlyEdge()).toEqual({ edge: 74, layer: INSET_LAYER.strip });
  });

  it("publishes a screen-relative top edge measured up from the window bottom", () => {
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));

    act(() => result.current.attachHost(nodeAt(726)));
    act(() => result.current.onLayout());

    // onLayout's own box would report a height against an unknown origin; the
    // number a bottom-anchored consumer needs is 800 - 726.
    expect(onlyEdge()).toEqual({ edge: 74, layer: INSET_LAYER.strip });
  });

  it("clamps a publisher measured below the window bottom to 0", () => {
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));

    act(() => result.current.attachHost(nodeAt(WINDOW_HEIGHT + 40)));
    act(() => result.current.onLayout());

    expect(onlyEdge()).toEqual({ edge: 0, layer: INSET_LAYER.strip });
  });

  it("clears its entry when the host view detaches while the owner stays mounted", () => {
    const { result } = renderHook(() => useInsetPublisher(INSET_LAYER.floater));

    act(() => result.current.attachHost(nodeAt(600)));
    act(() => result.current.onLayout());
    expect(insetBelowLayer(useLayeredInsetStore.getState().edges, INSET_LAYER.toast)).toBe(200);

    // RoutineFab and ReminderPromptCard keep their component mounted and render
    // null between appearances; an unmount-only cleanup would leave the last
    // edge published forever.
    act(() => result.current.attachHost(null));
    expect(useLayeredInsetStore.getState().edges).toEqual({});
  });

  it("clears its entry when the owner unmounts", () => {
    const { result, unmount } = renderHook(() => useInsetPublisher(INSET_LAYER.strip));

    act(() => result.current.attachHost(nodeAt(600)));
    act(() => result.current.onLayout());

    unmount();
    expect(useLayeredInsetStore.getState().edges).toEqual({});
  });

  it("re-measures when `revision` changes, without onLayout firing", () => {
    let top = 726;
    const movingNode = {
      measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) =>
        cb(0, top, 400, 74),
    } as unknown as View;
    const { rerender, result } = renderHook(
      ({ revision }: { revision: number }) => useInsetPublisher(INSET_LAYER.floater, revision),
      { initialProps: { revision: 0 } },
    );

    act(() => result.current.attachHost(movingNode));
    expect(onlyEdge()).toEqual({ edge: 74, layer: INSET_LAYER.floater });

    // ☠️ On web `onLayout` is a ResizeObserver and fires on SIZE changes only.
    // A floater whose `bottom` changed has MOVED without resizing, so nothing
    // fires and the published edge would go stale at its old position.
    top = 500;
    rerender({ revision: 300 });

    expect(onlyEdge()).toEqual({ edge: 300, layer: INSET_LAYER.floater });
  });

  it("keeps two publishers on the same layer apart", () => {
    const first = renderHook(() => useInsetPublisher(INSET_LAYER.strip));
    const second = renderHook(() => useInsetPublisher(INSET_LAYER.strip));

    act(() => first.result.current.attachHost(nodeAt(726)));
    act(() => first.result.current.onLayout());
    act(() => second.result.current.attachHost(nodeAt(660)));
    act(() => second.result.current.onLayout());

    // Two MobileFormScreens can be mounted at once (expo-router keeps the
    // screen below a pushed one alive); a shared id would silently clobber.
    expect(insetBelowLayer(useLayeredInsetStore.getState().edges, INSET_LAYER.floater)).toBe(140);
    expect(Object.keys(useLayeredInsetStore.getState().edges)).toHaveLength(2);
  });
});

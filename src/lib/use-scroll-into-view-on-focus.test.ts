/**
 * Tests for useScrollIntoViewOnFocus.
 *
 * Web path:
 *   - On focus WITH the keyboard open (visual viewport shorter than the
 *     layout viewport): rAF -> scrollIntoView({block:"center", behavior:"smooth"})
 *   - On focus with NO keyboard and the field fully visible: no scroll
 *     (desktop clicks/Tabs must not nudge the page)
 *   - On focus with the field outside the visual viewport: scrolls even
 *     without a keyboard
 *   - Uses behavior:"auto" when prefers-reduced-motion matches
 *   - Subscribes to visualViewport resize while focused; each resize re-centers
 *     (including when the initial focus did not scroll)
 *   - Blur removes the resize listener
 *   - Unmount while focused removes the resize listener
 *   - Ignores targets without scrollIntoView
 *
 * Native path:
 *   - onFocus/onBlur are no-ops
 */

import { renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import type { NativeSyntheticEvent, TargetedEvent } from "react-native";

import { useScrollIntoViewOnFocus } from "@/src/lib/use-scroll-into-view-on-focus";

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

const originalWindow = globalThis.window;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

function restoreGlobals() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
    writable: true,
  });
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
}

function buildViewport(height: number, offsetTop = 0) {
  const listeners: ((event: unknown) => void)[] = [];
  return {
    height,
    offsetTop,
    addEventListener: jest.fn((_event: string, handler: (e: unknown) => void) => {
      listeners.push(handler);
    }),
    removeEventListener: jest.fn((_event: string, handler: (e: unknown) => void) => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    _fireResize() {
      for (const handler of [...listeners]) handler({});
    },
  };
}

function setWindow(options: { innerHeight?: number; reducedMotion?: boolean; viewport?: unknown }) {
  const { innerHeight = 800, reducedMotion = false, viewport } = options;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerHeight,
      matchMedia: jest.fn().mockReturnValue({ matches: reducedMotion }),
      visualViewport: viewport,
    },
    writable: true,
  });
}

function buildFocusEvent(
  scrollIntoView: jest.Mock | undefined,
  rect: { top: number; bottom: number } = { top: 100, bottom: 140 },
) {
  const target = scrollIntoView
    ? { scrollIntoView, getBoundingClientRect: () => rect }
    : { getBoundingClientRect: () => rect };
  return { target } as unknown as NativeSyntheticEvent<TargetedEvent>;
}

describe("useScrollIntoViewOnFocus - web", () => {
  beforeEach(() => {
    setPlatform("web");
    // Run rAF callbacks synchronously so scrollIntoView is observable.
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as typeof globalThis.requestAnimationFrame;
  });

  afterEach(() => {
    setPlatform("ios");
    restoreGlobals();
  });

  it("centers the focused element smoothly when the keyboard is open", () => {
    // Keyboard open: visual viewport (450) shorter than the layout viewport (800).
    setWindow({ innerHeight: 800, viewport: buildViewport(450) });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
  });

  it("does NOT scroll a fully-visible field when no keyboard is present (desktop)", () => {
    const viewport = buildViewport(800);
    setWindow({ innerHeight: 800, viewport });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView, { top: 100, bottom: 140 }));

    expect(scrollIntoView).not.toHaveBeenCalled();
    // The keyboard path stays armed: the resize listener is still attached.
    expect(viewport.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("scrolls a field that sits outside the visual viewport even without a keyboard", () => {
    setWindow({ innerHeight: 800, viewport: buildViewport(800) });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView, { top: 780, bottom: 820 }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
  });

  it("uses instant scrolling under prefers-reduced-motion", () => {
    setWindow({ innerHeight: 800, reducedMotion: true, viewport: buildViewport(450) });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  });

  it("re-centers on every visualViewport resize while focused", () => {
    const viewport = buildViewport(450);
    setWindow({ innerHeight: 800, viewport });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    viewport._fireResize();
    viewport._fireResize();

    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it("re-centers on resize even when the initial focus did not scroll (keyboard opens late)", () => {
    const viewport = buildViewport(800);
    setWindow({ innerHeight: 800, viewport });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView, { top: 100, bottom: 140 }));
    expect(scrollIntoView).not.toHaveBeenCalled();

    // The keyboard opens: the visual viewport shrinks and fires resize.
    viewport.height = 450;
    viewport._fireResize();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("stops listening after blur", () => {
    const viewport = buildViewport(450);
    setWindow({ innerHeight: 800, viewport });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView));
    result.current.onBlur();

    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    viewport._fireResize();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("stops listening when unmounted while focused", () => {
    const viewport = buildViewport(450);
    setWindow({ innerHeight: 800, viewport });
    const scrollIntoView = jest.fn();
    const { result, unmount } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView));
    unmount();

    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("ignores targets without scrollIntoView", () => {
    const viewport = buildViewport(450);
    setWindow({ innerHeight: 800, viewport });
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    expect(() => result.current.onFocus(buildFocusEvent(undefined))).not.toThrow();
    expect(viewport.addEventListener).not.toHaveBeenCalled();
  });
});

describe("useScrollIntoViewOnFocus - native", () => {
  beforeEach(() => {
    setPlatform("ios");
  });

  afterEach(() => {
    restoreGlobals();
  });

  it("does nothing on focus", () => {
    const viewport = buildViewport(450);
    setWindow({ innerHeight: 800, viewport });
    const scrollIntoView = jest.fn();
    const { result } = renderHook(() => useScrollIntoViewOnFocus());

    result.current.onFocus(buildFocusEvent(scrollIntoView));
    result.current.onBlur();

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(viewport.addEventListener).not.toHaveBeenCalled();
  });
});

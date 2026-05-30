/**
 * Tests for useReduceMotionEnabled.
 *
 * Web path:
 *   - Reads globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)")
 *   - Sets initial state from mediaQuery.matches
 *   - Subscribes via addEventListener("change", handler) if available
 *   - Falls back to addListener(handler) if addEventListener is absent
 *   - Cleans up via removeEventListener / removeListener on unmount
 *   - Returns false (no state change) if matchMedia is absent
 *
 * Native path:
 *   - Calls AccessibilityInfo.isReduceMotionEnabled() for initial state
 *   - Subscribes via AccessibilityInfo.addEventListener("reduceMotionChanged", handler)
 *   - Cleans up via subscription.remove() on unmount
 */

import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";

// We drive Platform.OS per describe block by mutating the property.

import { useReduceMotionEnabled } from "@/src/lib/accessibility";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

// ---------------------------------------------------------------------------
// WEB PATH
// ---------------------------------------------------------------------------

describe("useReduceMotionEnabled — web", () => {
  // Capture the original window so we can restore it.
  const originalWindow = globalThis.window;

  beforeEach(() => {
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform("ios");
    // Restore window
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
      writable: true,
    });
  });

  function buildMatchMedia(options: {
    matches: boolean;
    hasAddEventListener?: boolean;
    hasAddListener?: boolean;
  }) {
    const { matches, hasAddEventListener = true, hasAddListener = false } = options;
    const listeners: ((e: { matches: boolean }) => void)[] = [];
    const mediaQuery: Record<string, unknown> = {
      matches,
      // Provide a helper to simulate a change event from outside
      _fire: (newMatches: boolean) => {
        for (const fn of listeners) fn({ matches: newMatches });
      },
    };

    if (hasAddEventListener) {
      mediaQuery.addEventListener = jest.fn(
        (_event: string, handler: (e: { matches: boolean }) => void) => {
          listeners.push(handler);
        },
      );
      mediaQuery.removeEventListener = jest.fn(
        (_event: string, handler: (e: { matches: boolean }) => void) => {
          const idx = listeners.indexOf(handler);
          if (idx !== -1) listeners.splice(idx, 1);
        },
      );
    }

    if (hasAddListener) {
      mediaQuery.addListener = jest.fn((handler: (e: { matches: boolean }) => void) => {
        listeners.push(handler);
      });
      mediaQuery.removeListener = jest.fn((handler: (e: { matches: boolean }) => void) => {
        const idx = listeners.indexOf(handler);
        if (idx !== -1) listeners.splice(idx, 1);
      });
    }

    return mediaQuery;
  }

  function setWindowMatchMedia(mq: Record<string, unknown> | null) {
    const windowValue = mq === null ? {} : { matchMedia: jest.fn().mockReturnValue(mq) };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowValue,
      writable: true,
    });
  }

  it("returns false initially when matchMedia is not available", () => {
    setWindowMatchMedia(null);

    const { result } = renderHook(() => useReduceMotionEnabled());

    expect(result.current).toBe(false);
  });

  it("returns the initial matches value from matchMedia (true)", () => {
    const mq = buildMatchMedia({ matches: true });
    setWindowMatchMedia(mq);

    const { result } = renderHook(() => useReduceMotionEnabled());

    expect(result.current).toBe(true);
  });

  it("returns the initial matches value from matchMedia (false)", () => {
    const mq = buildMatchMedia({ matches: false });
    setWindowMatchMedia(mq);

    const { result } = renderHook(() => useReduceMotionEnabled());

    expect(result.current).toBe(false);
  });

  it("updates the returned value when the media query fires a change event", () => {
    const mq = buildMatchMedia({ matches: false });
    setWindowMatchMedia(mq);

    const { result } = renderHook(() => useReduceMotionEnabled());
    expect(result.current).toBe(false);

    act(() => {
      (mq._fire as (m: boolean) => void)(true);
    });

    expect(result.current).toBe(true);
  });

  it("removes the event listener on unmount (addEventListener path)", () => {
    const mq = buildMatchMedia({ matches: false });
    setWindowMatchMedia(mq);

    const { unmount } = renderHook(() => useReduceMotionEnabled());
    unmount();

    expect(mq.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    // Should no longer receive updates after unmount
    expect((mq.addEventListener as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const addCalls = (mq.addEventListener as jest.Mock).mock.calls.length;
    const removeCalls = (mq.removeEventListener as jest.Mock).mock.calls.length;
    expect(removeCalls).toBe(addCalls);
  });

  it("uses addListener fallback when addEventListener is absent", () => {
    const mq = buildMatchMedia({ matches: true, hasAddEventListener: false, hasAddListener: true });
    setWindowMatchMedia(mq);

    const { result } = renderHook(() => useReduceMotionEnabled());

    expect(result.current).toBe(true);
    expect(mq.addListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it("removes the addListener fallback on unmount", () => {
    const mq = buildMatchMedia({
      matches: false,
      hasAddEventListener: false,
      hasAddListener: true,
    });
    setWindowMatchMedia(mq);

    const { unmount } = renderHook(() => useReduceMotionEnabled());
    unmount();

    expect(mq.removeListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it("fires change event via addListener fallback and updates state", () => {
    const mq = buildMatchMedia({
      matches: false,
      hasAddEventListener: false,
      hasAddListener: true,
    });
    setWindowMatchMedia(mq);

    const { result } = renderHook(() => useReduceMotionEnabled());
    expect(result.current).toBe(false);

    act(() => {
      (mq._fire as (m: boolean) => void)(true);
    });

    expect(result.current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NATIVE PATH
// ---------------------------------------------------------------------------

describe("useReduceMotionEnabled — native", () => {
  const mockIsReduceMotionEnabled = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
  const mockAddEventListener = jest.spyOn(AccessibilityInfo, "addEventListener");
  const mockSubscriptionRemove = jest.fn();

  beforeEach(() => {
    setPlatform("ios");
    jest.clearAllMocks();
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    mockAddEventListener.mockReturnValue({ remove: mockSubscriptionRemove });
  });

  afterEach(() => {
    setPlatform("ios");
  });

  it("returns false initially before the promise resolves", () => {
    // isReduceMotionEnabled resolves async — initial render sees false
    mockIsReduceMotionEnabled.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useReduceMotionEnabled());

    expect(result.current).toBe(false);
  });

  it("reflects the resolved value of isReduceMotionEnabled (true)", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useReduceMotionEnabled());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });

  it("reflects the resolved value of isReduceMotionEnabled (false)", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    const { result } = renderHook(() => useReduceMotionEnabled());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(false);
  });

  it("subscribes to reduceMotionChanged via AccessibilityInfo.addEventListener", async () => {
    renderHook(() => useReduceMotionEnabled());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAddEventListener).toHaveBeenCalledWith("reduceMotionChanged", expect.any(Function));
  });

  it("updates state when the reduceMotionChanged event fires", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    let capturedHandler: ((v: boolean) => void) | null = null;
    mockAddEventListener.mockImplementation((_event, handler) => {
      capturedHandler = handler as (v: boolean) => void;
      return { remove: mockSubscriptionRemove };
    });

    const { result } = renderHook(() => useReduceMotionEnabled());

    // Flush the initial isReduceMotionEnabled().then(setEnabled) microtask inside act.
    await act(async () => {
      await Promise.resolve();
    });

    // Fire the subscription with new value
    act(() => {
      capturedHandler?.(true);
    });

    expect(result.current).toBe(true);
  });

  it("calls subscription.remove() on unmount", async () => {
    const { unmount } = renderHook(() => useReduceMotionEnabled());

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(mockSubscriptionRemove).toHaveBeenCalled();
  });
});

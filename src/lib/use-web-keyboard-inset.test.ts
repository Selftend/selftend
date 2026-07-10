/**
 * Tests for useWebKeyboardInset.
 *
 * Web path:
 *   - Computes max(0, innerHeight - visualViewport.height - offsetTop)
 *   - Subscribes to visualViewport resize + scroll and updates on both
 *   - Clamps negative values to 0
 *   - Cleans up both listeners on unmount
 *   - Returns 0 when visualViewport is unavailable
 *
 * Native path:
 *   - Returns 0 and never touches window
 */

import { act, renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";

import { useWebKeyboardInset } from "@/src/lib/use-web-keyboard-inset";

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

const originalWindow = globalThis.window;

function restoreWindow() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
    writable: true,
  });
}

function buildViewport(height: number, offsetTop = 0) {
  const listeners: Record<string, ((event: unknown) => void)[]> = { resize: [], scroll: [] };
  return {
    height,
    offsetTop,
    addEventListener: jest.fn((event: string, handler: (e: unknown) => void) => {
      listeners[event]?.push(handler);
    }),
    removeEventListener: jest.fn((event: string, handler: (e: unknown) => void) => {
      const idx = listeners[event]?.indexOf(handler) ?? -1;
      if (idx !== -1) listeners[event]?.splice(idx, 1);
    }),
    _fire(event: "resize" | "scroll") {
      for (const handler of listeners[event] ?? []) handler({});
    },
  };
}

function setWindow(innerHeight: number, visualViewport: unknown) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { innerHeight, visualViewport },
    writable: true,
  });
}

describe("useWebKeyboardInset - web", () => {
  beforeEach(() => {
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform("ios");
    restoreWindow();
  });

  it("returns 0 when visualViewport is unavailable", () => {
    setWindow(800, undefined);

    const { result } = renderHook(() => useWebKeyboardInset());

    expect(result.current).toBe(0);
  });

  it("computes the initial inset from innerHeight and the visual viewport", () => {
    setWindow(800, buildViewport(500, 0));

    const { result } = renderHook(() => useWebKeyboardInset());

    expect(result.current).toBe(300);
  });

  it("subtracts offsetTop so pinch-scroll does not inflate the inset", () => {
    setWindow(800, buildViewport(500, 100));

    const { result } = renderHook(() => useWebKeyboardInset());

    expect(result.current).toBe(200);
  });

  it("clamps negative values to 0", () => {
    setWindow(800, buildViewport(900, 0));

    const { result } = renderHook(() => useWebKeyboardInset());

    expect(result.current).toBe(0);
  });

  it("updates when the visual viewport resizes (keyboard opens)", () => {
    const viewport = buildViewport(800, 0);
    setWindow(800, viewport);

    const { result } = renderHook(() => useWebKeyboardInset());
    expect(result.current).toBe(0);

    viewport.height = 450;
    act(() => {
      viewport._fire("resize");
    });

    expect(result.current).toBe(350);
  });

  it("updates on visual viewport scroll", () => {
    const viewport = buildViewport(500, 0);
    setWindow(800, viewport);

    const { result } = renderHook(() => useWebKeyboardInset());
    expect(result.current).toBe(300);

    viewport.offsetTop = 50;
    act(() => {
      viewport._fire("scroll");
    });

    expect(result.current).toBe(250);
  });

  it("removes both listeners on unmount", () => {
    const viewport = buildViewport(500, 0);
    setWindow(800, viewport);

    const { unmount } = renderHook(() => useWebKeyboardInset());
    unmount();

    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(viewport.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

describe("useWebKeyboardInset - native", () => {
  beforeEach(() => {
    setPlatform("ios");
  });

  afterEach(() => {
    restoreWindow();
  });

  it("returns 0 without subscribing to anything", () => {
    const viewport = buildViewport(500, 0);
    setWindow(800, viewport);

    const { result } = renderHook(() => useWebKeyboardInset());

    expect(result.current).toBe(0);
    expect(viewport.addEventListener).not.toHaveBeenCalled();
  });
});

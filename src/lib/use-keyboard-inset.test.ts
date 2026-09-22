/**
 * Tests for useKeyboardInset (#2647).
 *
 * iOS path:
 *   - Starts at 0, so "keyboard closed" and "not measured yet" read the same
 *   - Reports the keyboard's height from keyboardWillChangeFrame
 *   - Follows a RESIZE with no hide in between (alphabetic -> numeric keyboard)
 *   - Returns to 0 on keyboardWillHide
 *   - Clamps a negative height to 0
 *   - Ignores a frame event carrying no usable height
 *   - Removes both subscriptions on unmount
 *
 * Off-iOS:
 *   - Returns 0 and subscribes to nothing at all
 */

import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, Platform } from "react-native";

import { useKeyboardInset } from "@/src/lib/use-keyboard-inset";

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

const originalPlatform = Platform.OS;

type Handler = (event: { endCoordinates?: { height?: number } }) => void;

/** The listeners registered by the hook, by event name. */
let handlers: Record<string, Handler>;
let removals: string[];

beforeEach(() => {
  handlers = {};
  removals = [];
  jest.spyOn(Keyboard, "addListener").mockImplementation(((name: string, handler: Handler) => {
    handlers[name] = handler;
    return { remove: () => removals.push(name) };
  }) as unknown as typeof Keyboard.addListener);
});

afterEach(() => {
  jest.restoreAllMocks();
  setPlatform(originalPlatform);
});

/** The measured geometry from the 2026-09-21 capture run, in points. */
const KEYBOARD_HEIGHT = 345;

describe("useKeyboardInset on iOS", () => {
  beforeEach(() => {
    setPlatform("ios");
  });

  it("starts at zero", () => {
    const { result } = renderHook(() => useKeyboardInset());

    expect(result.current).toBe(0);
  });

  it("reports the keyboard height when the frame changes", () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      handlers.keyboardWillChangeFrame({ endCoordinates: { height: KEYBOARD_HEIGHT } });
    });

    expect(result.current).toBe(KEYBOARD_HEIGHT);
  });

  // The case a keyboardDidShow listener would get wrong: tapping from the
  // country field into a numeric date field swaps one keyboard for a shorter
  // one with no hide in between, and a stale height would over-pad the card.
  it("follows a resize with no hide in between", () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      handlers.keyboardWillChangeFrame({ endCoordinates: { height: KEYBOARD_HEIGHT } });
    });
    act(() => {
      handlers.keyboardWillChangeFrame({ endCoordinates: { height: 220 } });
    });

    expect(result.current).toBe(220);
  });

  it("returns to zero when the keyboard hides", () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      handlers.keyboardWillChangeFrame({ endCoordinates: { height: KEYBOARD_HEIGHT } });
    });
    act(() => {
      handlers.keyboardWillHide({});
    });

    expect(result.current).toBe(0);
  });

  // Negative padding is a crash, not a layout quirk.
  it("clamps a negative height to zero", () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      handlers.keyboardWillChangeFrame({ endCoordinates: { height: -12 } });
    });

    expect(result.current).toBe(0);
  });

  it("ignores a frame event with no usable height", () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      handlers.keyboardWillChangeFrame({ endCoordinates: { height: KEYBOARD_HEIGHT } });
    });
    act(() => {
      handlers.keyboardWillChangeFrame({});
    });

    expect(result.current).toBe(KEYBOARD_HEIGHT);
  });

  it("removes both subscriptions on unmount", () => {
    const { unmount } = renderHook(() => useKeyboardInset());

    unmount();

    expect(removals.sort()).toEqual(["keyboardWillChangeFrame", "keyboardWillHide"]);
  });
});

describe.each(["android", "web"])("useKeyboardInset on %s", (os) => {
  beforeEach(() => {
    setPlatform(os);
  });

  // Not merely "returns 0": it must not subscribe either, because Android's
  // keyboard handling is deliberately left on the KeyboardAvoidingView path
  // and a second source of truth there would be the regression this scoping
  // exists to avoid.
  it("returns zero and subscribes to nothing", () => {
    const { result } = renderHook(() => useKeyboardInset());

    expect(result.current).toBe(0);
    expect(Keyboard.addListener).not.toHaveBeenCalled();
  });
});

/**
 * Tests for useRovingFocus.
 *
 * Web path:
 *   - Active item gets tabIndex 0, all others -1
 *   - ArrowRight/ArrowDown move to the next item (wrapping), activating on move
 *   - ArrowLeft/ArrowUp move to the previous item (wrapping)
 *   - Home/End jump to the first/last item
 *   - Moving focuses the target item's ref and calls preventDefault
 *   - Unhandled keys are ignored (no preventDefault, no activation)
 *   - Space activates the focused item when onPress is passed
 *
 * Native path:
 *   - getItemProps returns {} (no roving tabindex on native)
 */

import { renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";

import { useRovingFocus } from "@/src/lib/roving-focus";

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

function buildKeyEvent(key: string) {
  return { key, repeat: false, preventDefault: jest.fn() };
}

type WebItemProps = {
  ref: (node: { focus?: () => void } | null) => void;
  tabIndex: number;
  onKeyDown: (event: { key: string; repeat: boolean; preventDefault: () => void }) => void;
};

describe("useRovingFocus - web", () => {
  beforeEach(() => {
    setPlatform("web");
  });

  afterEach(() => {
    setPlatform("ios");
  });

  function renderRoving(activeIndex = 0, onActivate = jest.fn(), count = 3) {
    const { result } = renderHook(() => useRovingFocus({ count, activeIndex, onActivate }));
    return { result, onActivate };
  }

  it("marks only the active item as tabbable", () => {
    const { result } = renderRoving(1);

    expect((result.current.getItemProps(0) as WebItemProps).tabIndex).toBe(-1);
    expect((result.current.getItemProps(1) as WebItemProps).tabIndex).toBe(0);
    expect((result.current.getItemProps(2) as WebItemProps).tabIndex).toBe(-1);
  });

  it("ArrowRight activates and focuses the next item", () => {
    const { result, onActivate } = renderRoving(0);
    const focusNext = jest.fn();
    (result.current.getItemProps(1) as WebItemProps).ref({ focus: focusNext });

    const event = buildKeyEvent("ArrowRight");
    (result.current.getItemProps(0) as WebItemProps).onKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onActivate).toHaveBeenCalledWith(1);
    expect(focusNext).toHaveBeenCalled();
  });

  it("ArrowDown behaves like ArrowRight", () => {
    const { result, onActivate } = renderRoving(0);

    (result.current.getItemProps(0) as WebItemProps).onKeyDown(buildKeyEvent("ArrowDown"));

    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it("ArrowRight wraps from the last item to the first", () => {
    const { result, onActivate } = renderRoving(2);

    (result.current.getItemProps(2) as WebItemProps).onKeyDown(buildKeyEvent("ArrowRight"));

    expect(onActivate).toHaveBeenCalledWith(0);
  });

  it("ArrowLeft wraps from the first item to the last", () => {
    const { result, onActivate } = renderRoving(0);

    (result.current.getItemProps(0) as WebItemProps).onKeyDown(buildKeyEvent("ArrowLeft"));

    expect(onActivate).toHaveBeenCalledWith(2);
  });

  it("ArrowUp behaves like ArrowLeft", () => {
    const { result, onActivate } = renderRoving(1);

    (result.current.getItemProps(1) as WebItemProps).onKeyDown(buildKeyEvent("ArrowUp"));

    expect(onActivate).toHaveBeenCalledWith(0);
  });

  it("Home and End jump to the first and last items", () => {
    const { result, onActivate } = renderRoving(1);

    (result.current.getItemProps(1) as WebItemProps).onKeyDown(buildKeyEvent("Home"));
    expect(onActivate).toHaveBeenCalledWith(0);

    (result.current.getItemProps(1) as WebItemProps).onKeyDown(buildKeyEvent("End"));
    expect(onActivate).toHaveBeenCalledWith(2);
  });

  it("ignores unhandled keys", () => {
    const { result, onActivate } = renderRoving(0);

    const event = buildKeyEvent("Enter");
    (result.current.getItemProps(0) as WebItemProps).onKeyDown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("Space activates the focused item when onPress is passed", () => {
    const { result, onActivate } = renderRoving(0);
    const onPress = jest.fn();

    const event = buildKeyEvent(" ");
    (result.current.getItemProps(1, onPress) as WebItemProps).onKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
    // Space activates in place - it does not move focus.
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("Space does nothing without an onPress", () => {
    const { result, onActivate } = renderRoving(0);

    const event = buildKeyEvent(" ");
    (result.current.getItemProps(0) as WebItemProps).onKeyDown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe("useRovingFocus - native", () => {
  beforeEach(() => {
    setPlatform("ios");
  });

  it("returns empty props per item", () => {
    const { result } = renderHook(() =>
      useRovingFocus({ count: 3, activeIndex: 0, onActivate: jest.fn() }),
    );

    expect(result.current.getItemProps(0)).toEqual({});
    expect(result.current.getItemProps(1, jest.fn())).toEqual({});
  });
});

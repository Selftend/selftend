import { createContext } from "react";

/**
 * Native keyboard-scroll support: when the on-screen keyboard opens (or focus
 * moves while it is open), the focused input should be scrolled so it sits
 * just above the keyboard instead of hidden behind it.
 *
 * Edge-to-edge Android is the driving case: the OS's own scroll-into-view
 * measures against the full-height window (it does not know the keyboard
 * overlays the app), so it happily parks the focused field underneath the
 * keyboard. We re-scroll with real window measurements instead. See
 * src/lib/keyboard-avoiding.ts for the sibling padding fix.
 */

export interface KeyboardScrollRects {
  /** Focused input's top/bottom, window coordinates. */
  inputTop: number;
  inputBottom: number;
  /** Visible (keyboard-free) scroll viewport top/bottom, window coordinates. */
  visibleTop: number;
  visibleBottom: number;
}

/**
 * How far the scroll offset must change (positive = scroll down) so the input
 * sits inside the visible viewport - bottom-aligned just above the keyboard,
 * except a too-tall input keeps its TOP visible (the caret/start of the field
 * beats seeing its tail end).
 */
export function computeKeyboardScrollDelta({
  inputTop,
  inputBottom,
  visibleTop,
  visibleBottom,
}: KeyboardScrollRects): number {
  if (visibleBottom <= visibleTop) {
    return 0;
  }
  if (inputBottom > visibleBottom) {
    return Math.min(inputBottom - visibleBottom, Math.max(0, inputTop - visibleTop));
  }
  if (inputTop < visibleTop) {
    return inputTop - visibleTop;
  }
  return 0;
}

export interface KeyboardScrollContainer {
  /**
   * Measure the currently focused TextInput against this container's visible
   * area and scroll it just above the keyboard. Safe to call repeatedly.
   */
  scrollFocusedInputIntoView: () => void;
}

/**
 * Provided by KeyboardAwareScrollView; consumed by useScrollIntoViewOnFocus's
 * native path. Null outside a keyboard-aware container (the hook then no-ops,
 * matching the old behavior).
 */
export const KeyboardScrollContainerContext = createContext<KeyboardScrollContainer | null>(null);

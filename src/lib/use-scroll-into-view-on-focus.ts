import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { NativeSyntheticEvent, TargetedEvent } from "react-native";

interface ScrollableElement {
  scrollIntoView?: (options: ScrollIntoViewOptions) => void;
  getBoundingClientRect?: () => { top: number; bottom: number };
}

interface ScrollIntoViewOptions {
  block: "center";
  behavior: "auto" | "smooth";
}

// The on-screen keyboard shrinks the visual viewport below the layout
// viewport; without one the two heights match (desktop, or mobile with the
// keyboard closed).
function isKeyboardLikelyOpen(): boolean {
  const viewport = globalThis.window?.visualViewport;
  if (!viewport) {
    return false;
  }
  return window.innerHeight - viewport.height > 0;
}

// True when the element pokes outside the visual viewport's vertical bounds.
function isOutsideVisualViewport(element: ScrollableElement): boolean {
  if (typeof element.getBoundingClientRect !== "function") {
    return false;
  }
  const win = globalThis.window;
  const viewport = win?.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const height = viewport?.height ?? win?.innerHeight ?? 0;
  if (height <= 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.top < top || rect.bottom > top + height;
}

function scrollElementIntoView(element: ScrollableElement) {
  // rAF lets the visual viewport settle (keyboard animation, layout pass)
  // before we measure where "center" is.
  requestAnimationFrame(() => {
    const reducedMotion =
      globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    element.scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  });
}

/**
 * Web-only: keeps a focused text input visible above the on-screen keyboard by
 * re-centering it via scrollIntoView - on focus when there is a reason to (a
 * keyboard is already up, or the field sits outside the visual viewport), and
 * again on every visualViewport resize while it stays focused (the keyboard
 * opening resizes the visual viewport after focus lands). Desktop clicks/Tabs
 * onto fully-visible fields never scroll. This rescues screens that are not
 * wrapped in MobileFormScreen (e.g. settings). No-op on native, where
 * KeyboardAvoidingView handles avoidance.
 *
 * Spread the returned onFocus/onBlur onto the TextInput (composing with any
 * caller-provided handlers).
 */
export function useScrollIntoViewOnFocus() {
  const detachRef = useRef<(() => void) | null>(null);

  // Detach the viewport listener if the input unmounts while focused.
  useEffect(
    () => () => {
      detachRef.current?.();
      detachRef.current = null;
    },
    [],
  );

  const onFocus = useCallback((event: NativeSyntheticEvent<TargetedEvent>) => {
    if (Platform.OS !== "web") {
      return;
    }

    // On react-native-web the synthetic event's target is the DOM element
    // (the RN types say "node handle", hence the cast).
    const element = event.target as unknown as ScrollableElement | null;
    if (!element || typeof element.scrollIntoView !== "function") {
      return;
    }

    // Only nudge immediately when there is a reason to: the keyboard is
    // already up, or the field sits (partly) outside the visual viewport.
    // A desktop click/Tab onto a fully-visible field must not scroll - the
    // resize listener below still re-centers if a keyboard appears later.
    if (isKeyboardLikelyOpen() || isOutsideVisualViewport(element)) {
      scrollElementIntoView(element);
    }

    const viewport = globalThis.window?.visualViewport;
    if (!viewport) {
      return;
    }

    const handleResize = () => scrollElementIntoView(element);
    viewport.addEventListener("resize", handleResize);

    detachRef.current?.();
    detachRef.current = () => viewport.removeEventListener("resize", handleResize);
  }, []);

  const onBlur = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
  }, []);

  return { onFocus, onBlur };
}

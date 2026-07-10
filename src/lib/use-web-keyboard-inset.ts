import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Web-only: the height (px) of browser UI overlaying the bottom of the layout
 * viewport - in practice, the on-screen keyboard. KeyboardAvoidingView is a
 * no-op on web, so form screens pad their bottom by this inset instead.
 *
 * This hook is the web keyboard-avoidance mechanism (lead ruling): we do NOT
 * set a global `interactive-widget=resizes-content` viewport meta, because it
 * would resize every screen (including full-bleed tools like the breathing
 * pacer) whenever the keyboard opens. visualViewport is supported by both iOS
 * Safari and Chrome on Android, and reading it here keeps the behavior scoped
 * to form screens.
 *
 * Returns 0 on native and when visualViewport is unavailable.
 */
export function useWebKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const viewport = globalThis.window?.visualViewport;
    if (!viewport) {
      return;
    }

    const update = () => {
      // innerHeight spans the layout viewport; the visual viewport's height +
      // top offset covers the part not obscured by the keyboard. The
      // difference is the keyboard overlap (clamped: scroll bounce can make
      // it transiently negative).
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

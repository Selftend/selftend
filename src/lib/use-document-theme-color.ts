import { useEffect } from "react";
import { Platform } from "react-native";

// The other half of the web shell fix (#584).
//
// The first-paint script in public/index.html sets `<meta name="theme-color">`
// and the `<html>` background from storage, which is what stops the white flash
// before React mounts. But that script runs exactly once, at load. Every change
// after it - picking another palette, switching appearance, or the OS flipping
// scheme while the preference is "system" - repainted the app and left the
// BROWSER chrome (the mobile address bar, the PWA title bar, the overscroll
// area) on whatever was resolved at page load, until the next reload.
//
// So the same two properties the script writes are re-applied here whenever the
// resolved page colour changes. The script owns the value before React exists;
// this owns it afterwards.

/**
 * Keep the browser's `theme-color` and the document background in step with the
 * active palette on web.
 *
 * A no-op on native, which has no document and no browser chrome to match.
 *
 * @param pageColor The resolved page background for the active (style, scheme),
 *   as a CSS colour string.
 */
export function useDocumentThemeColor(pageColor: string): void {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    // Not restored on cleanup, deliberately, and unlike useDocumentThemeVars:
    // there is no `:root` rule underneath these to fall back to. The last value
    // written IS the correct one for what is on screen, so putting back a stale
    // load-time colour would reintroduce exactly the mismatch this removes.
    document.documentElement.style.backgroundColor = pageColor;

    const meta = document.querySelector('meta[name="theme-color"]');
    // Absent in test harnesses and any shell that is not public/index.html; the
    // background above is still worth setting on its own.
    if (meta) {
      meta.setAttribute("content", pageColor);
    }
  }, [pageColor]);
}

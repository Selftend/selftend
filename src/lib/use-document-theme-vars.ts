import { useEffect } from "react";
import { Platform } from "react-native";

// The portal fix, built into the engine rather than left to be found as a bug
// (#557 port review, #582).
//
// On web, @rn-primitives mounts popovers, dialogs, selects and toasts into
// `document.body` — OUTSIDE the root View that carries the theme's `vars()`.
// A CSS custom property is inherited through the DOM tree, so anything mounted
// outside that subtree resolves `--background` and friends from `global.css`
// instead: the FALLBACK palette. Every portalled surface would silently paint
// quiet-lilac no matter which style was active, and the first casualty would be
// the theme menu itself, which is a portalled popover on web.
//
// Mirroring the same variables onto `documentElement` fixes it for every
// portalled surface at once, present and future, because `<html>` is an
// ancestor of `document.body`. Selftend portals considerably more than
// WikiCanvas did, which is why this is engine work and not a follow-up.

/**
 * Mirror the active theme's CSS variables onto `<html>` on web, so surfaces
 * portalled outside the app root still resolve the active palette.
 *
 * A no-op on native, where there are no CSS variables and no document — the
 * root View's `vars()` reaches the whole tree.
 */
export function useDocumentThemeVars(varValues: Record<string, string>): void {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const root = document.documentElement;
    const names = Object.keys(varValues);
    for (const name of names) {
      root.style.setProperty(name, varValues[name]);
    }

    return () => {
      // Remove rather than restore: what these shadow is the `:root` rule in
      // global.css, and an inline property that is cleared falls back to it.
      // Restoring "the previous inline value" would pin the fallback pair as an
      // inline style forever after the first change.
      for (const name of names) {
        root.style.removeProperty(name);
      }
    };
  }, [varValues]);
}

import { useEffect } from "react";

import { useStyleStore } from "@/src/stores/style-store";
import type { StyleName } from "@/src/lib/theme/styles";

// The style axis's reader/driver split, deliberately the same shape as
// src/lib/color-scheme.ts. That file's docstring explains why the split exists:
// thirteen call sites once ran the driver for its return value and made a fresh
// theme choice flaky (#304, #343). The style axis inherits the lesson rather
// than re-learning it.

let mountedDrivers = 0;

/**
 * The house reader: "which palette are we in?"
 *
 * Pure — no effects, no writes, no storage access — so any component may call
 * it as often as it likes, and it is always defined.
 */
export function useStyleName(): StyleName {
  return useStyleStore((s) => s.style);
}

/**
 * Set the active palette. This is the whole write surface of the axis; the
 * control in #583 is a set of buttons calling it.
 */
export function useSetStyle(): (style: StyleName) => void {
  return useStyleStore((s) => s.setStyle);
}

/**
 * The driver: call exactly once, at the app root.
 *
 * Owns the one side effect the axis has — hydrating the stored palette. Returns
 * nothing, for the same reason the colour-scheme driver returns nothing: a
 * return value is an invitation to call the driver instead of the reader.
 */
export function useStyleDriver(): void {
  const hydrate = useStyleStore((s) => s.hydrate);

  useEffect(() => {
    mountedDrivers += 1;
    if (__DEV__ && mountedDrivers > 1) {
      console.warn(
        `useStyleDriver is mounted ${mountedDrivers} times. It must be called exactly once, ` +
          "at the app root (app/_layout.tsx). Extra drivers re-run hydrate and can clobber a " +
          "fresh palette choice - read the style with useStyleName instead.",
      );
    }
    return () => {
      mountedDrivers -= 1;
    };
  }, []);

  useEffect(() => {
    // Swallow storage-read failures so a rejected hydrate isn't an unhandled
    // rejection.
    void hydrate().catch(() => {});
  }, [hydrate]);
}

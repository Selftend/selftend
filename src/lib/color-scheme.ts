import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";

import { useThemeStore } from "@/src/stores/theme-store";

export type ColorSchemeName = "light" | "dark";

// Exactly one driver may be mounted at a time. A second one re-runs the hydrate
// and the NativeWind push against the same store, which is how the previous
// thirteen-site drift made a fresh theme choice flaky (#304, #343).
//
// test/color-scheme-driver.test.ts is the build-time guard - it fails CI if
// anything but app/_layout.tsx imports the driver. This counter is the runtime
// one, so a contributor sees it on a branch they have not pushed yet.
let mountedDrivers = 0;

/**
 * The house reader: "what colour scheme are we in?"
 *
 * Pure — no effects, no writes, no storage access — so any component may call
 * it freely and as often as it likes. It reads the theme store (the source of
 * truth) rather than NativeWind (a downstream sink the driver writes to), and
 * it is always defined.
 */
export function useColorSchemeName(): ColorSchemeName {
  const preference = useThemeStore((s) => s.preference);
  const systemColorScheme: ColorSchemeName = useColorScheme() === "dark" ? "dark" : "light";

  return preference === "system" ? systemColorScheme : preference;
}

/**
 * The driver: call exactly once, at the app root.
 *
 * Owns the side effects — hydrating the stored preference and pushing it into
 * NativeWind. It returns nothing deliberately: returning the resolved name
 * would let the root call one hook instead of two, but it would also give every
 * future contributor a reason to call the driver for its return value, which is
 * precisely how the previous thirteen-site situation arose. Only the reader
 * returns anything.
 */
export function useColorSchemeDriver(): void {
  const preference = useThemeStore((s) => s.preference);
  const hydrate = useThemeStore((s) => s.hydrate);
  // Through the reader, so the resolution rule lives in exactly one place.
  const resolved = useColorSchemeName();

  // Counts mounts, not renders, and decrements on unmount - so remounting the
  // single root driver never accumulates, while two concurrent drivers do.
  useEffect(() => {
    mountedDrivers += 1;
    if (__DEV__ && mountedDrivers > 1) {
      console.warn(
        `useColorSchemeDriver is mounted ${mountedDrivers} times. It must be called exactly ` +
          "once, at the app root (app/_layout.tsx). Extra drivers re-run hydrate and can " +
          "clobber a fresh theme choice - read the scheme with useColorSchemeName instead.",
      );
    }
    return () => {
      mountedDrivers -= 1;
    };
  }, []);

  useEffect(() => {
    // Swallow storage-read failures so a rejected hydrate isn't an unhandled rejection.
    void hydrate().catch(() => {});
  }, [hydrate]);

  // Native takes `preference` so "system" clears the Appearance override that
  // would otherwise pin useColorScheme above to the previous explicit choice.
  // Web takes `resolved` because NativeWind's web path drops html.dark for
  // "system" instead of mirroring the OS.
  useEffect(() => {
    nwColorScheme.set(Platform.OS === "web" ? resolved : preference);
  }, [preference, resolved]);
}

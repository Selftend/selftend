import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";

import { useThemeStore } from "@/src/stores/theme-store";

type ResolvedColorScheme = "light" | "dark";

/**
 * The house reader: "what colour scheme are we in?"
 *
 * Pure — no effects, no writes, no storage access — so any component may call
 * it freely and as often as it likes. It reads the theme store (the source of
 * truth) rather than NativeWind (a downstream sink the driver writes to), and
 * it is always defined.
 */
export function useColorSchemeName(): ResolvedColorScheme {
  const preference = useThemeStore((s) => s.preference);
  const systemColorScheme: ResolvedColorScheme = useColorScheme() === "dark" ? "dark" : "light";

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

  useEffect(() => {
    // Swallow storage-read failures so a rejected hydrate isn't an unhandled rejection.
    void hydrate().catch(() => {});
  }, [hydrate]);

  const systemColorScheme: ResolvedColorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const resolved: ResolvedColorScheme = preference === "system" ? systemColorScheme : preference;

  // Native takes `preference` so "system" clears the Appearance override that
  // would otherwise pin useColorScheme above to the previous explicit choice.
  // Web takes `resolved` because NativeWind's web path drops html.dark for
  // "system" instead of mirroring the OS.
  useEffect(() => {
    nwColorScheme.set(Platform.OS === "web" ? resolved : preference);
  }, [preference, resolved]);
}

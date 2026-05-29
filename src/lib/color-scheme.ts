import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";

import { useThemeStore } from "@/src/stores/theme-store";

export type ResolvedColorScheme = "light" | "dark";

export function useAppColorScheme(): ResolvedColorScheme {
  const preference = useThemeStore((s) => s.preference);
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
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

  return resolved;
}

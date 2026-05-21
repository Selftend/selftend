import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";

import { useThemeStore } from "@/src/stores/theme-store";

export type ResolvedColorScheme = "light" | "dark";

export function useAppColorScheme(): ResolvedColorScheme {
  const { preference, hydrate } = useThemeStore();
  const systemColorScheme: ResolvedColorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const colorScheme: ResolvedColorScheme = preference === "system" ? systemColorScheme : preference;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    nwColorScheme.set(colorScheme);
  }, [colorScheme]);

  return colorScheme;
}

import { useEffect, useState } from "react";
import { Appearance, Platform } from "react-native";

import type { ThemePreference } from "@/src/stores/theme-store";

export type ResolvedColorScheme = "light" | "dark";

const DARK_COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function getWebSystemColorScheme(): ResolvedColorScheme {
  if (typeof globalThis.window?.matchMedia !== "function") {
    return "light";
  }

  return globalThis.window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches
    ? "dark"
    : "light";
}

function getSystemColorScheme(): ResolvedColorScheme {
  if (Platform.OS === "web") {
    return getWebSystemColorScheme();
  }

  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemColorScheme: ResolvedColorScheme,
): ResolvedColorScheme {
  return preference === "system" ? systemColorScheme : preference;
}

export function getNativeWindColorScheme(
  preference: ThemePreference,
  systemColorScheme: ResolvedColorScheme,
): ThemePreference {
  if (Platform.OS === "web" && preference === "system") {
    return systemColorScheme;
  }

  return preference;
}

export function useSystemColorScheme(): ResolvedColorScheme {
  const [systemColorScheme, setSystemColorScheme] =
    useState<ResolvedColorScheme>(getSystemColorScheme);

  useEffect(() => {
    if (Platform.OS === "web") {
      const mediaQuery = globalThis.window?.matchMedia?.(
        DARK_COLOR_SCHEME_QUERY,
      );

      if (!mediaQuery) {
        return;
      }

      const updateSystemColorScheme = (event: MediaQueryListEvent) => {
        setSystemColorScheme(event.matches ? "dark" : "light");
      };

      setSystemColorScheme(mediaQuery.matches ? "dark" : "light");

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", updateSystemColorScheme);
        return () => {
          mediaQuery.removeEventListener("change", updateSystemColorScheme);
        };
      }

      mediaQuery.addListener(updateSystemColorScheme);
      return () => {
        mediaQuery.removeListener(updateSystemColorScheme);
      };
    }

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme === "dark" ? "dark" : "light");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return systemColorScheme;
}

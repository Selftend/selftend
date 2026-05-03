import { Platform } from "react-native";
import { create } from "zustand";

const STORAGE_KEY = "selftend_theme";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => void;
}

function persistToStorage(preference: ThemePreference) {
  if (Platform.OS !== "web") {
    return;
  }

  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, preference);
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

function loadFromStorage(): ThemePreference | null {
  if (Platform.OS !== "web") {
    return null;
  }

  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") {
      return raw;
    }
  } catch {
    // Malformed data, ignore
  }

  return null;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  setPreference: (preference) => {
    persistToStorage(preference);
    set({ preference });
  },
  hydrate: () => {
    const stored = loadFromStorage();
    if (stored) {
      set({ preference: stored });
    }
  },
}));

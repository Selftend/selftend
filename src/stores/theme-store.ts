import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "selftend:theme";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => Promise<void>;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  setPreference: (preference) => {
    set({ preference });
    // Best-effort persistence; a failed write must not become an unhandled rejection.
    void AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (isThemePreference(stored)) {
      set({ preference: stored });
    }
  },
}));

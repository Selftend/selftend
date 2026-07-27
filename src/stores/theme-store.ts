import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "selftend:theme";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  // Whether `preference` has settled - either loaded from storage or chosen by the
  // user. Part of the contract so a maintainer can ask instead of racing: once true,
  // nothing storage reports may overwrite what's already there.
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => Promise<void>;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: "system",
  hydrated: false,
  setPreference: (preference) => {
    // An explicit choice settles the preference, so a storage read still in flight
    // can't report an older value over it.
    set({ preference, hydrated: true });
    // Best-effort persistence; a failed write must not become an unhandled rejection.
    void AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  },
  hydrate: async () => {
    // Already settled - a re-read could only report something staler.
    if (get().hydrated) return;
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    // Re-check after the await: a choice may have landed mid-read, and it is the
    // fresher value. Discarding the read here is what closes the race structurally,
    // however many consumers call hydrate().
    if (get().hydrated) return;
    // Settle whatever the read reported - a user with nothing stored (or garbage
    // stored) is "settled on the default", not permanently un-hydrated. The default
    // is "system", so the app follows the device, and signed-in users get the account
    // value from useSettingsSync regardless.
    //
    // A read that *rejects* is the one case left unsettled, deliberately. Unlike
    // app-lock-store - which must flip `hydrated` from a catch because AppLockGate
    // blocks render until it does - nothing gates on the theme having settled, so a
    // catch here would buy nothing. Re-reading on the next mount instead would put
    // back the very read-then-overwrite behaviour these two guards exist to remove.
    set({ preference: isThemePreference(stored) ? stored : get().preference, hydrated: true });
  },
}));

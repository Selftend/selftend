import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "selftend:theme";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  /**
   * Whether `preference` has settled — either loaded from storage or chosen
   * explicitly. Part of the store's contract: a maintainer can ask whether the
   * preference is settled instead of racing it.
   */
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
    // An explicit choice supersedes anything storage could subsequently report.
    set({ preference, hydrated: true });
    // Best-effort persistence; a failed write must not become an unhandled rejection.
    void AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  },
  hydrate: async () => {
    if (get().hydrated) return; // already settled — don't re-read

    // A failed read settles on the current preference rather than leaving the
    // store un-hydrated forever, which would let every later mount re-read —
    // the repeated-write behaviour this removes. So: no retry, and no rejection
    // for callers to handle. Mirrors app-lock-store and the CBT intro store.
    let stored: string | null = null;
    try {
      stored = await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    // The read is not instant, and `setPreference` persists unawaited, so a
    // choice can land while this is in flight. It is the fresher of the two,
    // so it wins and the read is discarded. Losing this re-check reopens #304.
    if (get().hydrated) return;

    // `hydrated` is set even when nothing valid was stored, so a first-run user
    // is "settled on the default" rather than permanently un-hydrated. The
    // fallback is "system" (the app follows the device), and signed-in users
    // get the account value from useSettingsSync regardless.
    set({ preference: isThemePreference(stored) ? stored : get().preference, hydrated: true });
  },
}));

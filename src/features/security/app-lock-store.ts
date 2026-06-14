import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// Device-local by design: the app-lock preference is NOT synced to Supabase.
// It mirrors theme-store's AsyncStorage-backed zustand pattern.
export const APP_LOCK_STORAGE_KEY = "selftend:security:appLockEnabled";

interface AppLockState {
  enabled: boolean;
  hydrated: boolean;
  setEnabled: (value: boolean) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAppLockStore = create<AppLockState>((set) => ({
  enabled: false,
  hydrated: false,
  setEnabled: async (value) => {
    // Persist FIRST, then flip state - so a failed write leaves `enabled` (and the toggle
    // UI bound to it) unchanged rather than out of sync with storage. The caller's catch
    // surfaces the error.
    await AsyncStorage.setItem(APP_LOCK_STORAGE_KEY, value ? "1" : "0");
    set({ enabled: value });
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(APP_LOCK_STORAGE_KEY);
      set({ enabled: stored === "1", hydrated: true });
    } catch {
      // A failed read must still flip `hydrated` so AppLockGate stops blocking render
      // (it waits for hydration before deciding); default enabled:false is a safe
      // passthrough. Never brick the app on a storage hiccup.
      set({ hydrated: true });
    }
  },
}));

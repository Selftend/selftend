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
    set({ enabled: value });
    await AsyncStorage.setItem(APP_LOCK_STORAGE_KEY, value ? "1" : "0");
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(APP_LOCK_STORAGE_KEY);
    set({ enabled: stored === "1", hydrated: true });
  },
}));

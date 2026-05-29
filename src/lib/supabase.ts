import { AppState, Platform } from "react-native";
import { createClient, processLock, type SupportedStorage } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

import { appEnv, hasSupabaseConfig } from "@/src/lib/env";
import { secureStoreStorage } from "@/src/lib/secure-store-storage";

const webStorage: SupportedStorage = {
  getItem: (key) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key, value) => Promise.resolve(globalThis.localStorage?.setItem(key, value)),
  removeItem: (key) => Promise.resolve(globalThis.localStorage?.removeItem(key)),
};

const storage = Platform.OS === "web" ? webStorage : secureStoreStorage;

export const supabase = hasSupabaseConfig
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseKey, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

let autoRefreshListenerRegistered = false;

export function initializeSupabaseAutoRefresh() {
  if (!supabase || Platform.OS === "web" || autoRefreshListenerRegistered) {
    return;
  }

  autoRefreshListenerRegistered = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
      return;
    }

    supabase.auth.stopAutoRefresh();
  });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment.",
    );
  }

  return supabase;
}

import { AppState, Platform } from "react-native";
import { createClient, processLock, type SupportedStorage } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

import { appEnv, hasSupabaseConfig } from "@/src/lib/env";
import { secureStoreStorage } from "@/src/lib/secure-store-storage";

// WEB SESSION-TOKEN DECISION (accepted with rationale)
// supabase-js on web stores the session token (access + refresh JWT pair) in localStorage.
// This is the standard, unavoidable behaviour of supabase-js for browser-based SPAs; there is no
// httpOnly-cookie mode in the supabase-js client (that would require a server-side proxy/SSR
// middleware such as @supabase/ssr, which this React Native / Expo web app does not use).
// Accepted rationale:
//   - This is standard practice for web SPAs; every major auth SDK (Firebase, Auth0, Clerk, etc.)
//     does the same for purely client-side deployments.
//   - The session token grants access only to the authenticated user's own data via RLS policies.
//   - On native (iOS/Android) the token is stored in Expo SecureStore (OS keychain), which IS
//     encrypted. The web-only localStorage path is separated by the Platform.OS guard below.
//   - No other sensitive user data (journal text, gratitude items, etc.) is stored in localStorage;
//     only the auth token and a small cookie-consent preference record (boolean flags).
//   - Mitigation for XSS is handled at the application layer (no dangerouslySetInnerHTML, no
//     eval-based dynamic content, strict CSP headers should be set on the hosting origin).
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
        // PKCE so auth callbacks carry only a single-use, short-lived `code` in the query
        // string instead of the implicit grant's long-lived access/refresh tokens in the URL
        // hash. completeAuthRedirect() exchanges the code for a session.
        flowType: "pkce",
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

/**
 * True for the "this column does not exist yet" error PostgREST raises before a
 * migration adds an optional column: Postgres SQLSTATE 42703 (undefined_column)
 * or the PGRST204 schema-cache miss. Lets a caller degrade a not-yet-migrated
 * column to a default WITHOUT also swallowing genuine failures (network, auth,
 * RLS) as if the column were absent.
 */
export function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42703" || code === "PGRST204";
}

import { Platform } from "react-native";
import { create } from "zustand";

const STORAGE_KEY = "selftend_cookie_consent";

interface CookieConsentState {
  essential: true;
  analytics: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
  setAnalytics: (enabled: boolean) => void;
  hydrate: () => void;
}

function persistToStorage(
  state: Pick<CookieConsentState, "analytics" | "accepted" | "acceptedAt">,
) {
  if (Platform.OS !== "web") {
    return;
  }

  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        analytics: state.analytics,
        accepted: state.accepted,
        acceptedAt: state.acceptedAt,
      }),
    );
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

function loadFromStorage(): Pick<
  CookieConsentState,
  "analytics" | "accepted" | "acceptedAt"
> | null {
  if (Platform.OS !== "web") {
    return null;
  }

  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed.accepted === "boolean") {
      return {
        analytics: Boolean(parsed.analytics),
        accepted: Boolean(parsed.accepted),
        acceptedAt: parsed.acceptedAt ?? null,
      };
    }
  } catch {
    // Malformed data, ignore
  }

  return null;
}

export const useCookieConsentStore = create<CookieConsentState>((set) => ({
  essential: true,
  analytics: false,
  accepted: false,
  acceptedAt: null,

  acceptAll: () => {
    const now = new Date().toISOString();
    const next = { analytics: true, accepted: true, acceptedAt: now };
    persistToStorage(next);
    set(next);
  },

  acceptEssentialOnly: () => {
    const now = new Date().toISOString();
    const next = { analytics: false, accepted: true, acceptedAt: now };
    persistToStorage(next);
    set(next);
  },

  setAnalytics: (enabled: boolean) => {
    const now = new Date().toISOString();
    const next = { analytics: enabled, accepted: true, acceptedAt: now };
    persistToStorage(next);
    set(next);
  },

  hydrate: () => {
    const stored = loadFromStorage();
    if (stored) {
      set(stored);
    }
  },
}));

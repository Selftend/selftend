import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";

import { DEFAULT_STYLE, STYLE_NAMES, type StyleName } from "@/src/lib/theme/styles";

// The style axis (#582). Deliberately a SEPARATE store from theme-store.ts
// rather than a second field on it, because the guard has to be per axis: a
// single shared `hydrated` flag would let a slow read on one axis settle the
// other, which is exactly the read-then-overwrite shape of #304/#343. Two
// stores makes that structural instead of a rule someone has to remember.
//
// Device-local, and that is the whole of it — no `user_preferences` column, no
// migration, no account sync (#562). A column would also drag in the export
// completeness gate for a value that means nothing on another device.

const STORAGE_KEY = "selftend:style";

export function isStyleName(value: unknown): value is StyleName {
  return typeof value === "string" && (STYLE_NAMES as readonly string[]).includes(value);
}

/**
 * The web-only synchronous seed, and the reason there is no flash of the
 * fallback palette on a cold load.
 *
 * On web AsyncStorage IS `window.localStorage` with this exact key, unprefixed,
 * so reading it directly here returns precisely what the async hydrate would
 * report a tick later — only in time for the first paint rather than after it.
 * Native has no synchronous equivalent and does not need one: it settles under
 * the splash.
 *
 * Guarded because the same module is imported by the web *server* bundle during
 * static export, where there is no window at all.
 */
function seedFromLocalStorage(): StyleName | null {
  if (Platform.OS !== "web" || typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isStyleName(stored) ? stored : null;
  } catch {
    // Storage can throw outright (Safari private mode, disabled cookies). A
    // palette is not worth failing a boot over.
    return null;
  }
}

interface StyleState {
  style: StyleName;
  /**
   * Whether `style` has settled — either read from storage or chosen. Part of
   * the contract so a maintainer can ask rather than race: once true, nothing
   * storage reports may overwrite what is already there.
   */
  hydrated: boolean;
  setStyle: (style: StyleName) => void;
  hydrate: () => Promise<void>;
}

export const useStyleStore = create<StyleState>((set, get) => {
  const seeded = seedFromLocalStorage();

  return {
    style: seeded ?? DEFAULT_STYLE,
    // A successful web seed IS a settled read — re-reading the same key
    // asynchronously could only report the same value or, if a choice landed in
    // between, a staler one. `null` means the seed found nothing (or could not
    // run at all, which is every native boot), so the async hydrate still owes
    // us a read.
    hydrated: seeded !== null,
    setStyle: (style) => {
      // An explicit choice settles the axis, so a read still in flight cannot
      // report an older value over it.
      set({ style, hydrated: true });
      // Best-effort persistence; a failed write must not become an unhandled
      // rejection.
      void AsyncStorage.setItem(STORAGE_KEY, style).catch(() => {});
    },
    hydrate: async () => {
      // Already settled — a re-read could only report something staler.
      if (get().hydrated) return;
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      // Re-check after the await: a choice may have landed mid-read, and it is
      // the fresher value. Discarding the read here is what closes the race
      // structurally, however many consumers call hydrate().
      if (get().hydrated) return;
      // Settle whatever the read reported. Nothing stored, or garbage stored,
      // means "settled on the default" rather than permanently un-hydrated —
      // the overwhelming majority of users, who never open the selector.
      set({ style: isStyleName(stored) ? stored : get().style, hydrated: true });
    },
  };
});

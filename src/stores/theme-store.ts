import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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

/**
 * The web-only synchronous seed, mirroring the one in style-store.ts — and the
 * reason the appearance axis does not flash on a cold web load.
 *
 * The first-paint script in public/index.html already paints the STORED
 * appearance. Without this seed the store still started at "system", so React's
 * first commit resolved to the DEVICE scheme and only flipped back once the
 * async read landed: stored → device → stored, a worse flash than the script
 * was added to remove. Seeding here makes the first commit agree with the paint
 * that preceded it.
 *
 * On web AsyncStorage IS `window.localStorage` under this exact unprefixed key,
 * so this reads precisely what the async hydrate would report a tick later.
 * Native has no synchronous equivalent and settles under the splash.
 */
function seedFromLocalStorage(): ThemePreference | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }
  try {
    // Inside the try, not in the guard above: on an opaque or sandboxed origin
    // the property access itself throws, and this runs at module scope where a
    // throw takes the whole web boot down rather than one preference with it.
    const storage = window.localStorage;
    if (!storage) {
      return null;
    }
    const stored = storage.getItem(STORAGE_KEY);
    return isThemePreference(stored) ? stored : null;
  } catch {
    // Storage can also throw on read (private mode, blocked cookies). An
    // appearance is not worth failing a boot over.
    return null;
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const seeded = seedFromLocalStorage();

  return {
    preference: seeded ?? "system",
    // A successful web seed IS a settled read — re-reading the same key
    // asynchronously could only report the same value or, if a choice landed in
    // between, a staler one. `null` means the seed found nothing (or could not run
    // at all, which is every native boot), so the async hydrate still owes a read.
    hydrated: seeded !== null,
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
  };
});

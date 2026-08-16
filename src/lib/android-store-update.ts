import { Platform } from "react-native";

/**
 * Whether Google Play is currently serving a newer build **to this device**.
 *
 * This is the availability signal `use-update-availability.ts` used to say did
 * not exist. `/version.json` records when the *web* deployed, which is not
 * evidence a store build is installable — so the native offer was suppressed
 * rather than shipped approximately-right (#388 review, PR #532). Play Core
 * answers the real question per install: the check runs against the listing for
 * this device, so a staged rollout, a country restriction or a device the build
 * does not target all resolve to "nothing to offer" without the app guessing.
 *
 * Availability only. We never invoke Google's own update UI — the offer is
 * Selftend's inline banner, which #388 section 3 decided must never be an
 * overlay. This module answers a question; it does not interrupt anyone.
 *
 * Android only, and quiet on every other path: web, iOS, dev builds, sideloads
 * and Play-less devices all resolve to null.
 */
export async function checkAndroidStoreUpdate(): Promise<string | null> {
  if (Platform.OS !== "android" || __DEV__) return null;
  try {
    // Imported HERE rather than at module scope, and the placement is
    // load-bearing. `expo-in-app-updates` runs `requireNativeModule(...)` as a
    // side effect of being evaluated, and that pod is not autolinked into the
    // iOS build — so a static import throws while the root layout is still
    // evaluating, and the app dies on launch before drawing a frame. WikiCanvas
    // shipped that crash (its #606); the Platform guard above protects the
    // CALL, only deferring the import keeps the module off iOS entirely.
    //
    // `require`, not `await import()`: jest does not transpile dynamic import
    // here without --experimental-vm-modules, so an import() would resolve to a
    // rejection this catch swallows — every Android test would pass while
    // asserting nothing. require is lazy under Metro just the same.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate; see above
    const updates = require("expo-in-app-updates") as typeof import("expo-in-app-updates");
    const { updateAvailable, storeVersion } = await updates.checkForUpdate();
    if (!updateAvailable || !storeVersion) return null;
    return storeVersion;
  } catch {
    // Sideloaded dev client, adb install, or a device without Play: Play Core
    // rejects with a message-only CodedException (APP_NOT_OWNED,
    // PLAY_STORE_NOT_FOUND and API_NOT_AVAILABLE are not machine-readable from
    // JS), so every rejection is "no answer" rather than something to report.
    return null;
  }
}

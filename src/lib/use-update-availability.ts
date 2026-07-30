import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { appEnv } from "@/src/lib/env";
import {
  fetchVersionDocument,
  getRunningVersion,
  isNewerVersion,
} from "@/src/lib/update-availability";

// The update-availability hook (#388 spec section 3). Quiet by construction:
// it can only ever offer, never force - a null answer at any stage means the
// banner simply does not render.
//
// Timing rules, per platform:
// - web: check on app start and again on window focus, but never more than
//   once per THROTTLE window (deploys are frequent; tab-switchers are not a
//   reason to hammer /version.json). `act` reloads the page.
// - native: currently OFF - see NATIVE_UPDATE_OFFERS_ENABLED below. The
//   machinery is retained (grace window, per-platform store URL) because the
//   missing piece is real store-availability data in /version.json, not this
//   code. `act` opens the platform's own store; an unset URL means never
//   available.
//
// Dismissal is per version (`updateBannerDismissed:<version>`), so the banner
// returns exactly once per release. AsyncStorage backs both platforms - on
// web it is localStorage underneath.

const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000;
const NATIVE_GRACE_MS = 24 * 60 * 60 * 1000;
const DISMISSED_KEY_PREFIX = "updateBannerDismissed:";

/**
 * Native update offers are OFF, because `/version.json` cannot answer the
 * question they ask.
 *
 * The document is written by the **web** deploy
 * (`.github/workflows/web-deploy.yml`) and carries only `{ version,
 * publishedAt }` — a web timestamp. The 24h `NATIVE_GRACE_MS` window then
 * treats "the web deployed a day ago" as "the store has this build", and that
 * is simply not true on either native platform:
 *
 * - **Android** releases at `rollout: 0.2` (`eas.json`), and the cap does not
 *   climb on its own — it moves when a human bumps it in Play Console. So for
 *   up to 80% of Android users the offer is not merely early, it is wrong
 *   **indefinitely**: tapping it opens a Play listing showing no update.
 * - **iOS** lands in TestFlight and reaches the App Store only when a human
 *   promotes the build, so the delay is unbounded by construction.
 *
 * Telling someone to update to something they cannot install is exactly the
 * kind of pointless nudge this product is supposed not to do, so the offer is
 * suppressed rather than shipped approximately-right.
 *
 * **To re-enable**, do not just flip this flag — the time-based grace is the
 * broken part. `/version.json` must first carry real per-platform availability,
 * published only once each store release is actually reachable (which needs a
 * signal that does not exist yet: nothing currently reports an Android rollout
 * reaching 100% or an iOS build being promoted).
 *
 * Web is unaffected and stays on: a web deploy IS immediately available to
 * every web user, so there the timestamp means what the code thinks it means.
 *
 * Found in review on the release that would have shipped it (PR #532), before
 * it ever reached a user.
 */
const NATIVE_UPDATE_OFFERS_ENABLED = false;

interface UpdateAvailability {
  available: boolean;
  version: string | null;
  act: () => void;
  dismiss: () => void;
}

/**
 * The store this native build should send people to.
 *
 * `Platform.OS !== "web"` used to stand in for "Android", which was harmless
 * while Android was the only native platform and became a bug the moment iOS
 * existed: an iPhone was offered a **Google Play** link, opening Safari on a
 * listing it cannot install from (#529).
 *
 * A platform with no URL configured offers no update at all rather than falling
 * back to the other store - a wrong store link is worse than a missing banner,
 * and it is the failure that shipped.
 */
function getNativeStoreUrl(): string {
  if (Platform.OS === "ios") return appEnv.appStoreUrl.trim();
  if (Platform.OS === "android") return appEnv.playStoreUrl.trim();
  return "";
}

export function useUpdateAvailability(): UpdateAvailability {
  const [offeredVersion, setOfferedVersion] = useState<string | null>(null);
  const lastCheckedAt = useRef(0);

  const check = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheckedAt.current < CHECK_THROTTLE_MS) return;
    lastCheckedAt.current = now;

    const running = getRunningVersion();
    if (!running) return;
    // Checked before the fetch, so a native build does not even request
    // /version.json for an answer it will not act on.
    if (Platform.OS !== "web" && !NATIVE_UPDATE_OFFERS_ENABLED) return;
    if (Platform.OS !== "web" && !getNativeStoreUrl()) return;

    const doc = await fetchVersionDocument();
    if (!doc) return;
    if (!isNewerVersion(doc.version, running)) return;
    if (Platform.OS !== "web" && now - Date.parse(doc.publishedAt) < NATIVE_GRACE_MS) return;

    const dismissed = await AsyncStorage.getItem(DISMISSED_KEY_PREFIX + doc.version).catch(
      () => null,
    );
    if (dismissed) return;

    setOfferedVersion(doc.version);
  }, []);

  useEffect(() => {
    // Deferred a tick so no state write can land synchronously inside the
    // effect (react-hooks/set-state-in-effect); an update offer is in no
    // hurry anyway.
    const startup = setTimeout(() => void check(), 0);
    // Re-check on return-to-foreground, else a long-lived process that first
    // checked inside the 24h grace window would never offer at all (Codex P2
    // on the PR). Web listens to window focus; native to AppState "active".
    // Both funnel through check(), whose 6h throttle keeps this quiet.
    if (Platform.OS !== "web") {
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void check();
      });
      return () => {
        clearTimeout(startup);
        // Optional-chained: older RN versions and the jest preset answer
        // addEventListener with undefined.
        subscription?.remove?.();
      };
    }
    // React Native defines a `window` global without DOM event methods, so
    // feature-detect the listener itself rather than trusting the platform
    // check alone.
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return () => clearTimeout(startup);
    }
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(startup);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  const act = useCallback(() => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.location.reload();
      return;
    }
    const url = getNativeStoreUrl();
    if (url) void Linking.openURL(url).catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    const version = offeredVersion;
    setOfferedVersion(null);
    if (version) {
      void AsyncStorage.setItem(DISMISSED_KEY_PREFIX + version, "1").catch(() => {});
    }
  }, [offeredVersion]);

  return { available: offeredVersion !== null, version: offeredVersion, act, dismiss };
}

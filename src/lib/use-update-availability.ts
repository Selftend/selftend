import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { checkAndroidStoreUpdate } from "@/src/lib/android-store-update";
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
// - android: ask Google Play whether it is serving a newer build TO THIS
//   DEVICE, on the same schedule. `act` opens the Play listing.
// - ios: OFF - see the note on ANDROID above and getNativeStoreUrl below.
//
// Dismissal is per offered version (`updateBannerDismissed:<version>`), so the
// banner returns exactly once per release. The key is an exact match, not a
// comparison, which means it works unchanged for both a web semver ("0.9.0")
// and a Play versionCode ("18"): dismissing 9 stores `...:9`, and a later
// check for 18 looks up `...:18`, misses, and offers. AsyncStorage backs both
// platforms - on web it is localStorage underneath.

const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000;
const DISMISSED_KEY_PREFIX = "updateBannerDismissed:";

/**
 * Where each platform's answer to "is there an update?" comes from.
 *
 * Both native platforms used to be OFF, because `/version.json` — written by
 * the **web** deploy, carrying only `{ version, publishedAt }` — cannot answer
 * the question. A 24h grace window treated "the web deployed a day ago" as
 * "the store has this build", which was false on both, so the offer was
 * suppressed rather than shipped approximately-right (PR #532, caught in review
 * before it reached a user). Re-enabling was gated on real per-platform
 * availability, "a signal that does not exist yet".
 *
 * - **Android**: it does exist. Google Play Core reports whether the store is
 *   serving a newer build **to this device**, which is the actual question —
 *   immune to rollout percentage, country restrictions and device targeting,
 *   none of which a version document could ever encode. See
 *   `checkAndroidStoreUpdate`. No grace window is involved or needed.
 * - **iOS**: still off. There is no device-side equivalent; a build reaches the
 *   App Store only after a human promotes it and Apple reviews it, and nothing
 *   on the device can observe either. Guessing from a web timestamp would be
 *   the same wrong answer that was suppressed the first time.
 *
 * Web is unaffected and always was on: a web deploy IS immediately available to
 * every web user, so there the timestamp means what the code thinks it means.
 */
async function resolveOfferedVersion(): Promise<string | null> {
  if (Platform.OS === "android") {
    // Nowhere to send them is the same as nothing to offer.
    if (!getNativeStoreUrl()) return null;
    return checkAndroidStoreUpdate();
  }
  if (Platform.OS !== "web") return null;

  const running = getRunningVersion();
  if (!running) return null;
  const doc = await fetchVersionDocument();
  if (!doc) return null;
  if (!isNewerVersion(doc.version, running)) return null;
  return doc.version;
}

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

    const offered = await resolveOfferedVersion();
    if (!offered) return;

    const dismissed = await AsyncStorage.getItem(DISMISSED_KEY_PREFIX + offered).catch(() => null);
    if (dismissed) return;

    setOfferedVersion(offered);
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

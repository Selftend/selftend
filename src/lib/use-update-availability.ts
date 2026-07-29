import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";

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
// - native: the deployed document also gates on publishedAt being older than
//   the GRACE window - Play review and CDN propagation lag the web deploy, so
//   offering the instant version.json flips would 404 the store for a day.
//   `act` opens the Play listing; an unset URL means never available.
//
// Dismissal is per version (`updateBannerDismissed:<version>`), so the banner
// returns exactly once per release. AsyncStorage backs both platforms - on
// web it is localStorage underneath.

const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000;
const NATIVE_GRACE_MS = 24 * 60 * 60 * 1000;
const DISMISSED_KEY_PREFIX = "updateBannerDismissed:";

interface UpdateAvailability {
  available: boolean;
  version: string | null;
  act: () => void;
  dismiss: () => void;
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
    if (Platform.OS !== "web" && !appEnv.playStoreUrl.trim()) return;

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
    // The focus re-check is a browser-only nicety. React Native defines a
    // `window` global without DOM event methods, so feature-detect the
    // listener itself rather than trusting the platform check alone.
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    ) {
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
    const url = appEnv.playStoreUrl.trim();
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

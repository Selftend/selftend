import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";

import { checkAndroidStoreUpdate } from "@/src/lib/android-store-update";
import { appEnv } from "@/src/lib/env";
import {
  fetchVersionDocument,
  getRunningVersion,
  isNewerVersion,
} from "@/src/lib/update-availability";
import { useOverlayCountStore } from "@/src/stores/overlay-count-store";

// The update-availability hook (#1142 spec sections 1-2, which supersede
// #388 section 3's timing). Quiet by construction: it can only ever offer,
// never force - a null answer at any stage means the offer simply does not
// render. The hook mounts ONCE, in the protected shell (protected-layout);
// the offer surface is purely presentational off this hook's state.
//
// ☠️ The timing rule is PER-PLATFORM ON PURPOSE - do not "unify" it later:
//
// - web: check at shell mount and again on window `focus` AND on
//   `visibilitychange` (focus alone is unreliable on mobile web and installed
//   PWAs, which would make the offer desktop-only in practice). Launch-only
//   would kill the web offer outright: the HTML shell is `must-revalidate`
//   and the bundle content-hashed, so at page load the running version IS the
//   deployed version - only the foreground re-check can ever see a gap open.
// - android: launch-only, at shell mount, asking Google Play what it serves
//   TO THIS DEVICE. There is deliberately NO AppState "active" listener - a
//   mid-session re-check would surface a modal over whatever the user is
//   doing, and a merely presentation-gated listener is how a later cleanup
//   would quietly reintroduce exactly that.
// - ios: OFF - see resolveOfferedVersion and getNativeStoreUrl below.
//
// The 6h throttle is web-only-effective by construction: `lastCheckedAt` is a
// mount-scoped ref, so it never gates Android's single launch check. Document,
// don't delete - on web it is fetch hygiene plus a deliberate up-to-6h lag
// between deploy and offer; do not shorten it because the offer got louder.
//
// Arming-time suppression (#1152): a check bails while another overlay is up
// (the #1473 registry) or while offline - BEFORE stamping the throttle, or one
// suppressed launch would silence web for 6h. A suppressed offer is DROPPED,
// never latched: it returns on the next trigger (web focus/visibility, Android
// next cold start), never the instant the overlay closes, and suppression
// never writes a dismissal. Nothing new is persisted.
//
// Dismissal is per offered version (`updateBannerDismissed:<version>`), so the
// offer returns exactly once per release. The key is an exact match, not a
// comparison, which means it works unchanged for both a web semver ("0.9.0")
// and a Play versionCode ("18"): dismissing 9 stores `...:9`, and a later
// check for 18 looks up `...:18`, misses, and offers. AsyncStorage backs both
// platforms - on web it is localStorage underneath.

const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000;
// ☠️ "Banner" although the surface is a popup since #1475: this is an
// AsyncStorage key prefix, NOT an i18n key, and every stored dismissal lives
// under it — renaming it orphans them all and re-offers the current version
// to everyone who pressed "Later". It stays (Out of scope on #1142).
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

  // The one way a SUPPRESSED offer goes away, shared by every drop site: the
  // throttle stamp is rolled back with it, because "returns on the next
  // trigger" means the next focus/visibility event - not six hours of
  // silence behind a stamp the suppressed check left standing.
  const dropSuppressed = useCallback(() => {
    lastCheckedAt.current = 0;
    setOfferedVersion(null);
  }, []);

  const check = useCallback(async () => {
    // Arming-time suppression, BEFORE the throttle stamp (see the docblock):
    // a suppressed check must leave no trace, so the next trigger simply
    // tries again.
    if (useOverlayCountStore.getState().count > 0) return;
    if (!onlineManager.isOnline()) return;

    const now = Date.now();
    if (now - lastCheckedAt.current < CHECK_THROTTLE_MS) return;
    lastCheckedAt.current = now;

    const offered = await resolveOfferedVersion();
    if (!offered) return;

    const dismissed = await AsyncStorage.getItem(DISMISSED_KEY_PREFIX + offered).catch(() => null);
    if (dismissed) return;

    // The awaits above are exactly where the Android launch check and the
    // home tour mount their own modals - re-read the registry before arming
    // rather than offering over whatever appeared meanwhile.
    if (useOverlayCountStore.getState().count > 0) {
      dropSuppressed();
      return;
    }

    setOfferedVersion(offered);
  }, [dropSuppressed]);

  useEffect(() => {
    // Deferred a tick so no state write can land synchronously inside the
    // effect (react-hooks/set-state-in-effect); an update offer is in no
    // hurry anyway.
    const startup = setTimeout(() => void check(), 0);
    // Native is launch-only: no foreground listener AT ALL - see the
    // docblock before re-adding one.
    if (Platform.OS !== "web") {
      return () => clearTimeout(startup);
    }
    // Web re-checks on return-to-foreground, else a tab kept open across a
    // deploy would never offer. `focus` and `visibilitychange` both funnel
    // through check(), whose 6h throttle keeps the pair quiet. React Native
    // defines a `window` global without DOM event methods, so feature-detect
    // the listeners themselves rather than trusting the platform check alone.
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return () => clearTimeout(startup);
    }
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    const hasDocumentEvents =
      typeof document !== "undefined" && typeof document.addEventListener === "function";
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };
    if (hasDocumentEvents) document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(startup);
      window.removeEventListener("focus", onFocus);
      if (hasDocumentEvents) document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [check]);

  // Disarm backstop: an ARMED offer that observes another overlay drops back
  // to no-offer. The arming-time bail cannot cover overlays that mount just
  // after arming (the home tour measures for up to ~900ms before its modal
  // appears). The drop persists nothing - suppression is never dismissal -
  // and deliberately does NOT re-arm when the count returns to zero: a
  // suppressed offer waits for the next trigger.
  useEffect(() => {
    if (offeredVersion === null) return;
    const disarmIfCovered = (count: number) => {
      if (count > 0) dropSuppressed();
    };
    // The initial read is tick-deferred like the startup check, so no state
    // write lands synchronously inside the effect.
    const initial = setTimeout(() => disarmIfCovered(useOverlayCountStore.getState().count), 0);
    const unsubscribe = useOverlayCountStore.subscribe((state) => disarmIfCovered(state.count));
    return () => {
      clearTimeout(initial);
      unsubscribe();
    };
  }, [offeredVersion, dropSuppressed]);

  // C2's one write path: close the offer and persist the per-version
  // dismissal. Takes the version EXPLICITLY — ☠️ `act` below used to have an
  // empty dep array while `dismiss` depended on `offeredVersion`, and wiring
  // `act` to a stale `dismiss` would latch nothing, silently (#1151).
  const latch = useCallback((version: string) => {
    setOfferedVersion(null);
    void AsyncStorage.setItem(DISMISSED_KEY_PREFIX + version, "1").catch(() => {});
  }, []);

  const act = useCallback(() => {
    if (Platform.OS === "web") {
      // A straight reload, and deliberately NO dismissal write (#1151): the
      // reload IS the suppression — the shell is `must-revalidate` and the
      // bundle content-hashed, so the reloaded page runs the new version and
      // the offer has nothing left to say. Latching here would hide a
      // genuinely failed update behind a dismissed version.
      if (typeof window !== "undefined") window.location.reload();
      return;
    }
    // Android: latch BEFORE leaving for Play (#1151 — C2 applied to a soft
    // close its list missed). Installing replaces the process, but backing
    // out of Play does not: post-#1474 nothing else clears the offer, so an
    // unlatched `act` would resume straight into the identical modal. The
    // unifying line: the latch exists to stop the popup returning — on web
    // the reload already does that job, on Android nothing else does.
    if (offeredVersion) latch(offeredVersion);
    const url = getNativeStoreUrl();
    if (url) void Linking.openURL(url).catch(() => {});
  }, [offeredVersion, latch]);

  const dismiss = useCallback(() => {
    if (offeredVersion) {
      latch(offeredVersion);
      return;
    }
    setOfferedVersion(null);
  }, [offeredVersion, latch]);

  return { available: offeredVersion !== null, version: offeredVersion, act, dismiss };
}

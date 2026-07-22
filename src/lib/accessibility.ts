import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform, type Insets } from "react-native";

export const DEFAULT_INTERACTIVE_HIT_SLOP: Insets = {
  bottom: 8,
  left: 8,
  right: 8,
  top: 8,
};

export const COMPACT_CONTROL_HIT_SLOP: Insets = {
  bottom: 14,
  left: 14,
  right: 14,
  top: 14,
};

interface WebSpaceKeyEvent {
  key: string;
  repeat: boolean;
  preventDefault: () => void;
}

/**
 * Web-only Space-key activation for checkbox/radio/switch-role Pressables.
 * react-native-web only synthesizes click on Space for role="button", so
 * toggle roles respond to Enter but not Space (the standard toggle key).
 * Spread the result onto the Pressable; preventDefault stops Space from
 * scrolling the page. No-op on native.
 */
export function spaceKeyActivationProps(onPress: () => void) {
  if (Platform.OS !== "web") {
    return {};
  }

  return {
    onKeyDown: (event: WebSpaceKeyEvent) => {
      if (event.key !== " " && event.key !== "Spacebar") {
        return;
      }
      // OS key auto-repeat fires keydown ~20-30x/sec while Space is held;
      // toggling on every repeat would flicker the control's state.
      if (event.repeat) {
        return;
      }
      event.preventDefault();
      onPress();
    },
  };
}

/**
 * Toggle-button state for a Pressable: aria-pressed is the valid ARIA on web,
 * but React Native core has no pressed state, so native keeps the selected
 * announcement. Spread the result onto the Pressable.
 */
export function toggleButtonStateProps(pressed: boolean) {
  if (Platform.OS === "web") {
    return { "aria-pressed": pressed };
  }
  return { "aria-selected": pressed };
}

/**
 * "You are here" state for navigation/step controls: aria-current on web
 * (undefined when inactive, so the attribute is omitted entirely), and the
 * selected announcement on native, which has no aria-current equivalent.
 * Spread the result onto the Pressable.
 */
export function currentStateProps(active: boolean, kind: "page" | "step") {
  if (Platform.OS === "web") {
    return { "aria-current": active ? kind : undefined };
  }
  return { "aria-selected": active };
}

/**
 * Props for a visually-rendered message node (inline form error, status
 * line): on web the node doubles as a polite live region, so screen readers
 * hear the message when it appears. Native live regions are Android-only and
 * would double up with announceMessage(), so native relies on that instead.
 */
export function politeLiveRegionProps() {
  if (Platform.OS === "web") {
    return { "aria-live": "polite" as const };
  }
  return {};
}

/**
 * Fire-and-forget screen-reader announcement on native. No-op on web
 * (react-native-web does not implement announceForAccessibility) - render the
 * message inside a node with politeLiveRegionProps() there instead.
 */
export function announceMessage(message: string) {
  if (Platform.OS !== "web") {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeWebReduceMotion(onStoreChange: () => void) {
  const mediaQuery = globalThis.window?.matchMedia?.(REDUCE_MOTION_QUERY);
  if (!mediaQuery) {
    return () => {};
  }
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }
  mediaQuery.addListener(onStoreChange);
  return () => mediaQuery.removeListener(onStoreChange);
}

function getWebReduceMotionSnapshot() {
  return globalThis.window?.matchMedia?.(REDUCE_MOTION_QUERY)?.matches ?? false;
}

// The native probe is async, so the last known value is cached module-side for
// the synchronous snapshot; motion stays enabled (false) until it resolves.
let nativeReduceMotion = false;

function subscribeNativeReduceMotion(onStoreChange: () => void) {
  let active = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .then((isEnabled) => {
      if (active && nativeReduceMotion !== isEnabled) {
        nativeReduceMotion = isEnabled;
        onStoreChange();
      }
    })
    .catch(() => {
      // Probe can reject on some platforms; keep the motion-enabled default.
    });

  const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (isEnabled) => {
    nativeReduceMotion = isEnabled;
    onStoreChange();
  });

  return () => {
    active = false;
    subscription.remove();
  };
}

function getNativeReduceMotionSnapshot() {
  return nativeReduceMotion;
}

export function useReduceMotionEnabled() {
  return useSyncExternalStore(
    Platform.OS === "web" ? subscribeWebReduceMotion : subscribeNativeReduceMotion,
    Platform.OS === "web" ? getWebReduceMotionSnapshot : getNativeReduceMotionSnapshot,
    // Static/server rendering has no OS setting to read - default to motion.
    () => false,
  );
}

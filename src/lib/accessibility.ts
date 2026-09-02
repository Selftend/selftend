import { useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  Platform,
  type AccessibilityActionEvent,
  type Insets,
} from "react-native";

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
 * Web-only Enter-key activation for a `role="link"` Pressable that has no
 * `href`. react-native-web (0.21.2, `PressResponder.js:217`) treats a `link`
 * role as a native anchor and hands its Enter to the browser instead of calling
 * `onPress` - but a Pressable without `href` renders `<div role="link">`, which
 * the browser does nothing with, so the row is dead to the keyboard. Spread the
 * result onto the Pressable. Space is deliberately not handled: a link never
 * activates on Space. No-op on native.
 */
export function enterKeyActivationProps(onPress: () => void) {
  if (Platform.OS !== "web") {
    return {};
  }

  return {
    onKeyDown: (event: WebSpaceKeyEvent) => {
      if (event.key !== "Enter" || event.repeat) {
        return;
      }
      event.preventDefault();
      onPress();
    },
  };
}

interface WebArrowKeyEvent {
  key: string;
  preventDefault: () => void;
}

/**
 * Web-only Up/Down activation for a drag handle. `preventDefault` stops the arrows from
 * scrolling the page out from under the row being moved. No-op on native.
 *
 * Not called directly by screens - `reorderMoveProps` is the whole answer, and this is
 * only its keyboard half.
 */
function arrowKeyMoveProps(onMove: (offset: -1 | 1) => void) {
  if (Platform.OS !== "web") return {};

  return {
    onKeyDown: (event: WebArrowKeyEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onMove(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onMove(1);
      }
    },
  };
}

interface ReorderMoveOptions {
  /**
   * ☠️ STRUCTURAL only - "is there anywhere to move to" - and never "a write is in
   * flight". See the focus warning below.
   */
  canMove: boolean;
  /** Localized action labels a screen reader reads out, in the caller's own namespace. */
  earlierLabel: string;
  laterLabel: string;
  onMove: (offset: -1 | 1) => void;
}

/**
 * Every prop that turns a drag handle into a handle you can also work without dragging.
 *
 * Drag-alone reordering fails WCAG 2.2 SC 2.5.7 (Dragging Movements, AA), and every
 * reorderable surface answers it the same way: a named `accessibilityActions` pair for
 * screen readers, plus Up/Down keys for the keyboard. Both halves live here rather than
 * being copied per screen - `arrange-screen` (#956) and `manage-emotions-modal` (#965) are
 * the callers, and a copied `actionName` cascade is a cascade that can drift.
 *
 * Spread onto a `View`, not a `Pressable`: pressing a drag handle does nothing - the
 * gesture is the pointer path - and a button whose press does nothing would be a lie.
 * The caller keeps its own styling, `accessibilityLabel` and `testID`.
 *
 * Stated honestly wherever this is used: it closes the screen-reader and keyboard cases.
 * A pointer-only user with no keyboard still has drag alone, so it stays a PARTIAL answer
 * to SC 2.5.7.
 *
 * `canMove: false` withholds EVERY path - the action pair, the focus, the keys, and the
 * move itself (#1049). One question, one answer: a lone row must not be offered a move on
 * any of them, because an action a screen reader reads out and then declines to perform is
 * worse than no action - the user cannot tell it apart from a bug in their own gesture.
 * One path stays the caller's: withhold the `accessibilityHint` there too, since a hint is
 * read AFTER the label and a lone row has no outcome left to describe.
 *
 * ☠️ `canMove` must NOT fold in "a write is in flight". react-native-web reads `focusable`
 * as `tabIndex`, so flipping it while a write settles takes the focused handle out of the
 * tab order mid-move: the user's next Arrow press lands on the document and reordering by
 * keyboard works exactly ONCE per row. Keep `canMove` structural and reject the move
 * itself inside `onMove`, where a refused move costs a press rather than the focus ring.
 */
export function reorderMoveProps({
  canMove,
  earlierLabel,
  laterLabel,
  onMove,
}: ReorderMoveOptions) {
  return {
    accessibilityRole: "button" as const,
    focusable: canMove,
    // Withheld, not offered-and-refused: a lone row has nowhere to move to, and an empty
    // set is what keeps "Move X earlier" out of the rotor rather than in it doing nothing.
    accessibilityActions: canMove
      ? [
          { name: "moveEarlier", label: earlierLabel },
          { name: "moveLater", label: laterLabel },
        ]
      : [],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      // ⚠️ Not redundant with the empty set above. Whether a platform dispatches an action
      // it was not offered is the platform's business - the two differ in how long a
      // node's action set is cached across a re-render - and refusing costs a comparison.
      if (!canMove) return;
      if (event.nativeEvent.actionName === "moveEarlier") onMove(-1);
      if (event.nativeEvent.actionName === "moveLater") onMove(1);
    },
    ...(canMove ? arrowKeyMoveProps(onMove) : {}),
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

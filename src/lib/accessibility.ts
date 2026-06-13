import { useEffect, useState } from "react";
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

export function useReduceMotionEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === "web") {
      const mediaQuery = globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)");

      if (!mediaQuery) {
        return () => {
          mounted = false;
        };
      }

      const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
        if (mounted) {
          setEnabled(event.matches);
        }
      };

      setEnabled(mediaQuery.matches);
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }

      return () => {
        mounted = false;
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      };
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (mounted) {
          setEnabled(isEnabled);
        }
      })
      .catch(() => {
        // Probe can reject on some platforms; default to motion enabled.
        if (mounted) setEnabled(false);
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setEnabled);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}

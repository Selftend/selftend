import { Platform } from "react-native";

// The haptic counterpart to the session sounds (#1741): a tap for each meditation
// bell and each breath phase boundary, for a person who cannot hear the cue or
// sits with the bells at 0. Opt-in through `haptic_cues`, off by default; the
// screens check the preference and call these, so a caller never reaches here
// with the switch off. Supplement only, never required (#777's Motion decision).
//
// NATIVE ONLY, by construction rather than by luck: expo-haptics backs web with
// the Vibration API on the browsers that have it (Chrome on Android; not Safari,
// not desktop), which would be a fake on most of the web and a surprise on the
// rest. The lazy require behind the platform branch - the same shape as
// `loadExpoAudio` - is what keeps it out of the web bundle altogether.
type ExpoHapticsModule = typeof import("expo-haptics");

function loadExpoHaptics(): ExpoHapticsModule | null {
  if (Platform.OS === "web") return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- native-only path; lazy require keeps expo-haptics out of the web bundle
  return require("expo-haptics") as ExpoHapticsModule;
}

/** Best-effort: a haptic must never crash a session. */
function tap(pick: (haptics: ExpoHapticsModule) => Promise<void>): void {
  try {
    const haptics = loadExpoHaptics();
    if (!haptics) return;
    void pick(haptics).catch(() => {});
  } catch {
    // best-effort
  }
}

/**
 * A bell's tap: one heavy impact. Not `notificationAsync` - on Android that is
 * simulated as a multi-pulse pattern, which reads as an alert in the middle of
 * a sit. The two cues differ only in weight.
 */
export function bellHaptic(): void {
  tap((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy));
}

/** A breath phase boundary's tap: one light impact. */
export function phaseHaptic(): void {
  tap((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light));
}

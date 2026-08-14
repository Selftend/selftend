import { Platform } from "react-native";

import type { ReminderScheduleFailureReason } from "@/src/lib/notifications";

/**
 * The two failure reasons a native user can actually reach, and therefore the two that need a
 * wording per platform (#981).
 *
 * Every `saveErrors` string used to be browser-worded on every platform, so an iOS user who
 * declined the system dialog was told to check their *browser* settings. A single neutral
 * wording was rejected instead of split: the whole job of the notice is to send someone to the
 * right place, and "check your settings" names no place.
 *
 * The other five reasons are structurally web-only - `ensureReminderChannel` maps every native
 * failure onto exactly these two - so they keep one browser-worded string each.
 */
const PER_PLATFORM_REASONS = new Set<ReminderScheduleFailureReason>([
  "permission-denied",
  "unsupported",
]);

/** The `notifications` namespace key for a channel failure, worded for this platform. */
export function reminderChannelErrorKey(reason: ReminderScheduleFailureReason): string {
  if (PER_PLATFORM_REASONS.has(reason)) {
    return `saveErrors.${reason}.${Platform.OS === "web" ? "web" : "native"}`;
  }
  return `saveErrors.${reason}`;
}

import type { UserPreferences } from "@/src/features/modules/types";
import {
  getNotificationTarget,
  readEnabled,
  type NotificationTargetKey,
} from "@/src/features/notifications/registry";
import type { TimeOfDay } from "@/src/utils/time";

// The one-time contextual reminder prompt shows after a tool completion only
// while the user has never engaged with reminders for that tool in any way:
// no reminder enabled, never prompted before, consent not explicitly declined
// (declined = consent false with a recorded decision timestamp), and global
// notifications not switched off.
export function isReminderPromptEligible(
  preferences: UserPreferences,
  targetKey: NotificationTargetKey,
): boolean {
  const target = getNotificationTarget(targetKey);
  if (!preferences.notificationsEnabledGlobal) return false;
  if (readEnabled(preferences, target)) return false;
  if (preferences.reminderPromptedTools.includes(targetKey)) return false;
  const declinedConsent =
    !preferences.reminderConsent && preferences.reminderConsentUpdatedAt !== null;
  return !declinedConsent;
}

// Default the proposed reminder time to when the user actually completed the
// action, rounded to the nearest half hour (ties round up, midnight wraps).
export function roundToNearestHalfHour(date: Date): TimeOfDay {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const rounded = (Math.round(totalMinutes / 30) * 30) % (24 * 60);
  return { hour: Math.floor(rounded / 60), minute: rounded % 60 };
}

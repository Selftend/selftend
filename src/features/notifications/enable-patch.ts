import type { UserPreferences } from "@/src/features/modules/types";
import type { NotificationTarget } from "@/src/features/notifications/registry";
import { getReminderTimeZone } from "@/src/lib/notifications";
import type { TimeOfDay } from "@/src/utils/time";

/**
 * The consent half of enabling any reminder.
 *
 * `reminder_consent` is a **hard delivery gate**, not an audit field: `send-web-reminders`
 * skips a user whose consent is falsy, and the column defaults false. So every surface that
 * turns a reminder on has to carry it - including the paths that make no channel call at all
 * (#981). It lives here rather than in three copies because a surface that forgets it ships a
 * reminder that silently never arrives, which is the least visible failure this feature has.
 *
 * The timestamp is only stamped on a CHANGE. Consent-false-with-a-timestamp is how
 * `isReminderPromptEligible` recognises a decline, so re-stamping an existing yes would be
 * rewriting the date of a decision the user already made.
 */
export function reminderConsentPatch(preferences: UserPreferences): Partial<UserPreferences> {
  return {
    reminderConsent: true,
    reminderConsentUpdatedAt: preferences.reminderConsent
      ? preferences.reminderConsentUpdatedAt
      : new Date().toISOString(),
  };
}

/**
 * Everything a "turn this reminder on" write needs: the target's enabled column, a fresh
 * device timezone, and consent.
 *
 * `time` is passed only when the surface picked one (the contextual prompt proposes a time);
 * the reminders screen leaves the stored hour/minute alone, since its own picker owns them.
 */
export function enableTargetPatch(
  preferences: UserPreferences,
  target: NotificationTarget,
  time?: TimeOfDay,
): Partial<UserPreferences> {
  return {
    [target.enabledField]: true,
    [target.timezoneField]: getReminderTimeZone(),
    ...(time ? { [target.hourField]: time.hour, [target.minuteField]: time.minute } : {}),
    ...reminderConsentPatch(preferences),
  };
}

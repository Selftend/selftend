import type { UserPreferences } from "@/src/features/modules/types";
import type { NotificationTarget } from "@/src/features/notifications/registry";
import { getReminderTimeZone } from "@/src/lib/notifications";

/**
 * The consent half of enabling any reminder.
 *
 * `reminder_consent` is a **hard delivery gate**, not an audit field: `send-web-reminders`
 * skips a user whose consent is falsy, and the column defaults false. So every surface that
 * turns a reminder on has to carry it - including the paths that make no channel call at all
 * (#981). It lives here rather than in three copies because a surface that forgets it ships a
 * reminder that silently never arrives, which is the least visible failure this feature has.
 *
 * The timestamp is only stamped on a CHANGE: re-stamping an existing yes would rewrite the
 * date of a decision the user already made. Nothing in the app reads these two columns back
 * since #2342 removed the offer at the completion moment, whose eligibility predicate was
 * their one reader - they are a consent trail now, written on every enable and read by
 * nobody. That is deliberate (ADR-0008): retiring a consent trail is a privacy call in its
 * own right, not a loose end of removing the prompt.
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
 * The hour and minute are deliberately not here. This used to take an optional `time` for
 * the one surface that proposed one - the post-completion prompt, which offered the moment
 * you finished, rounded. That surface is gone (#2342), and the only caller left is the
 * reminders screen, which leaves the stored hour/minute alone because its own picker owns
 * them. A parameter no caller passes is a branch no test can reach, so it goes with the card.
 */
export function enableTargetPatch(
  preferences: UserPreferences,
  target: NotificationTarget,
): Partial<UserPreferences> {
  return {
    [target.enabledField]: true,
    [target.timezoneField]: getReminderTimeZone(),
    ...reminderConsentPatch(preferences),
  };
}

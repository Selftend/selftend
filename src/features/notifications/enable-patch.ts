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
 * date of a decision the user already made.
 *
 * ⚠️ The two columns are NOT the same kind of thing, and #2342 separated them further.
 * `reminderConsent` is read at delivery time and stays load-bearing - do not retire it.
 * `reminderConsentUpdatedAt` lost its only reader when the offer at the completion moment
 * went: consent-false-with-a-timestamp was how that offer's eligibility predicate
 * recognised a decline, and nothing else has ever read the date. It is kept as a consent
 * trail (ADR-0008) - retiring one is a privacy call in its own right, not a loose end of
 * removing a prompt - so the stamping rule above still has to hold even though no code
 * currently looks at what it writes.
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

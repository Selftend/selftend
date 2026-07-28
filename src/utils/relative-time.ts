import type { TFunction } from "i18next";

import { calendarDayDiff, currentDateKey, dayKeyDiff } from "@/src/utils/date";

/**
 * "Today" / "Yesterday" / "N days ago" labels, shared by every feature that lists
 * past entries (mood, sleep, journal, gratitude, habits).
 *
 * The strings live in the `common` namespace and are read with an explicit
 * `{ ns: "common" }`, so a caller can hand over the `t` it already holds for its own
 * feature namespace instead of every feature carrying a copy of the keys. i18next
 * lets an explicit `ns` option win over the namespace a fixed `t` was bound to.
 */
function relativeLabel(dayDiff: number, t: TFunction) {
  if (dayDiff <= 0) return t("relativeTime.today", { ns: "common" });
  if (dayDiff === 1) return t("relativeTime.yesterday", { ns: "common" });
  return t("relativeTime.daysAgo", { ns: "common", count: dayDiff });
}

/**
 * Recency of ACTIVITY — server-set instants (`updatedAt`) that carry no captured
 * offset, where "how recently did I touch this" is genuinely a question about
 * the viewer's frame. The name is deliberately not "time": an ENTRY is never
 * labelled with this. Entries carry a captured civil day; label them with
 * `formatRelativeDayKey`, or a day-key-grouped list files a card under
 * YESTERDAY whose own label reads "Today" (#433 §2). The captured-offset
 * features lint-ban this import; the exemptions name their variable and why.
 */
export function formatRelativeActivity(activeAt: string, t: TFunction, now: Date = new Date()) {
  return relativeLabel(calendarDayDiff(new Date(activeAt), now), t);
}

/**
 * The same relative label, computed in the CAPTURED day frame.
 *
 * `formatRelativeActivity` derives its day from the raw instant in the viewer's
 * current timezone. Any surface that GROUPS by `dayKey` must label by it too, or
 * the two disagree after travel: a Tokyo entry captured just after midnight sits
 * under London's "Today" heading while its own row reads "Yesterday" (#250).
 */
export function formatRelativeDayKey(
  dayKey: string,
  t: TFunction,
  todayKey: string = currentDateKey(),
) {
  return relativeLabel(dayKeyDiff(dayKey, todayKey), t);
}

import type { TFunction } from "i18next";

import { calendarDayDiff, currentDateKey, dayKeyDiff } from "@/src/utils/date";

export function formatMoodRelativeTime(loggedAt: string, t: TFunction, now: Date = new Date()) {
  const dayDiff = calendarDayDiff(new Date(loggedAt), now);

  if (dayDiff <= 0) return t("relativeTime.today");
  if (dayDiff === 1) return t("relativeTime.yesterday");
  return t("relativeTime.daysAgo", { count: dayDiff });
}

/**
 * The same relative label, computed in the CAPTURED day frame.
 *
 * `formatMoodRelativeTime` derives its day from the raw instant in the viewer's
 * current timezone. Any surface that GROUPS by `dayKey` must label by it too, or
 * the two disagree after travel: a Tokyo entry captured just after midnight sits
 * under London's "Today" heading while its own row reads "Yesterday" (#250).
 */
export function formatRelativeDayKey(
  dayKey: string,
  t: TFunction,
  todayKey: string = currentDateKey(),
) {
  const dayDiff = dayKeyDiff(dayKey, todayKey);

  if (dayDiff <= 0) return t("relativeTime.today");
  if (dayDiff === 1) return t("relativeTime.yesterday");
  return t("relativeTime.daysAgo", { count: dayDiff });
}

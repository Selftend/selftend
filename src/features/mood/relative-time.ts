import type { TFunction } from "i18next";

import { calendarDayDiff } from "@/src/utils/date";

export function formatMoodRelativeTime(loggedAt: string, t: TFunction, now: Date = new Date()) {
  const dayDiff = calendarDayDiff(new Date(loggedAt), now);

  if (dayDiff <= 0) return t("relativeTime.today");
  if (dayDiff === 1) return t("relativeTime.yesterday");
  return t("relativeTime.daysAgo", { count: dayDiff });
}

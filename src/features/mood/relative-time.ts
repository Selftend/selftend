import type { TFunction } from "i18next";

export function formatMoodRelativeTime(loggedAt: string, t: TFunction, now: Date = new Date()) {
  const logged = new Date(loggedAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfLogged = new Date(
    logged.getFullYear(),
    logged.getMonth(),
    logged.getDate(),
  ).getTime();

  const dayDiff = Math.round((startOfToday - startOfLogged) / (24 * 60 * 60 * 1000));

  if (dayDiff <= 0) return t("relativeTime.today");
  if (dayDiff === 1) return t("relativeTime.yesterday");
  return t("relativeTime.daysAgo", { count: dayDiff });
}

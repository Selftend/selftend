import type { TFunction } from "i18next";

import type { HabitLog } from "@/src/features/habits/types";
import { formatRelativeDayKey } from "@/src/utils/relative-time";
import { parseLocalNoon } from "@/src/utils/date";

export interface HabitHistorySection {
  /** The `YYYY-MM-DD` the rows share. Also the SectionList key. */
  key: string;
  data: HabitLog[];
}

/**
 * Day groups for the habits history screen (#762, decided on #714/#696).
 *
 * Days, not the month buckets check-in uses. `logged_on` is a `date` with one
 * row per habit per day, so a day already holds at most a handful of rows -
 * exactly the size a section should be - and the ticks a user is looking for
 * are "what did I do on the 14th", not "what happened in July".
 *
 * Assumes newest-first input, which is what `listHabitLogs` returns, and
 * re-sorts the keys anyway so a page arriving out of order cannot interleave
 * days.
 */
export function groupLogsByDay(logs: HabitLog[] | undefined): HabitHistorySection[] {
  const days = new Map<string, HabitLog[]>();
  for (const log of logs ?? []) {
    const existing = days.get(log.loggedOn);
    if (existing) existing.push(log);
    else days.set(log.loggedOn, [log]);
  }
  // `YYYY-MM-DD` sorts lexicographically, so newest-first is a plain reverse.
  return [...days.keys()]
    .sort()
    .reverse()
    .map((key) => ({ key, data: days.get(key)! }));
}

/**
 * The section heading for a day.
 *
 * The screen used to render `section.key` straight through a passthrough
 * `{{date}}` string, so every heading read `2026-08-08` in both locales - an
 * untranslated machine key on screen (#726).
 *
 * Today and Yesterday keep their words, because those are the two a user reads
 * as positions rather than dates. Everything older gets a real formatted date:
 * "14 days ago" is a fine row label and a poor landmark in a long scroll, where
 * the question is which day you are looking at.
 */
export function formatHabitHistoryDay(dayKey: string, t: TFunction, language: string): string {
  const relative = formatRelativeDayKey(dayKey, t);
  const today = t("relativeTime.today", { ns: "common" });
  const yesterday = t("relativeTime.yesterday", { ns: "common" });
  if (relative === today || relative === yesterday) return relative;

  return new Intl.DateTimeFormat(language || undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseLocalNoon(dayKey));
}

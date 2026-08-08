import type { MoodLog } from "@/src/features/mood/types";
import {
  addDaysToKey,
  dayKeyDiff,
  dayRangeEndKey,
  formatInstantAtOffset,
  mondayKeyOf,
  parseLocalNoon,
} from "@/src/utils/date";

/**
 * Sectioning for the all-history screen (#696).
 *
 * The overview's `groupLogsByDate` stops at a single `older` bucket, which was
 * fine there because nothing old was shown. Here it would hold every entry from
 * day 8 to forever — and this screen is the ONLY route to an old entry, because
 * the mood map deliberately never navigates (`mood-heatmap.tsx:22-25`). So the
 * tail is split into calendar months, which is what gives a long scroll any
 * landmarks at all.
 *
 * There are no per-group averages here, deliberately: under paging an average
 * covers only the rows that happen to be loaded, which is exactly the defect
 * filed as #705. Averages stay on the overview, where the window is complete.
 */
export type HistorySectionKind = "today" | "yesterday" | "thisWeek" | "lastWeek" | "month";

export interface HistorySection {
  /** SectionList key: the kind, or `month:YYYY-MM` — months repeat across years. */
  key: string;
  kind: HistorySectionKind;
  /** `YYYY-MM` on month sections only; the label is formatted by the renderer. */
  monthKey?: string;
  data: MoodLog[];
}

const FIXED_ORDER: Exclude<HistorySectionKind, "month">[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
];

function pushInto<K>(map: Map<K, MoodLog[]>, key: K, log: MoodLog) {
  const existing = map.get(key);
  if (existing) existing.push(log);
  else map.set(key, [log]);
}

/**
 * Groups logs (assumed newest-first) into Today → Yesterday → Earlier this week
 * → Last week → one section per calendar month.
 *
 * "This week" and "last week" are **calendar** weeks, Monday-start, matching the
 * heatmap's columns (#697) — a trailing-7 window would put the same entry in a
 * different week on the two surfaces. Today and Yesterday are claimed first, so
 * on a Monday "yesterday" reads as Yesterday rather than being swallowed by Last
 * week, and a month section only ever holds the days the week sections left.
 */
export function groupHistorySections(
  logs: MoodLog[] | undefined,
  now: Date = new Date(),
): HistorySection[] {
  const list = logs ?? [];
  // Today, or a later day the user already holds an entry on: flying east-to-west
  // leaves you holding a "tomorrow" entry, and clamping at today would file it
  // under a month heading instead of Today (#250).
  const todayKey = dayRangeEndKey(
    list.map((log) => log.dayKey),
    now,
  );
  const weekStartKey = mondayKeyOf(todayKey);
  const lastWeekStartKey = addDaysToKey(weekStartKey, -7);

  const fixed = new Map<HistorySectionKind, MoodLog[]>();
  const months = new Map<string, MoodLog[]>();

  for (const log of list) {
    const dayDiff = dayKeyDiff(log.dayKey, todayKey);
    if (dayDiff <= 0) pushInto(fixed, "today", log);
    else if (dayDiff === 1) pushInto(fixed, "yesterday", log);
    else if (log.dayKey >= weekStartKey) pushInto(fixed, "thisWeek", log);
    else if (log.dayKey >= lastWeekStartKey) pushInto(fixed, "lastWeek", log);
    else pushInto(months, log.dayKey.slice(0, 7), log);
  }

  const sections: HistorySection[] = [];
  for (const kind of FIXED_ORDER) {
    const data = fixed.get(kind);
    if (data && data.length > 0) sections.push({ key: kind, kind, data });
  }
  // `YYYY-MM` sorts lexicographically, so newest-first is a plain reverse sort.
  // Rebuilt from the map rather than trusted from insertion order, so a page
  // arriving out of order can't interleave months.
  for (const monthKey of [...months.keys()].sort().reverse()) {
    sections.push({
      key: `month:${monthKey}`,
      kind: "month",
      monthKey,
      data: months.get(monthKey)!,
    });
  }
  return sections;
}

/**
 * The `when` column, formatted so it disambiguates rows WITHIN its own section.
 *
 * A day label can't do that job in a list already grouped by day: every row
 * under Today would read "Today", and a twice-daily user would get two identical
 * labels. So the shape follows the section:
 *
 * - single-day sections (Today, Yesterday) — the time, `4:50 pm`
 * - multi-day sections (Earlier this week, Last week) — `Wed 7:40 pm`
 * - month sections — the date, `Jul 27`
 *
 * Read in the entry's captured offset, like every other entry timestamp, so it
 * agrees with the civil day the row is filed under (#250).
 */
const WHEN_OPTIONS: Record<HistorySectionKind, Intl.DateTimeFormatOptions> = {
  today: { hour: "numeric", minute: "2-digit" },
  yesterday: { hour: "numeric", minute: "2-digit" },
  thisWeek: { weekday: "short", hour: "numeric", minute: "2-digit" },
  lastWeek: { weekday: "short", hour: "numeric", minute: "2-digit" },
  month: { day: "numeric", month: "short" },
};

export function formatHistoryWhen(log: MoodLog, kind: HistorySectionKind, lang?: string): string {
  return formatInstantAtOffset(log.loggedAt, log.loggedOffsetMinutes, WHEN_OPTIONS[kind], lang);
}

/** `2026-07` → "July 2026". The year is always shown; a bare month is ambiguous in a multi-year scroll. */
export function formatHistoryMonth(monthKey: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(
    parseLocalNoon(`${monthKey}-01`),
  );
}

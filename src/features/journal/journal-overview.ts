import type { JournalEntry, JournalWritingDay } from "@/src/features/journal/types";
import {
  addDaysToKey,
  dayKeyDiff,
  dayRangeEndKey,
  formatInstantAtOffset,
  mondayKeyOf,
  parseLocalNoon,
} from "@/src/utils/date";

export const JOURNAL_WRITING_DAYS = 14;
export const JOURNAL_RECENT_ENTRIES = 5;

export type JournalRecentSectionKind = "today" | "yesterday" | "thisWeek" | "lastWeek" | "month";

export interface JournalRecentSection {
  key: string;
  kind: JournalRecentSectionKind;
  monthKey?: string;
  data: JournalEntry[];
}

const FIXED_ORDER: Exclude<JournalRecentSectionKind, "month">[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
];

function pushInto<K>(map: Map<K, JournalEntry[]>, key: K, entry: JournalEntry) {
  const existing = map.get(key);
  if (existing) existing.push(entry);
  else map.set(key, [entry]);
}

/** Five newest entries grouped by their captured civil days. */
export function groupRecentJournalEntries(
  entries: readonly JournalEntry[] | undefined,
  now: Date = new Date(),
): JournalRecentSection[] {
  const recent = (entries ?? []).slice(0, JOURNAL_RECENT_ENTRIES);
  const todayKey = dayRangeEndKey(
    recent.map((entry) => entry.dayKey),
    now,
  );
  const weekStartKey = mondayKeyOf(todayKey);
  const lastWeekStartKey = addDaysToKey(weekStartKey, -7);
  const fixed = new Map<JournalRecentSectionKind, JournalEntry[]>();
  const months = new Map<string, JournalEntry[]>();

  for (const entry of recent) {
    const dayDiff = dayKeyDiff(entry.dayKey, todayKey);
    if (dayDiff <= 0) pushInto(fixed, "today", entry);
    else if (dayDiff === 1) pushInto(fixed, "yesterday", entry);
    else if (entry.dayKey >= weekStartKey) pushInto(fixed, "thisWeek", entry);
    else if (entry.dayKey >= lastWeekStartKey) pushInto(fixed, "lastWeek", entry);
    else pushInto(months, entry.dayKey.slice(0, 7), entry);
  }

  const sections: JournalRecentSection[] = [];
  for (const kind of FIXED_ORDER) {
    const data = fixed.get(kind);
    if (data) sections.push({ key: kind, kind, data });
  }
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

const WHEN_OPTIONS: Record<JournalRecentSectionKind, Intl.DateTimeFormatOptions> = {
  today: { hour: "numeric", minute: "2-digit" },
  yesterday: { hour: "numeric", minute: "2-digit" },
  thisWeek: { weekday: "short", hour: "numeric", minute: "2-digit" },
  lastWeek: { weekday: "short", hour: "numeric", minute: "2-digit" },
  month: { day: "numeric", month: "short" },
};

export function formatJournalRecentWhen(
  entry: JournalEntry,
  kind: JournalRecentSectionKind,
  lang: string,
): string {
  return formatInstantAtOffset(
    entry.occurredAt ?? entry.createdAt,
    entry.occurredOffsetMinutes,
    WHEN_OPTIONS[kind],
    lang,
  );
}

export function formatJournalMonth(monthKey: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(
    parseLocalNoon(`${monthKey}-01`),
  );
}

export function formatJournalWritingRange(
  days: readonly JournalWritingDay[],
  lang: string,
): string {
  if (days.length === 0) return "";
  const formatter = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  return `${formatter.format(parseLocalNoon(days[0]!.dayKey))} – ${formatter.format(
    parseLocalNoon(days[days.length - 1]!.dayKey),
  )}`;
}

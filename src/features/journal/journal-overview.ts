import type {
  JournalEntry,
  JournalWritingBucket,
  JournalWritingBucketUnit,
} from "@/src/features/journal/types";
import {
  addDaysToKey,
  dayKeyDiff,
  dayRangeEndKey,
  formatInstantAtOffset,
  mondayKeyOf,
  parseLocalNoon,
} from "@/src/utils/date";

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
function groupJournalEntries(
  entries: readonly JournalEntry[],
  now: Date = new Date(),
): JournalRecentSection[] {
  const todayKey = dayRangeEndKey(
    entries.map((entry) => entry.dayKey),
    now,
  );
  const weekStartKey = mondayKeyOf(todayKey);
  const lastWeekStartKey = addDaysToKey(weekStartKey, -7);
  const fixed = new Map<JournalRecentSectionKind, JournalEntry[]>();
  const months = new Map<string, JournalEntry[]>();

  for (const entry of entries) {
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

export function groupRecentJournalEntries(
  entries: readonly JournalEntry[] | undefined,
  now: Date = new Date(),
): JournalRecentSection[] {
  return groupJournalEntries((entries ?? []).slice(0, JOURNAL_RECENT_ENTRIES), now);
}

export function groupJournalHistoryEntries(
  entries: readonly JournalEntry[] | undefined,
  now: Date = new Date(),
): JournalRecentSection[] {
  return groupJournalEntries(entries ?? [], now);
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
  buckets: readonly JournalWritingBucket[],
  lang: string,
): string {
  if (buckets.length === 0) return "";
  const formatter = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  return `${formatter.format(parseLocalNoon(buckets[0]!.rangeStartDayKey))} – ${formatter.format(
    parseLocalNoon(buckets[0]!.rangeEndDayKey),
  )}`;
}

export function formatJournalWritingBucket(bucket: JournalWritingBucket, lang: string): string {
  if (bucket.unit === "year") return bucket.startDayKey.slice(0, 4);
  if (bucket.unit === "month") {
    return new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" }).format(
      parseLocalNoon(bucket.startDayKey),
    );
  }
  const formatter = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  const start = formatter.format(parseLocalNoon(bucket.startDayKey));
  if (bucket.unit === "day" || bucket.startDayKey === bucket.endDayKey) return start;
  return `${start} – ${formatter.format(parseLocalNoon(bucket.endDayKey))}`;
}

export function journalWritingBarLabel(
  bucket: JournalWritingBucket,
  _index: number,
  count: number,
  lang: string,
): string | undefined {
  if (bucket.unit === "day" && count <= 7) {
    return new Intl.DateTimeFormat(lang, { day: "numeric" }).format(
      parseLocalNoon(bucket.startDayKey),
    );
  }
  // Dense ranges already state their exact bounds beside the section heading.
  // A label inside a 30-column chart gets only ~9dp at phone width and wraps
  // into unreadable month/day fragments, so those columns stay unlabelled.
  return undefined;
}

export function journalWritingUnit(
  buckets: readonly JournalWritingBucket[],
): JournalWritingBucketUnit {
  return buckets[0]?.unit ?? "day";
}

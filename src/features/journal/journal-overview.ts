import type {
  JournalEntry,
  JournalWritingBucket,
  JournalWritingBucketUnit,
  JournalWritingRange,
} from "@/src/features/journal/types";
import {
  addDaysToKey,
  dayKeyDiff,
  dayRangeEndKey,
  formatInstantAtOffset,
  lastNDayKeys,
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

/**
 * How many monthly columns the All-time reservation stands in for.
 *
 * A year, because it has to be something: the RPC's All-time range runs from the
 * first entry to today, and how far back that reaches is the one thing about the
 * chart's shape the client cannot know before the read returns. It is also the one
 * thing that does not change the height being reserved - past seven buckets no
 * column carries a label (see {@link journalWritingBarLabel}), so every column is
 * the bar area and nothing else, and twelve of them are exactly as tall as ninety.
 *
 * ☠️ That makes this a guess about WIDTH, which ADR-0009 permits, rather than the
 * guessed height its edge 5 rejects - and the difference rests on a rule in another
 * function. `journal-overview.test.ts` pins it there, not here.
 */
const ALL_TIME_RESERVATION_BUCKETS = 12;

/** The `YYYY-MM-01` key of the month `monthIndex` names; JS normalizes an over- or underflowing index. */
function monthStartKey(year: number, monthIndex: number): string {
  const month = new Date(year, monthIndex, 1, 12);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * The shape the writing chart will take for `range`, derived before the read that
 * fills it returns - the measuring stick `JournalWritingChartReservation` holds the
 * section's space with (ADR-0009, edge 4).
 *
 * Every bucket carries a word count of zero, and that is not a claim about anything:
 * the stick renders at `opacity-0` and is there for its size alone. **Height is what
 * this function is for.** A bar's value cannot change it - the bar area is a fixed
 * `barAreaHeight` box whatever the value inside it - so the two things that can are
 * the unit, which picks the caption line below the bars, and the count, which is what
 * decides whether the columns carry labels at all.
 *
 * ☠️ **It mirrors `journal_writing_buckets`'s own bucketing** (the RPC in
 * `20260810000001_journal_writing_buckets.sql`): 7 and 30 are daily, 90 is thirteen
 * seven-day buckets, and All time is calendar months. That is a duplicated rule, kept
 * deliberately rather than derived - the alternative is a round trip, which is the
 * very thing being waited on. It is bounded by what it is for: the SQL could change
 * the count of a range's buckets without this noticing, and past seven buckets the
 * count does not reach the height. A change of *unit* would, so the units are what
 * `journal-overview.test.ts` pins against the migration.
 *
 * ⚠️ The window ends today. The RPC ends it at the later of today and the newest
 * captured day, so a future-dated entry stretches it - unknowable here, and again
 * not a height.
 */
export function journalWritingReservationBuckets(
  range: JournalWritingRange,
  now: Date = new Date(),
): JournalWritingBucket[] {
  // `lastNDayKeys` rather than a local day key of our own: the window is a "last N
  // days" strip like the routines one, which is exactly what that helper is for, and
  // reaching for the day key directly is what the import rule above rejects.
  const endDayKey = lastNDayKeys(1, now)[0]!;

  if (range === 7 || range === 30) {
    const dayKeys = lastNDayKeys(range, now);
    const frame = reservationFrame("day", dayKeys[0]!, endDayKey);
    return dayKeys.map((dayKey) => ({ startDayKey: dayKey, endDayKey: dayKey, ...frame }));
  }

  if (range === 90) {
    const startDayKey = addDaysToKey(endDayKey, -89);
    const frame = reservationFrame("week", startDayKey, endDayKey);
    // Thirteen, the same arithmetic the RPC's generate_series does: one bucket per
    // seven days from the start, the last clipped to the end of the window.
    const count = Math.floor(dayKeyDiff(startDayKey, endDayKey) / 7) + 1;
    return Array.from({ length: count }, (_, index) => {
      const bucketStart = addDaysToKey(startDayKey, index * 7);
      return {
        startDayKey: bucketStart,
        endDayKey: clipToWindow(addDaysToKey(bucketStart, 6), endDayKey),
        ...frame,
      };
    });
  }

  const end = parseLocalNoon(endDayKey);
  const firstMonth = end.getMonth() - (ALL_TIME_RESERVATION_BUCKETS - 1);
  const frame = reservationFrame("month", monthStartKey(end.getFullYear(), firstMonth), endDayKey);
  return Array.from({ length: ALL_TIME_RESERVATION_BUCKETS }, (_, index) => ({
    startDayKey: monthStartKey(end.getFullYear(), firstMonth + index),
    endDayKey: clipToWindow(
      addDaysToKey(monthStartKey(end.getFullYear(), firstMonth + index + 1), -1),
      endDayKey,
    ),
    ...frame,
  }));
}

/**
 * Everything every bucket in one reservation shares, built once per range and spread into
 * each. The four day keys of a bucket are all `string`, and named arguments are what stops
 * a bucket's own bounds and the window's being transposed into each other silently.
 */
function reservationFrame(
  unit: JournalWritingBucketUnit,
  rangeStartDayKey: string,
  rangeEndDayKey: string,
): Pick<JournalWritingBucket, "wordCount" | "unit" | "rangeStartDayKey" | "rangeEndDayKey"> {
  return { wordCount: 0, unit, rangeStartDayKey, rangeEndDayKey };
}

/** A bucket may run past the end of the window; the RPC clips it rather than covering days the range does not. */
function clipToWindow(bucketEndDayKey: string, endDayKey: string): string {
  return bucketEndDayKey > endDayKey ? endDayKey : bucketEndDayKey;
}
